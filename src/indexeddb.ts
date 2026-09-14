import {
  decodeProfiles,
  ProfileStorageError,
  type ProfileStorage,
} from "./persistence";
import type { Profile } from "./types";

type Envelope = {
  id: string;
  revision: number;
  data: Profile;
  previous?: Profile;
};
type Receipt = { id: string; payload: string; envelopes: Envelope[] };
const request = <T>(value: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
const completed = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(
        tx.error ?? new ProfileStorageError("Profile transaction aborted."),
      );
    tx.onerror = () => {};
  });

/** Profile-keyed envelopes, backups and receipts commit in one IndexedDB transaction. */
export class IndexedProfileRepository {
  private database?: IDBDatabase;
  private observed = new Map<string, Envelope>();
  constructor(
    private readonly factory: IDBFactory,
    private readonly name: string,
    private readonly legacy?: ProfileStorage,
  ) {}
  private async open(): Promise<IDBDatabase> {
    if (this.database) return this.database;
    const opening = this.factory.open(this.name, 1);
    opening.onupgradeneeded = () => {
      opening.result.createObjectStore("profiles", { keyPath: "id" });
      opening.result.createObjectStore("receipts", { keyPath: "id" });
      opening.result.createObjectStore("metadata");
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      let blocked = false;
      opening.onblocked = () => {
        blocked = true;
        reject(
          new ProfileStorageError("Close other game tabs, then retry loading."),
        );
      };
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        if (blocked) opening.result.close();
        else resolve(opening.result);
      };
    });
    database.onversionchange = () => {
      database.close();
      this.database = undefined;
    };
    this.database = database;
    return database;
  }
  async load(): Promise<Profile[]> {
    const database = await this.open();
    const tx = database.transaction(["profiles", "metadata"], "readonly");
    const done = completed(tx);
    const allRequest = tx.objectStore("profiles").getAll();
    const migratedRequest = tx.objectStore("metadata").get("migrated");
    const [envelopes, migrated] = await Promise.all([
      request<Envelope[]>(allRequest),
      request(migratedRequest),
    ]);
    await done;
    for (const envelope of envelopes) {
      if (
        envelope.id !== envelope.data?.id ||
        !Number.isSafeInteger(envelope.revision) ||
        envelope.revision < 1
      )
        throw new ProfileStorageError("Invalid profile storage envelope.");
    }
    const profiles = decodeProfiles(
      JSON.stringify(envelopes.map((e) => e.data)),
    );
    this.observed = new Map(envelopes.map((e) => [e.id, e]));
    if (!migrated && this.legacy) {
      const raw = this.legacy.getItem(this.name);
      if (raw !== null && envelopes.length === 0) {
        const legacy = decodeProfiles(raw);
        await this.commit(legacy, "legacy-import");
        return legacy;
      }
    }
    return profiles;
  }
  async commit(profiles: Profile[], commandId: string): Promise<void> {
    const candidate = decodeProfiles(JSON.stringify(profiles));
    const payload = JSON.stringify(candidate);
    const observedAtAcceptance = new Map(this.observed);
    const database = await this.open();
    const tx = database.transaction(
      ["profiles", "receipts", "metadata"],
      "readwrite",
    );
    const done = completed(tx);
    // Always consume abort rejection even if a validation error exits the transaction body.
    void done.catch(() => {});
    try {
      const receipts = tx.objectStore("receipts");
      const previous = await request<Receipt | undefined>(
        receipts.get(commandId),
      );
      if (previous) {
        if (previous.payload !== payload)
          throw new ProfileStorageError(
            "Command ID was reused for different changes.",
          );
        await done;
        for (const e of previous.envelopes) this.observed.set(e.id, e);
        return;
      }
      const store = tx.objectStore("profiles");
      const changed = candidate.filter(
        (p) =>
          JSON.stringify(observedAtAcceptance.get(p.id)?.data) !==
          JSON.stringify(p),
      );
      const envelopes: Envelope[] = [];
      for (const profile of changed) {
        const current = await request<Envelope | undefined>(
          store.get(profile.id),
        );
        const expected = observedAtAcceptance.get(profile.id)?.revision ?? 0;
        if ((current?.revision ?? 0) !== expected)
          throw new ProfileStorageError(
            "This profile changed in another tab. Reload before continuing.",
          );
        const envelope: Envelope = {
          id: profile.id,
          revision: expected + 1,
          data: profile,
          previous: profile,
        };
        store.put(envelope);
        envelopes.push(envelope);
      }
      receipts.put({ id: commandId, payload, envelopes } satisfies Receipt);
      tx.objectStore("metadata").put(true, "migrated");
      await done;
      for (const e of envelopes) this.observed.set(e.id, e);
    } catch (cause) {
      try {
        tx.abort();
      } catch {
        /* A completed/aborted transaction cannot be aborted twice. */
      }
      throw new ProfileStorageError(
        "Could not save profiles. Progress is paused; retry or reload before continuing.",
        { cause },
      );
    }
  }
  async exportStored(): Promise<string> {
    const database = await this.open();
    const tx = database.transaction("profiles", "readonly");
    const done = completed(tx);
    const envelopes = await request<Envelope[]>(
      tx.objectStore("profiles").getAll(),
    );
    await done;
    if (envelopes.length === 0 && this.legacy)
      return this.legacy.getItem(this.name) ?? "[]";
    return JSON.stringify(envelopes);
  }
  async recoverBackup(historyOnly = false): Promise<Profile[]> {
    const database = await this.open();
    const tx = database.transaction("profiles", "readonly");
    const done = completed(tx);
    const envelopes = await request<Envelope[]>(
      tx.objectStore("profiles").getAll(),
    );
    await done;
    this.observed = new Map(envelopes.map((e) => [e.id, e]));
    let restored: Profile[];
    if (envelopes.length === 0) {
      const raw = this.legacy?.getItem(`${this.name}-backup`);
      if (!raw) throw new ProfileStorageError("No valid backup is available.");
      restored = decodeProfiles(raw);
    } else {
      restored = envelopes.map((e) => {
        if (!Number.isSafeInteger(e.revision) || e.revision < 1)
          throw new ProfileStorageError(
            "Invalid profile revision; export the stored data for recovery.",
          );
        const validated = (value: unknown): Profile => {
          const profile = decodeProfiles(JSON.stringify([value]))[0];
          if (profile.id !== e.id)
            throw new ProfileStorageError(
              "Profile identity does not match its storage record.",
            );
          return profile;
        };
        try {
          return validated(e.data);
        } catch {
          try {
            return validated(e.previous);
          } catch (error) {
            if (!historyOnly) throw error;
            const withoutRun = (value: unknown): Profile => {
              if (!value || typeof value !== "object") throw error;
              const { activeRun: _run, ...history } = value as Profile;
              return validated(history);
            };
            try {
              return withoutRun(e.data);
            } catch {
              return withoutRun(e.previous);
            }
          }
        }
      });
    }
    await this.commit(restored, crypto.randomUUID());
    return restored;
  }
  close(): void {
    this.database?.close();
    this.database = undefined;
  }
}
