import { readFileSync } from "node:fs";

interface ErcItem {
  uuid?: string;
  description?: string;
}
interface ErcViolation {
  type?: string;
  items?: ErcItem[];
}
interface ErcSheet {
  violations?: ErcViolation[];
}
interface ErcReport {
  sheets?: ErcSheet[];
}

export interface NonExcludedResult {
  count: number;
  details: string[];
}

/**
 * Cross-check ERC violations from the JSON report against the exclusion list
 * in the .kicad_pro file. Works around kicad-cli bug #17004 where excluded
 * violations still count toward the exit code.
 *
 * Mirrors the python one-liner in generate.sh: an exclusion string is
 * pipe-delimited and the violation UUID is the 4th field (index 3).
 */
export function nonExcludedViolations(
  ercJsonPath: string,
  proPath: string,
): NonExcludedResult {
  const erc = JSON.parse(readFileSync(ercJsonPath, "utf8")) as ErcReport;
  const pro = JSON.parse(readFileSync(proPath, "utf8")) as {
    erc?: { erc_exclusions?: unknown[] };
  };

  const exclusions = pro.erc?.erc_exclusions ?? [];
  const exclUuids = new Set<string>();
  for (const entry of exclusions) {
    // Each entry is [ "<type>|<x>|<y>|<uuid>", ... ]
    const first = Array.isArray(entry) ? entry[0] : entry;
    if (typeof first === "string") {
      const uuid = first.split("|")[3];
      if (uuid) exclUuids.add(uuid);
    }
  }

  const details: string[] = [];
  for (const sheet of erc.sheets ?? []) {
    for (const v of sheet.violations ?? []) {
      const item = v.items?.[0];
      if (item && item.uuid && !exclUuids.has(item.uuid)) {
        details.push(`  [${v.type ?? ""}] ${item.description ?? ""}`);
      }
    }
  }

  return { count: details.length, details };
}
