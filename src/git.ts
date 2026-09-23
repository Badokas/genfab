import { spawnSync } from "node:child_process";

/** Short hash (uppercased) of the last commit that touched the board dir. */
export function gitHash(boardDir: string): string {
  const res = spawnSync(
    "git",
    ["log", "-1", "--format=%h", "--", boardDir],
    { encoding: "utf8" },
  );
  return (res.stdout ?? "").trim().toUpperCase();
}

/** Exact tag on HEAD, or "NO_TAG" when HEAD is not tagged. */
export function gitTag(): string {
  const res = spawnSync(
    "git",
    ["describe", "--tags", "--exact-match"],
    { encoding: "utf8" },
  );
  if (res.status === 0) {
    const tag = (res.stdout ?? "").trim();
    if (tag) return tag;
  }
  return "NO_TAG";
}
