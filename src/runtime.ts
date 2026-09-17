import { appendFileSync } from "node:fs";

/** Read a GitHub Action input using the environment convention used by JavaScript actions. */
export function getInput(name: string): string {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  return process.env[key]?.trim() ?? "";
}

/** Write a GitHub Action output. */
export function setOutput(name: string, value: string | number): void {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) {
    console.log(`${name}=${value}`);
    return;
  }

  const delimiter = `image_platform_check_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  appendFileSync(output, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, "utf8");
}

/** Append Markdown to the GitHub job summary when one is available. */
export function addSummary(markdown: string): void {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(summary, markdown, "utf8");
  }
}

/** Emit an error annotation and mark the action process as failed. */
export function fail(message: string): void {
  console.error(`::error::${escapeCommand(message)}`);
  process.exitCode = 1;
}

/** Start a collapsible GitHub Actions log group. */
export function startGroup(name: string): void {
  console.log(`::group::${escapeCommand(name)}`);
}

/** End the current GitHub Actions log group. */
export function endGroup(): void {
  console.log("::endgroup::");
}

function escapeCommand(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
