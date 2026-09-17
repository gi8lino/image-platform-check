import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { addedImages, collectImagesFromYaml } from "./images.js";

/** Discover image references introduced on HEAD compared with the merge base of the supplied ref. */
export function discoverChangedImages(
  baseRef: string,
  filePattern: RegExp,
): string[] {
  ensureRef(baseRef);
  const baseSha = git(["merge-base", baseRef, "HEAD"]).trim();
  if (!baseSha) {
    throw new Error(`unable to determine merge base for ${baseRef}`);
  }

  const files = git([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    baseSha,
    "HEAD",
    "--",
  ])
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => file && filePattern.test(file));

  const images = new Set<string>();
  for (const file of files) {
    const head = collectImagesFromYaml(readFileSync(file, "utf8"));
    const base = collectImagesFromYaml(readBaseFile(baseSha, file));
    for (const image of addedImages(base, head)) {
      images.add(image);
    }
  }

  return [...images].sort();
}

function readBaseFile(baseSha: string, file: string): string {
  try {
    return git(["show", `${baseSha}:${file}`]);
  } catch {
    return "";
  }
}

function ensureRef(ref: string): void {
  try {
    git(["rev-parse", "--verify", `${ref}^{commit}`]);
  } catch {
    git(["fetch", "--no-tags", "origin", `${ref}:${ref}`]);
  }
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
