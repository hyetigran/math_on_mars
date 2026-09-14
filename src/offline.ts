import { BUILD_VERSION } from "./build-version";

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () =>
        reject(
          new Error(
            "Offline installation did not finish. Check your connection and retry.",
          ),
        ),
      ms,
    );
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

/** Readiness is derived from verified cached bytes, never from a remembered UI flag. */
export async function requireOfflinePack(
  version = BUILD_VERSION,
): Promise<void> {
  if (import.meta.env.DEV) return;
  if (!navigator.serviceWorker || !isSecureContext)
    throw new Error(
      "Offline play needs HTTPS and service-worker support in this browser.",
    );
  const registration = await timeout(
    navigator.serviceWorker.register(new URL("sw.js", document.baseURI), {
      updateViaCache: "none",
    }),
    30000,
  );
  const active =
    registration.active ??
    (await timeout(navigator.serviceWorker.ready, 30000)).active;
  if (!active)
    throw new Error(
      "The offline pack is not installed yet. Retry after downloading finishes.",
    );
  const ready = await new Promise<boolean>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Offline verification timed out. Please retry."));
    }, 30000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.ready === true);
    };
    active.postMessage({ type: "ENSURE_PACK", version }, [channel.port2]);
  });
  if (!ready) {
    void registration.update().catch(() => {});
    throw new Error(
      version === BUILD_VERSION
        ? "Required offline files are missing or still downloading. Connect and retry before starting."
        : "This mission's original content is unavailable. Your profile and history are safe; export them or return to a browser where its pack is installed.",
    );
  }
}

export function releaseLocation(version: string): string {
  const url = new URL(location.href);
  url.searchParams.set("build", version);
  return url.href;
}
