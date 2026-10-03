import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { createTownServer } from "../server/town-server.mjs";
import { createPlaytestClock } from "../server/town-playtest-clock.mjs";

const origin = "http://127.0.0.1:5190";
const clock = createPlaytestClock();
const app = createTownServer({ origin, now: clock.now }); // In-memory SQLite by default.
const server = createServer(async (req, res) => {
  if (req.url !== "/api/playtest/time") {
    app.server.emit("request", req, res);
    return;
  }
  const send = (status, value) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  };
  if (req.method === "GET") return send(200, clock.snapshot());
  if (req.method !== "POST") return send(405, { error: "Method not allowed" });
  if (req.headers.origin !== origin)
    return send(403, { error: "Playtest origin required" });
  if (!String(req.headers["content-type"]).startsWith("application/json"))
    return send(415, { error: "JSON required" });
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1024) throw Error("Time-step request too large");
    }
    send(200, clock.advance(JSON.parse(body)));
  } catch (error) {
    send(400, { error: error.message });
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
const vite = await createViteServer({
  configFile: "vite.connected.config.ts",
  mode: "playtest",
  server: {
    port: 5190,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:5191" },
  },
});
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(5191, "127.0.0.1", resolve);
  });
  await vite.listen();
  console.log(`Town mechanics playtest: ${origin}/play/`);
  console.log(
    "Clock is paused. Use the time buttons. Restarting resets this disposable town database.",
  );
} catch (error) {
  await vite.close();
  server.close();
  app.close();
  throw error;
}
async function stop() {
  await vite.close();
  await new Promise((resolve) => server.close(resolve));
  app.close();
  process.exit(0);
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
