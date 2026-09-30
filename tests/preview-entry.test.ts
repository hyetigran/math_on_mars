import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("WizardGenie root previews hand off to the compiled app before loading TypeScript", async () => {
  const html = await readFile(join(process.cwd(), "index.html"), "utf8");
  const previewGuard = html.indexOf('"__wgEditorCam" in window');
  const compiledTarget = html.indexOf('new URL("dist/", document.baseURI)');
  const sourceEntry = html.indexOf('src="/src/main.ts"');

  assert.notEqual(previewGuard, -1);
  assert.notEqual(compiledTarget, -1);
  assert.notEqual(sourceEntry, -1);
  assert.ok(previewGuard < sourceEntry);
  assert.ok(compiledTarget < sourceEntry);
});

test("the headless sprite renderer cannot strand an interactive preview on a blank page", async () => {
  const html = await readFile(
    join(process.cwd(), "scripts/sprite-baker/render.html"),
    "utf8",
  );

  assert.match(html, /"__wgEditorCam" in window/);
  assert.match(html, /location\.replace\(new URL\("\.\.\/\.\.\/"/);
});
