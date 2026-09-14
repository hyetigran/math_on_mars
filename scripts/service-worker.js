/* The build substitutes the complete, hashed file manifest. */
const BUILD = /* BUILD_MANIFEST */ null;
const scope = self.registration.scope;
const prefix = `math-on-mars:${scope}:`;
const manifestUrl = new URL("__offline_manifest__", scope).href;
const absolute = (path) => new URL(path, scope).href;
async function digest(response) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    await response.arrayBuffer(),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
async function ready(version) {
  if (!/^[a-f0-9]{16}$/.test(version) || !(await caches.has(prefix + version)))
    return false;
  const cache = await caches.open(prefix + version);
  const marker = await cache.match(manifestUrl);
  if (!marker) return false;
  const manifest = await marker.json();
  if (manifest.version !== version || !manifest.files.length) return false;
  for (const file of manifest.files) {
    const response = await cache.match(absolute(file.path));
    if (!response || (await digest(response)) !== file.sha256) return false;
  }
  return true;
}
async function install() {
  if (await ready(BUILD.version)) return;
  const cache = await caches.open(prefix + BUILD.version);
  await cache.delete(manifestUrl);
  for (const file of BUILD.files) {
    const response = await fetch(absolute(file.path), { cache: "reload" });
    if (!response.ok || (await digest(response.clone())) !== file.sha256)
      throw new Error("Offline file verification failed");
    await cache.put(absolute(file.path), response);
  }
  // An interrupted install has no readiness marker. Every use rechecks actual files.
  await cache.put(manifestUrl, new Response(JSON.stringify(BUILD)));
}
self.addEventListener("install", (event) => event.waitUntil(install()));
// Never force activation over a live page, and retain every previously installed pack.
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("message", (event) => {
  if (
    !["CHECK_PACK", "ENSURE_PACK"].includes(event.data?.type) ||
    !event.ports[0]
  )
    return;
  event.waitUntil(
    (async () => {
      if (
        event.data.type === "ENSURE_PACK" &&
        event.data.version === BUILD.version &&
        !(await ready(BUILD.version))
      )
        await install();
      return ready(event.data.version);
    })()
      .then((ok) => event.ports[0].postMessage({ ready: ok }))
      .catch(() => event.ports[0].postMessage({ ready: false })),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !url.href.startsWith(scope)) return;
  event.respondWith(
    (async () => {
      const client = event.clientId
        ? await self.clients.get(event.clientId)
        : undefined;
      const version =
        url.searchParams.get("build") ||
        (client && new URL(client.url).searchParams.get("build")) ||
        BUILD.version;
      if (!/^[a-f0-9]{16}$/.test(version))
        return new Response("Invalid content version", { status: 400 });
      const cache = await caches.open(prefix + version);
      const key =
        event.request.mode === "navigate"
          ? absolute("index.html")
          : new URL(url.pathname, url.origin).href;
      const response = await cache.match(key);
      if (response) return response;
      // Never substitute current content for a requested older version.
      const marker = await cache.match(manifestUrl);
      const manifest = marker ? await marker.json() : BUILD;
      const isRequired = manifest.files.some(
        (file) => absolute(file.path) === key,
      );
      if (
        version !== BUILD.version ||
        (isRequired && event.request.mode !== "navigate") ||
        url.searchParams.has("build")
      )
        return new Response(
          "This saved content pack is unavailable. Return to the current game to export your profile.",
          { status: 503 },
        );
      return fetch(event.request);
    })(),
  );
});
