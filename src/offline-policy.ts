const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function shouldLoadSavedRelease(
  savedVersion: string | undefined,
  currentVersion: string,
  development: boolean,
  hostname: string,
  search: string,
): boolean {
  // A build query only selects archived code when offline packs are in use.
  // Dev servers and local static previews always serve the current app, so
  // redirecting them simply repeats splash → camp on every portal interaction.
  return Boolean(
    savedVersion &&
    savedVersion !== currentVersion &&
    shouldVerifyOfflinePack(development, hostname, search),
  );
}

/** Local game previews stay fast; explicit offline checks and published builds stay strict. */
export function shouldVerifyOfflinePack(
  development: boolean,
  hostname: string,
  search: string,
): boolean {
  if (development) return false;
  const forceVerification = new URLSearchParams(search).has("verifyOffline");
  return forceVerification || !LOCAL_HOSTS.has(hostname);
}
