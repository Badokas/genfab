export interface Options {
  noInspection: boolean;
  genBom: boolean;
  genNetlist: boolean;
  genPos: boolean;
  boardDir: string;
}

const PROG = "genfab";

export function showHelp(): never {
  console.log(`Usage: ${PROG} [OPTIONS] <directory_path>

Generate manufacturing outputs for a KiCad project.

Arguments:
  <directory_path>       Path to the KiCad project directory (e.g. monai_ui).
                         The directory must contain <name>.kicad_pcb and
                         <name>.kicad_sch files matching the directory name.

Options:
  -h, --help             Show this help message and exit.
  --no-inspection        Skip opening GerbView after gerber generation.
  --bom                  Generate a BOM (Bill of Materials) CSV from the
                         schematic and exit. The BOM is written to
                         <directory_path>/outputs/bom/<name>_bom.csv.
                         Columns: Refs, Value, Footprint, MPN, Qty, DNP.
  --netlist              Generate a netlist from the schematic and exit.
                         The netlist is written to
                         <directory_path>/outputs/netlist/<name>.net.
  --pos                  Generate a pick-and-place (position) CSV from the
                         PCB and exit. The file is written to
                         <directory_path>/outputs/pos/<name>_pos.csv.
                         Columns: Ref, Val, Package, PosX, PosY, Rot, Side.

Modes:
  Default (no --bom)     Runs ERC, DRC, generates gerbers + drill files,
                         a pick-and-place file, packages the gerbers into a
                         zip named by the git hash, and optionally opens
                         GerbView for inspection.

  BOM (--bom)            Exports the BOM only. No ERC/DRC/gerber steps
                         are performed.

  Netlist (--netlist)    Exports the netlist only. No ERC/DRC/gerber steps
                         are performed.

  Pos (--pos)            Exports the pick-and-place file only. No
                         ERC/DRC/gerber steps are performed.

  In the default mode the BOM and pick-and-place files are written to
  <directory_path>/outputs/bom/ and <directory_path>/outputs/pos/
  respectively and are NOT included in the gerber zip.

Examples:
  ${PROG} monai_ui                     # Full gerber generation flow
  ${PROG} --no-inspection monai_module # Gerbers without opening GerbView
  ${PROG} --bom monai_ui               # Generate BOM CSV only
  ${PROG} --netlist monai_ui           # Generate netlist only
  ${PROG} --pos monai_ui               # Generate pick-and-place CSV only

Requires:
  kicad-cli   Found via PATH or /Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
  git         Used to embed the latest commit hash in outputs
  zip         Used to package gerber files`);
  process.exit(0);
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = {
    noInspection: false,
    genBom: false,
    genNetlist: false,
    genPos: false,
    boardDir: "",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        showHelp();
        break;
      case "--no-inspection":
        opts.noInspection = true;
        break;
      case "--bom":
        opts.genBom = true;
        break;
      case "--netlist":
        opts.genNetlist = true;
        break;
      case "--pos":
        opts.genPos = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          console.error(`Run '${PROG} --help' for usage information.`);
          process.exit(1);
        }
        if (opts.boardDir === "") {
          opts.boardDir = arg;
        } else {
          console.error("Error: Multiple directory arguments provided");
          console.error(`Run '${PROG} --help' for usage information.`);
          process.exit(1);
        }
    }
  }

  if (opts.boardDir === "") {
    console.error("Error: No directory specified.");
    console.error(`Run '${PROG} --help' for usage information.`);
    process.exit(1);
  }

  // Strip trailing slash so basename() matches the original `basename` output.
  opts.boardDir = opts.boardDir.replace(/\/+$/, "");
  return opts;
}
