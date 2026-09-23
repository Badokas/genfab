import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runKicadCli } from "./kicad.ts";

export async function generateBom(
  cli: string,
  schFile: string,
  outputDir: string,
  boardName: string,
): Promise<number> {
  const bomDir = join(outputDir, "bom");
  mkdirSync(bomDir, { recursive: true });
  const bomFile = join(bomDir, `${boardName}_bom.csv`);
  console.log(`Generating BOM for ${boardName}...`);
  const code = await runKicadCli(cli, [
    "sch", "export", "bom", schFile,
    "--exclude-dnp",
    "--output", bomFile,
    "--fields", "Reference,Value,Footprint,Manufacturer Part Number,${QUANTITY},${DNP}",
    "--labels", "Refs,Value,Footprint,MPN,Qty,DNP",
    "--group-by", "Value,Footprint,Manufacturer Part Number",
  ]);
  if (code === 0) {
    console.log(`✅ BOM generated: ${bomFile}`);
  } else {
    console.error("❌ Error: BOM generation failed.");
  }
  return code;
}

export async function generateNetlist(
  cli: string,
  schFile: string,
  outputDir: string,
  boardName: string,
): Promise<number> {
  const netlistDir = join(outputDir, "netlist");
  mkdirSync(netlistDir, { recursive: true });
  const netlistFile = join(netlistDir, `${boardName}.net`);
  console.log(`Generating netlist for ${boardName}...`);
  const code = await runKicadCli(cli, [
    "sch", "export", "netlist", schFile,
    "--output", netlistFile,
  ]);
  if (code === 0) {
    console.log(`✅ Netlist generated: ${netlistFile}`);
  } else {
    console.error("❌ Error: Netlist generation failed.");
  }
  return code;
}

export async function generatePos(
  cli: string,
  pcbFile: string,
  outputDir: string,
  boardName: string,
): Promise<number> {
  const posDir = join(outputDir, "pos");
  mkdirSync(posDir, { recursive: true });
  const posFile = join(posDir, `${boardName}_pos.csv`);
  console.log(`Generating pick-and-place file for ${boardName}...`);
  const code = await runKicadCli(cli, [
    "pcb", "export", "pos", pcbFile,
    "--output", posFile,
    "--side", "both",
    "--format", "csv",
    "--units", "mm",
    "--use-drill-file-origin",
    "--exclude-dnp",
  ]);
  if (code === 0) {
    console.log(`✅ Pick-and-place file generated: ${posFile}`);
  } else {
    console.error("❌ Error: Pick-and-place generation failed.");
  }
  return code;
}

/** Verify a schematic file exists, exiting with an error if not. */
export function requireSchematic(schFile: string): void {
  if (!existsSync(schFile)) {
    console.error(`Error: Schematic file '${schFile}' does not exist`);
    process.exit(1);
  }
}
