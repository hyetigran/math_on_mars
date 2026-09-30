// Both source modules and built chunks sit one directory below the app mount.
// Derive it from this module, not the current (possibly nested) page URL.
// Keep directory resolution at runtime; Vite otherwise treats it as an asset import.
const moduleUrl = import.meta.url;
export const appBase = new URL("../", moduleUrl).pathname;
export const appUrl = (route: string) => appBase + route.replace(/^\//, "");
export const currentRoute = () =>
  location.pathname
    .slice(appBase.length - 1)
    .replace(/\/index\.html$/, "/")
    .replace(/\/+$/, "") || "/";
