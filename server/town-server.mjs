import { visitTown } from "./town-visits.mjs";
import { practiceSummary, practiceTopics } from "./town-practice.mjs";
import { foodSummary, cropRecipes } from "./town-food.mjs";
import {
  constructionRecipes,
  initializeTown,
  reconcileTown,
  applyTownCommand,
  TownRuleError,
} from "./town-model.mjs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
const scrypt = promisify(derive);
const digest = (value) => createHash("sha256").update(value).digest("hex");
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};
async function body(req) {
  let size = 0,
    chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) fail(413, "Request too large");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Invalid request");
    return value;
  } catch {
    fail(400, "Invalid JSON request");
  }
}
function text(value, min, max) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    fail(400, "Invalid text field");
  return value.trim();
}
export function createTownServer({
  database = ":memory:",
  origin = "http://127.0.0.1:5185",
  now = Date.now,
} = {}) {
  const db = new DatabaseSync(database);
  if (db.prepare("SELECT name FROM sqlite_master WHERE name='parents'").get())
    db.exec("ALTER TABLE parents RENAME TO owners");
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS owners(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'parent');
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,parent_id TEXT NOT NULL REFERENCES owners(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS cadets(id TEXT PRIMARY KEY,parent_id TEXT NOT NULL REFERENCES owners(id),name TEXT NOT NULL,request_id TEXT NOT NULL,UNIQUE(parent_id,request_id));
 CREATE TABLE IF NOT EXISTS management(town_id TEXT PRIMARY KEY,device_id TEXT NOT NULL,session_id TEXT NOT NULL,generation INTEGER NOT NULL,request_id TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS commands(town_id TEXT NOT NULL,request_id TEXT NOT NULL,payload TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(town_id,request_id));
 CREATE TABLE IF NOT EXISTS claims(parent_id TEXT NOT NULL,request_id TEXT NOT NULL,cadet_id TEXT NOT NULL,PRIMARY KEY(parent_id,request_id));
 CREATE TABLE IF NOT EXISTS towns(cadet_id TEXT PRIMARY KEY REFERENCES cadets(id),state TEXT NOT NULL);
 `);
  if (
    !db
      .prepare("PRAGMA table_info(owners)")
      .all()
      .some((c) => c.name === "kind")
  )
    db.exec(
      "ALTER TABLE owners ADD COLUMN kind TEXT NOT NULL DEFAULT 'parent'",
    );
  const attempts = new Map();
  function cookie(token, maxAge = 86400, name = "mars_parent") {
    return `${name}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${origin.startsWith("https:") ? "; Secure" : ""}`;
  }
  function sessionToken(req, name = "mars_parent") {
    return (req.headers.cookie ?? "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }
  function session(req, name = "mars_parent") {
    const token = sessionToken(req, name);
    if (!token) return null;
    return (
      db
        .prepare(
          "SELECT parent_id FROM sessions JOIN owners ON owners.id=sessions.parent_id WHERE token=? AND expires>? AND owners.kind=?",
        )
        .get(digest(token), now(), name === "mars_guest" ? "guest" : "parent")
        ?.parent_id ?? null
    );
  }
  function ownTown(parent, id) {
    const row = db
      .prepare(
        "SELECT t.state FROM towns t JOIN cadets c ON c.id=t.cadet_id WHERE c.id=? AND c.parent_id=?",
      )
      .get(id, parent);
    if (!row) fail(404, "Town not found");
    const state = reconcileTown(
      initializeTown(JSON.parse(row.state), now()),
      now(),
    );
    db.prepare("UPDATE towns SET state=? WHERE cadet_id=?").run(
      JSON.stringify(state),
      id,
    );
    return state;
  }
  function publicTown(state) {
    const { visits, visitBaseline, ...town } = state;
    return town;
  }
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    function send(status, value) {
      res.writeHead(status);
      res.end(JSON.stringify(value));
    }
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (req.method === "POST" && req.headers.origin !== origin)
        fail(403, "Origin not allowed");
      if (
        req.method === "POST" &&
        !String(req.headers["content-type"]).startsWith("application/json")
      )
        fail(415, "JSON required");
      if (
        req.method === "POST" &&
        (path === "/api/register" || path === "/api/login")
      ) {
        const key = req.socket.remoteAddress ?? "unknown",
          current = now();
        for (const [address, entry] of attempts)
          if (entry.reset <= current) attempts.delete(address);
        const limit = attempts.get(key) ?? { count: 0, reset: current + 60000 };
        limit.count++;
        attempts.set(key, limit);
        if (limit.count > 20)
          fail(429, "Too many sign-in attempts; retry shortly");
        const input = await body(req),
          username = text(input.username, 3, 40).toLowerCase(),
          password = text(input.password, 12, 128);
        if (!/^[a-z0-9_-]+$/.test(username))
          fail(
            400,
            "Use letters, digits, dash or underscore for parent username",
          );
        let parent = db
          .prepare("SELECT * FROM owners WHERE username=?")
          .get(username);
        if (path === "/api/register") {
          if (parent) fail(409, "Username unavailable");
          const salt = randomBytes(16).toString("hex"),
            hash = (await scrypt(password, salt, 64)).toString("hex"),
            id = randomUUID();
          try {
            db.prepare(
              "INSERT INTO owners(id,username,salt,password) VALUES(?,?,?,?)",
            ).run(id, username, salt, hash);
          } catch {
            fail(409, "Username unavailable");
          }
          parent = { id, username };
        } else {
          const actual = await scrypt(
            password,
            parent?.salt ?? "missing-account-salt",
            64,
          );
          if (
            !parent ||
            parent.kind !== "parent" ||
            !timingSafeEqual(actual, Buffer.from(parent.password, "hex"))
          )
            fail(401, "Invalid username or password");
        }
        const token = randomBytes(32).toString("hex");
        db.prepare("DELETE FROM sessions WHERE expires<=?").run(now());
        db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
          digest(token),
          parent.id,
          now() + 86400000,
        );
        res.setHeader("Set-Cookie", cookie(token));
        return send(path === "/api/register" ? 201 : 200, {
          username: parent.username,
        });
      }
      const account = session(req);
      const guest = session(req, "mars_guest");
      const cadets = (owner) =>
        db
          .prepare(
            "SELECT id,name FROM cadets WHERE parent_id=? ORDER BY rowid",
          )
          .all(owner);
      if (path === "/api/access" && req.method === "GET")
        return send(200, {
          parent: account
            ? db.prepare("SELECT username FROM owners WHERE id=?").get(account)
            : null,
          cadets: account ? cadets(account) : [],
          guest: guest ? (cadets(guest)[0] ?? null) : null,
        });
      if (path === "/api/guest" && req.method === "POST") {
        await body(req);
        if (guest) return send(200, cadets(guest)[0]);
        const owner = randomUUID(),
          id = randomUUID(),
          token = randomBytes(32).toString("hex");
        const state = initializeTown(
          {
            version: 1,
            cadetId: id,
            houseLevel: 1,
            adults: 2,
            houseCapacity: 2,
            createdAt: now(),
          },
          now(),
        );
        state.guestGrade = "K";
        state.eligibleTopics = practiceTopics
          .filter((t) => t.grade === "K")
          .map((t) => t.id);
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("INSERT INTO owners VALUES(?,?,?,?,?)").run(
            owner,
            `guest-${owner}`,
            "",
            "",
            "guest",
          );
          db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
            digest(token),
            owner,
            now() + 31536000000,
          );
          db.prepare("INSERT INTO cadets VALUES(?,?,?,?)").run(
            id,
            owner,
            "Explorer",
            id,
          );
          db.prepare("INSERT INTO towns VALUES(?,?)").run(
            id,
            JSON.stringify(state),
          );
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        res.setHeader("Set-Cookie", cookie(token, 31536000, "mars_guest"));
        return send(200, { id, name: "Explorer" });
      }
      if (path === "/api/guest/link" && req.method === "POST") {
        if (!account) fail(401, "Parent sign-in required");
        const requestId = text((await body(req)).requestId, 8, 100);
        const receipt = db
          .prepare(
            "SELECT cadet_id FROM claims WHERE parent_id=? AND request_id=?",
          )
          .get(account, requestId);
        if (receipt)
          return send(
            200,
            db
              .prepare("SELECT id,name FROM cadets WHERE id=? AND parent_id=?")
              .get(receipt.cadet_id, account),
          );
        if (!guest) fail(409, "No guest town to link");
        const cadet = cadets(guest)[0];
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare(
            "UPDATE cadets SET parent_id=?,request_id=? WHERE id=? AND parent_id=?",
          ).run(account, `claim-${randomUUID()}`, cadet.id, guest);
          db.prepare("INSERT INTO claims VALUES(?,?,?)").run(
            account,
            requestId,
            cadet.id,
          );
          db.prepare("DELETE FROM sessions WHERE parent_id=?").run(guest);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        res.setHeader("Set-Cookie", cookie("", 0, "mars_guest"));
        return send(200, cadet);
      }
      const townId = path.match(/^\/api\/towns\/([a-f0-9-]+)/)?.[1];
      const useGuest =
        guest &&
        townId &&
        db
          .prepare("SELECT id FROM cadets WHERE id=? AND parent_id=?")
          .get(townId, guest);
      const parent = useGuest ? guest : (account ?? guest);
      const token = sessionToken(
        req,
        useGuest || !account ? "mars_guest" : "mars_parent",
      );
      if ((path === "/api/cadets" || path === "/api/logout") && !account)
        fail(401, "Parent sign-in required");
      if (!parent) fail(401, "Sign in to open your town");
      if (path === "/api/logout" && req.method === "POST") {
        const token = sessionToken(req);
        if (token)
          db.prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
        res.setHeader("Set-Cookie", cookie("", 0));
        return send(200, { ok: true });
      }
      if (path === "/api/cadets" && req.method === "GET")
        return send(
          200,
          db
            .prepare(
              "SELECT id,name FROM cadets WHERE parent_id=? ORDER BY rowid",
            )
            .all(parent),
        );
      if (path === "/api/cadets" && req.method === "POST") {
        const input = await body(req),
          name = text(input.name, 1, 40),
          requestId = text(input.requestId, 8, 100);
        const existing = db
          .prepare(
            "SELECT id,name FROM cadets WHERE parent_id=? AND request_id=?",
          )
          .get(parent, requestId);
        if (existing) {
          if (existing.name !== name)
            fail(409, "Request ID already used with another name");
          return send(200, existing);
        }
        const id = randomUUID(),
          state = {
            version: 1,
            cadetId: id,
            houseLevel: 1,
            adults: 2,
            houseCapacity: 2,
            createdAt: now(),
          };
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("INSERT INTO cadets VALUES(?,?,?,?)").run(
            id,
            parent,
            name,
            requestId,
          );
          db.prepare("INSERT INTO towns VALUES(?,?)").run(
            id,
            JSON.stringify(state),
          );
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return send(201, { id, name });
      }
      const visitPath = path.match(/^\/api\/towns\/([a-f0-9-]+)\/visit$/);
      if (visitPath && req.method === "POST") {
        const input = await body(req);
        db.exec("BEGIN IMMEDIATE");
        try {
          const state = ownTown(parent, visitPath[1]);
          const result = visitTown(state, input, digest(token), now());
          db.prepare("UPDATE towns SET state=? WHERE cadet_id=?").run(
            JSON.stringify(state),
            visitPath[1],
          );
          db.exec("COMMIT");
          return send(200, result);
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }
      const commandPath = path.match(
        /^\/api\/towns\/([a-f0-9-]+)\/(management|preference|command)$/,
      );
      if (commandPath) {
        const [, id, action] = commandPath;
        ownTown(parent, id);
        if (action === "management" && req.method === "GET") {
          const lease = db
            .prepare(
              "SELECT generation,device_id,session_id FROM management WHERE town_id=?",
            )
            .get(id);
          return send(200, {
            generation: lease?.generation ?? 0,
            available:
              !lease ||
              !db
                .prepare(
                  "SELECT token FROM sessions WHERE token=? AND expires>?",
                )
                .get(lease.session_id, now()),
            deviceId:
              lease?.session_id === digest(token) ? lease.device_id : null,
          });
        }
        if (req.method === "POST") {
          const input = await body(req);
          if (action === "command" && input.command?.action === "set-topics") {
            if (parent === guest)
              fail(403, "Parent sign-in required to change eligible topics");
            const account = db
              .prepare("SELECT salt,password FROM owners WHERE id=?")
              .get(parent);
            const password = text(input.command.password, 12, 128);
            const actual = await scrypt(password, account.salt, 64);
            if (!timingSafeEqual(actual, Buffer.from(account.password, "hex")))
              fail(403, "Parent password required to change eligible topics");
            delete input.command.password;
          }
          const deviceId = text(input.deviceId, 8, 100),
            requestId = text(input.requestId, 8, 100);
          if (!Number.isSafeInteger(input.generation) || input.generation < 0)
            fail(400, "Invalid management generation");
          db.exec("BEGIN IMMEDIATE");
          let result;
          try {
            const state = ownTown(parent, id);
            const lease = db
              .prepare("SELECT * FROM management WHERE town_id=?")
              .get(id);
            const mine =
              lease?.device_id === deviceId &&
              lease?.session_id === digest(token);
            if (action === "management") {
              if (mine && lease.request_id === requestId)
                result = { generation: lease.generation, deviceId };
              else {
                if ((lease?.generation ?? 0) !== input.generation)
                  fail(409, "Management changed. Refresh before taking over.");
                const generation = input.generation + 1;
                db.prepare(
                  "INSERT INTO management VALUES(?,?,?,?,?) ON CONFLICT(town_id) DO UPDATE SET device_id=excluded.device_id,session_id=excluded.session_id,generation=excluded.generation,request_id=excluded.request_id",
                ).run(id, deviceId, digest(token), generation, requestId);
                result = { generation, deviceId };
              }
            } else {
              if (!mine || lease.generation !== input.generation)
                fail(
                  409,
                  "Another device manages this town. Refresh to take over.",
                );
              const intent =
                action === "preference"
                  ? { motto: text(input.motto, 1, 80) }
                  : input.command;
              if (
                !intent ||
                typeof intent !== "object" ||
                Array.isArray(intent)
              )
                fail(400, "Invalid command");
              const payload = JSON.stringify(
                action === "preference" ? intent : { command: intent },
              );
              const receipt = db
                .prepare(
                  "SELECT payload,result FROM commands WHERE town_id=? AND request_id=?",
                )
                .get(id, requestId);
              if (receipt) {
                if (receipt.payload !== payload)
                  fail(409, "Request ID already used for another command");
                result = JSON.parse(receipt.result);
              } else {
                if (action === "preference") {
                  state.motto = intent.motto;
                  state.revision = (state.revision ?? 0) + 1;
                } else if (intent.action === "guest-profile") {
                  if (parent !== guest)
                    fail(403, "Guest profile is only available before linking");
                  const name = text(intent.name, 1, 40);
                  if (!["K", "1", "2", "3", "4", "5"].includes(intent.grade))
                    fail(400, "Choose a grade from K to 5");
                  db.prepare("UPDATE cadets SET name=? WHERE id=?").run(
                    name,
                    id,
                  );
                  state.guestGrade = intent.grade;
                  state.guestName = name;
                  state.eligibleTopics = practiceTopics
                    .filter((t) => t.grade === intent.grade)
                    .map((t) => t.id);
                  state.revision = (state.revision ?? 0) + 1;
                } else applyTownCommand(state, intent, now());
                result = publicTown(state);
                db.prepare("UPDATE towns SET state=? WHERE cadet_id=?").run(
                  JSON.stringify(state),
                  id,
                );
                db.prepare("INSERT INTO commands VALUES(?,?,?,?)").run(
                  id,
                  requestId,
                  payload,
                  JSON.stringify(result),
                );
              }
            }
            db.exec("COMMIT");
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
          return send(200, result);
        }
      }
      const match = path.match(/^\/api\/towns\/([a-f0-9-]+)$/);
      if (match && req.method === "GET") {
        const town = ownTown(parent, match[1]);
        return send(200, {
          ...publicTown(town),
          foodSummary: foodSummary(town),
          cropRecipes,
          practice: practiceSummary(town),
          serverNow: now(),
          recipes: constructionRecipes,
        });
      }
      fail(404, "Not found");
    } catch (error) {
      if (error instanceof TownRuleError) send(400, { error: error.message });
      else if (error instanceof HttpError)
        send(error.status, { error: error.message });
      else {
        console.error("Town request failed:", error.message);
        send(500, { error: "Town service unavailable; retry" });
      }
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return { server, close: () => db.close() };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const database = process.env.TOWN_DATABASE ?? ".town-data/development.sqlite";
  mkdirSync(dirname(database), { recursive: true });
  const app = createTownServer({
    database,
    origin: process.env.TOWN_ORIGIN ?? "http://127.0.0.1:5185",
  });
  app.server.listen(Number(process.env.TOWN_PORT ?? 5186), "127.0.0.1", () =>
    console.log(
      "Town API listening on loopback port " + (process.env.TOWN_PORT ?? 5186),
    ),
  );
}
