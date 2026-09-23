# genfab

Generate manufacturing outputs for a KiCad project: gerbers, drill files, BOM,
netlist, and pick-and-place. A TypeScript port of the original `generate.sh`.

Runs directly on Node (≥ 22.6) via native TypeScript type-stripping — no build
step, no transpilation, and zero npm dependencies (only `node:` built-ins).

## Requirements

- **Node.js ≥ 22.6** (runs the `.ts` files directly)
- **kicad-cli** — found on `PATH`, or at
  `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` on macOS
- **git** — used to embed the latest commit hash in outputs
- **zip** — used to package gerber files

## Install

### Local link (development)

From the module directory:

```sh
cd tools/genfab
npm link
```

This puts a `genfab` command on your `PATH` pointing at this checkout. Changes
to the source take effect immediately. Remove it with `npm unlink -g genfab`.

### Global install

```sh
npm install -g genfab
```

Or install straight from the local folder without publishing:

```sh
npm install -g ./tools/genfab
```

### Run without installing

```sh
node tools/genfab/bin/genfab.ts <directory_path>
```

## Usage

```sh
genfab [OPTIONS] <directory_path>
```

`<directory_path>` is a KiCad project directory (e.g. `monai_ui`) containing
`<name>.kicad_pcb` and `<name>.kicad_sch` files matching the directory name.

| Option            | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `-h`, `--help`    | Show help and exit.                                                |
| `--no-inspection` | Skip opening GerbView after gerber generation.                     |
| `--bom`           | Generate `outputs/bom/<name>_bom.csv` only.                        |
| `--netlist`       | Generate `outputs/netlist/<name>.net` only.                        |
| `--pos`           | Generate `outputs/pos/<name>_pos.csv` only.                        |

Default mode (no flag) runs ERC, DRC, generates gerbers + drill, writes the BOM
and pick-and-place files, packages the gerbers into `outputs/<GIT_HASH>.zip`,
and opens GerbView for inspection.

### Examples

```sh
genfab monai_ui                     # Full gerber generation flow
genfab --no-inspection monai_module # Gerbers without opening GerbView
genfab --bom monai_ui               # BOM CSV only
genfab --netlist monai_ui           # Netlist only
genfab --pos monai_ui               # Pick-and-place CSV only
```

## Publishing to npm

The package is configured to publish as a **public** package
(`publishConfig.access: public`).

1. Sign in once: `npm login`
2. Bump the version (updates `package.json` and creates a git tag):

   ```sh
   npm version patch   # 1.0.0 -> 1.0.1  (bug fixes)
   npm version minor   # 1.0.0 -> 1.1.0  (new features, backwards compatible)
   npm version major   # 1.0.0 -> 2.0.0  (breaking changes)
   ```

3. Publish:

   ```sh
   npm publish
   ```

Preview what will be included before publishing:

```sh
npm pack --dry-run
```

Only `bin/`, `src/`, `README.md`, `LICENSE`, and `package.json` are shipped
(see the `files` field).

> **Note on the name:** `genfab` is unscoped. If it is already taken on the
> public registry, either rename the package or publish under a scope, e.g.
> `"name": "@your-org/genfab"` — a scoped public package still requires the
> `publishConfig.access: public` that is already set here.

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE). Free to use for
noncommercial purposes (personal, hobby, research, education, nonprofits,
government). Commercial use requires a separate license from the author.

This is not an OSI-approved open source license, so npm and GitHub will show it
as a non-standard license.
