#!/usr/bin/env -S node

import { existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "../src/cli.ts";
import { findKicadCli } from "../src/kicad.ts";
import { gitHash, gitTag } from "../src/git.ts";
import {
  generateBom,
  generateNetlist,
  generatePos,
  requireSchematic,
} from "../src/generators.ts";
import { runFullFlow } from "../src/fullflow.ts";

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const boardName = basename(opts.boardDir);
  const pcbFile = join(opts.boardDir, `${boardName}.kicad_pcb`);
  const schFile = join(opts.boardDir, `${boardName}.kicad_sch`);
  const proFile = join(opts.boardDir, `${boardName}.kicad_pro`);

  if (!existsSync(pcbFile)) {
    console.error(`Error: PCB file '${pcbFile}' does not exist`);
    process.exit(1);
  }

  const cli = findKicadCli();

  const outputDir = join(opts.boardDir, "outputs");
  mkdirSync(outputDir, { recursive: true });

  // --- Single-shot modes ---
  if (opts.genBom) {
    requireSchematic(schFile);
    const code = await generateBom(cli, schFile, outputDir, boardName);
    process.exit(code === 0 ? 0 : 1);
  }
  if (opts.genNetlist) {
    requireSchematic(schFile);
    const code = await generateNetlist(cli, schFile, outputDir, boardName);
    process.exit(code === 0 ? 0 : 1);
  }
  if (opts.genPos) {
    const code = await generatePos(cli, pcbFile, outputDir, boardName);
    process.exit(code === 0 ? 0 : 1);
  }

  // --- Default full flow ---
  await runFullFlow({
    cli,
    pcbFile,
    schFile,
    proFile,
    outputDir,
    boardDir: opts.boardDir,
    boardName,
    gitHash: gitHash(opts.boardDir),
    gitTag: gitTag(),
    noInspection: opts.noInspection,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
