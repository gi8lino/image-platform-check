import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { addedImages, collectImagesFromYaml } from "./images.js";
/** Discover image references introduced by changed files in the current pull request. */
export function discoverChangedImages(baseSha, filePattern) {
  ensureCommit(baseSha);
  const files = git([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    baseSha,
    "--",
  ])
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => file && filePattern.test(file));
  const images = new Set();
  for (const file of files) {
    const head = collectImagesFromYaml(readFileSync(file, "utf8"));
    const base = collectImagesFromYaml(readBaseFile(baseSha, file));
    for (const image of addedImages(base, head)) {
      images.add(image);
    }
  }
  return [...images].sort();
}
function readBaseFile(baseSha, file) {
  try {
    return git(["show", `${baseSha}:${file}`]);
  } catch {
    return "";
  }
}
function ensureCommit(sha) {
  try {
    git(["cat-file", "-e", `${sha}^{commit}`]);
  } catch {
    git(["fetch", "--no-tags", "--depth=1", "origin", sha]);
  }
}
function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
