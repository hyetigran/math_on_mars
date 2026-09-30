export type Cadet = { id: string; name: string };
export type Access = {
  parent: { username: string } | null;
  cadets: Cadet[];
  guest: Cadet | null;
};
export async function api(path: string, data?: unknown): Promise<any> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: data === undefined ? "GET" : "POST",
      headers:
        data === undefined ? undefined : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw Error("No connection. Retry when online.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error("Town service unavailable. Retry shortly.");
  }
  if (!response.ok) throw Error(result.error ?? "Request failed. Retry.");
  return result;
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function pendingRequest(key: string): string {
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}
export function openParentSignIn(onSuccess: () => void) {
  const dialog = document.createElement("dialog");
  dialog.className = "town-dialog";
  dialog.setAttribute("aria-labelledby", "parent-title");
  dialog.innerHTML = `<button class="dialog-close" aria-label="Close parent sign in">×</button><h2 id="parent-title">Parent sign in</h2><form><label>Parent username<input name="username" autocomplete="username" minlength="3" maxlength="40" pattern="[A-Za-z0-9_-]+" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required></label><p class="hint">At least 12 characters.</p><p role="alert" data-error></p><div class="actions"><button class="primary" value="login">Sign in</button><button value="register">Create parent account</button></div></form>`;
  document.body.append(dialog);
  let busy = false;
  const close = () => {
    if (!busy) dialog.close();
  };
  dialog.querySelector<HTMLButtonElement>(".dialog-close")!.onclick = close;
  dialog.oncancel = (e) => {
    if (busy) e.preventDefault();
  };
  dialog.onclose = () => dialog.remove();
  const form = dialog.querySelector("form")!;
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const fields = new FormData(form),
      action = (event.submitter as HTMLButtonElement)?.value ?? "login";
    dialog
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => (b.disabled = true));
    try {
      await api(`/api/${action}`, {
        username: fields.get("username"),
        password: fields.get("password"),
      });
      dialog.close();
      onSuccess();
    } catch (error) {
      dialog.querySelector<HTMLElement>("[data-error]")!.textContent =
        error instanceof Error ? error.message : "Unable to sign in.";
    } finally {
      busy = false;
      dialog
        .querySelectorAll<HTMLButtonElement>("button")
        .forEach((b) => (b.disabled = false));
    }
  };
  dialog.showModal();
}
