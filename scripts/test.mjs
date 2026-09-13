import ts from "typescript";
import {
  mkdtemp,
  readdir,
  readFile,
  writeFile,
  mkdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const output = await mkdtemp(join(tmpdir(), "math-on-mars-tests-"));
try {
  await writeFile(join(output, "package.json"), '{"type":"commonjs"}');
  for (const folder of ["src", "tests"]) {
    await mkdir(join(output, folder));
    for (const file of await readdir(folder)) {
      if (!file.endsWith(".ts") || file.endsWith(".d.ts")) continue;
      const compiled = ts.transpileModule(
        await readFile(join(folder, file), "utf8"),
        {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
          },
        },
      );
      await writeFile(
        join(output, folder, file.replace(/\.ts$/, ".js")),
        compiled.outputText,
      );
    }
  }
  const files = (await readdir(join(output, "tests")))
    .filter((file) => file.endsWith(".test.js"))
    .map((file) => join(output, "tests", file));
  const result = spawnSync(process.execPath, ["--test", ...files], {
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(output, { recursive: true, force: true });
}
