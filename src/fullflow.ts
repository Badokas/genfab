import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { runKicadCli } from "./kicad.ts";
import { nonExcludedViolations } from "./erc.ts";
import { generateBom, generatePos } from "./generators.ts";

const GERBVIEW =
  "/Applications/KiCad/KiCad.app/Contents/Applications/gerbview.app/Contents/MacOS/gerbview";

const GERBER_LAYERS =
  "F.Cu,B.Cu,In1.Cu,In2.Cu,In3.Cu,In4.Cu,In5.Cu,In6.Cu," +
  "F.Silkscreen,B.Silkscreen,F.Mask,B.Mask,Edge.Cuts";

export interface FullFlowArgs {
  cli: string;
  pcbFile: string;
  schFile: string;
  proFile: string;
  outputDir: string;
  boardDir: string;
  boardName: string;
  gitHash: string;
  gitTag: string;
  noInspection: boolean;
}

export async function runFullFlow(a: FullFlowArgs): Promise<void> {
  const gerberDir = join(a.outputDir, "gerbers");
  const defineVars = [
    "--define-var", `GIT_HASH=${a.gitHash}`,
    "--define-var", `GIT_TAG=${a.gitTag}`,
  ];

  // --- ERC ---
  console.log("Running ERC check...");
  const ercJson = join(a.outputDir, "erc_report.json");
  const ercExit = await runKicadCli(a.cli, [
    "sch", "erc", a.schFile,
    ...defineVars,
    "--severity-error",
    "--exit-code-violations",
    "--format", "json",
    "--output", ercJson,
  ]);

  if (ercExit !== 0) {
    const { count, details } = nonExcludedViolations(ercJson, a.proFile);
    if (count > 0) {
      console.error(
        `❌ Error: ERC check failed with ${count} non-excluded violation(s):`,
      );
      for (const d of details) console.error(d);
      cleanup(ercJson);
      process.exit(1);
    } else {
      console.log(
        "⚠️  ERC reported violations but all are excluded in project settings (kicad-cli bug #17004). Continuing.",
      );
    }
  }
  cleanup(ercJson);

  // --- DRC ---
  console.log("Running DRC check...");
  const drcExit = await runKicadCli(a.cli, [
    "pcb", "drc", a.pcbFile,
    ...defineVars,
    "--severity-error",
    "--exit-code-violations",
  ]);
  if (drcExit !== 0) {
    console.error(
      "❌ Error: DRC check failed. Please fix design rule violations before generating gerber files.",
    );
    process.exit(1);
  }
  console.log(`✅ DRC check passed. Generating gerber files for ${a.boardName}...`);

  // --- BOM (best-effort) ---
  const bomCode = await generateBom(a.cli, a.schFile, a.outputDir, a.boardName);
  if (bomCode !== 0) {
    console.log("⚠️  Warning: BOM generation failed, continuing with gerbers...");
  }

  // --- Pick-and-place (best-effort) ---
  const posCode = await generatePos(a.cli, a.pcbFile, a.outputDir, a.boardName);
  if (posCode !== 0) {
    console.log(
      "⚠️  Warning: Pick-and-place generation failed, continuing with gerbers...",
    );
  }

  // --- Gerbers + drill ---
  mkdirSync(gerberDir, { recursive: true });
  console.log("Cleaning gerber directory...");
  for (const f of readdirSync(gerberDir)) {
    rmSync(join(gerberDir, f), { recursive: true, force: true });
  }

  await runKicadCli(a.cli, [
    "pcb", "export", "gerbers", a.pcbFile,
    "--output", gerberDir,
    ...defineVars,
    "--no-netlist",
    "--layers", GERBER_LAYERS,
    "--exclude-refdes",
    "--exclude-value",
    "--subtract-soldermask",
  ]);
  const drillExit = await runKicadCli(a.cli, [
    "pcb", "export", "drill", a.pcbFile,
    "--output", gerberDir,
  ]);

  if (drillExit !== 0) {
    console.error("Error: Failed to generate gerber files");
    process.exit(1);
  }

  console.log(`Gerber files generated successfully in ${gerberDir}`);

  // Remove .gbrjob files (not needed for manufacturing)
  console.log("Removing .gbrjob files...");
  for (const f of readdirSync(gerberDir)) {
    if (f.endsWith(".gbrjob")) unlinkSync(join(gerberDir, f));
  }

  // Rename files to use only the git hash.
  console.log("Renaming gerber files to use git hash...");
  renameGerbers(gerberDir, a.boardName, a.gitHash);

  // Create zip.
  const zipName = `${a.gitHash}.zip`;
  const zipFile = join(a.outputDir, zipName);
  console.log(`Creating zip file: ${zipFile}`);
  const zip = spawnSync("zip", ["-r", join("..", zipName), "."], {
    cwd: gerberDir,
    stdio: "inherit",
  });
  if (zip.status !== 0) {
    console.error("Error: Failed to create zip file");
    process.exit(1);
  }
  console.log(`Zip file created successfully: ${zipFile}`);

  // Open GerbView unless suppressed.
  if (!a.noInspection) {
    if (existsSync(GERBVIEW)) {
      console.log("Opening gerber files in GerbView for inspection...");
      const child = spawn(GERBVIEW, [resolve(zipFile)], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    } else {
      console.log(`GerbView not found at ${GERBVIEW} - skipping automatic opening`);
    }
  }
}

function renameGerbers(gerberDir: string, boardName: string, gitHash: string) {
  for (const file of readdirSync(gerberDir)) {
    let newName: string | undefined;
    if (file.startsWith(`${boardName}-`)) {
      // e.g. board-name-In1_Cu.g1
      newName = `${gitHash}.${file.slice(`${boardName}-`.length)}`;
    } else if (file.startsWith(`${boardName}.`)) {
      // e.g. board-name.drl
      newName = `${gitHash}.${file.slice(`${boardName}.`.length)}`;
    } else {
      continue;
    }
    renameSync(join(gerberDir, file), join(gerberDir, newName));
    console.log(`Renamed ${file} to ${newName}`);
  }
}

function cleanup(path: string) {
  try {
    rmSync(path, { force: true });
  } catch {
    /* ignore */
  }
}
