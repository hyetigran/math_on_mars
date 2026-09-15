const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

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
