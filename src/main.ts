import { discoverChangedImages } from "./git.js";
import { inspectPlatforms } from "./inspect.js";
import { formatPlatform, matchesPlatform, parsePlatform } from "./platform.js";
import {
  addSummary,
  endGroup,
  fail,
  getInput,
  setOutput,
  startGroup,
} from "./runtime.js";

interface Result {
  image: string;
  available: string[];
  missing: string[];
  error?: string;
}

/** Run the GitHub Action. */
export function run(): void {
  try {
    const required = splitInput(getInput("platforms") || "linux/amd64").map(
      parsePlatform,
    );
    if (required.length === 0) {
      throw new Error("at least one required platform must be configured");
    }

    const explicitImages = splitInput(getInput("images"));
    const images =
      explicitImages.length > 0 ? explicitImages : discoverImages();

    console.log(
      `Required platforms: ${required.map(formatPlatform).join(", ")}`,
    );
    if (images.length === 0) {
      console.log("No changed container image references found.");
      setOutputs([], []);
      return;
    }

    const results: Result[] = [];
    for (const image of images) {
      startGroup(image);
      try {
        const availablePlatforms = inspectPlatforms(image);
        const available = availablePlatforms.map(formatPlatform).sort();
        const missing = required
          .filter(
            (wanted) =>
              !availablePlatforms.some((candidate) =>
                matchesPlatform(candidate, wanted),
              ),
          )
          .map(formatPlatform);

        console.log(
          `Available: ${available.length > 0 ? available.join(", ") : "none detected"}`,
        );
        if (missing.length > 0) {
          console.error(
            `Missing required platform${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
          );
        } else {
          console.log("All required platforms are available.");
        }
        results.push({ image, available, missing });
      } catch (error) {
        const message = errorMessage(error);
        console.error(`Unable to inspect image: ${message}`);
        results.push({
          image,
          available: [],
          missing: required.map(formatPlatform),
          error: message,
        });
      } finally {
        endGroup();
      }
    }

    const failures = results.filter(
      (result) => result.missing.length > 0 || result.error !== undefined,
    );
    setOutputs(images, failures);
    addSummary(summary(results));

    if (failures.length > 0) {
      fail(
        `${failures.length} of ${results.length} image${results.length === 1 ? "" : "s"} failed platform verification.`,
      );
    }
  } catch (error) {
    fail(errorMessage(error));
  }
}

function discoverImages(): string[] {
  const baseRef = getInput("base-ref");
  if (!baseRef) {
    throw new Error(
      "automatic image discovery requires the base-ref input; provide images to skip discovery",
    );
  }

  const pattern = new RegExp(getInput("file-pattern") || "\\.(?:ya?ml)$");
  return discoverChangedImages(baseRef, pattern);
}

function splitInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function setOutputs(images: string[], failures: Result[]): void {
  setOutput("checked", images.length);
  setOutput("failed", failures.length);
  setOutput("images", JSON.stringify(images));
}

function summary(results: Result[]): string {
  const rows = results.map((result) => {
    const status =
      result.error !== undefined
        ? `❌ ${result.error}`
        : result.missing.length > 0
          ? `❌ Missing ${result.missing.join(", ")}`
          : "✅ Available";
    return `| \`${escapeTable(result.image)}\` | ${escapeTable(result.available.join(", ") || "—")} | ${escapeTable(status)} |`;
  });

  return [
    "## Image platform check",
    "",
    "| Image | Available platforms | Result |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

run();
