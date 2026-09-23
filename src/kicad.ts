import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const MACOS_KICAD_CLI =
  "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli";

/** Resolve the kicad-cli executable from PATH, falling back to the macOS app bundle. */
export function findKicadCli(): string {
  const probe = spawnSync("kicad-cli", ["version"], { stdio: "ignore" });
  if (!probe.error) {
    return "kicad-cli";
  }
  if (existsSync(MACOS_KICAD_CLI)) {
    console.log(`Using KiCad CLI from: ${MACOS_KICAD_CLI}`);
    return MACOS_KICAD_CLI;
  }
  console.error(
    `Error: kicad-cli not found in PATH or at ${MACOS_KICAD_CLI}`,
  );
  process.exit(1);
}

/**
 * Run kicad-cli, inheriting stdio, while filtering the noisy "Fontconfig"
 * lines out of stderr (matches the original generate.sh behaviour).
 * Resolves with the process exit code.
 */
export function runKicadCli(cli: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cli, args, {
      stdio: ["inherit", "inherit", "pipe"],
    });

    child.stderr.setEncoding("utf8");
    let pending = "";
    const flush = (chunk: string, final = false) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = final ? "" : (lines.pop() ?? "");
      for (const line of lines) {
        if (!line.startsWith("Fontconfig")) process.stderr.write(line + "\n");
      }
      if (final && pending && !pending.startsWith("Fontconfig")) {
        process.stderr.write(pending);
      }
    };

    child.stderr.on("data", (chunk: string) => flush(chunk));
    child.on("close", (code) => {
      flush("", true);
      resolve(code ?? 0);
    });
  });
}
