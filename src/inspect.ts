import { execFileSync } from "node:child_process";
import type { Platform } from "./platform.js";

interface ManifestDescriptor {
  platform?: Record<string, unknown>;
}

interface ManifestData {
  manifests?: ManifestDescriptor[];
}

/** Inspect a remote image and return all concrete platforms advertised by it. */
export function inspectPlatforms(image: string): Platform[] {
  const manifest = inspectJson<ManifestData>(image, "{{json .Manifest}}");
  const indexed = manifest.manifests
    ?.map((descriptor) => toPlatform(descriptor.platform))
    .filter((platform): platform is Platform => platform !== undefined);

  if (indexed && indexed.length > 0) {
    return uniquePlatforms(indexed);
  }

  const config = inspectJson<Record<string, unknown>>(image, "{{json .Image}}");
  const platform = toPlatform(config);
  return platform === undefined ? [] : [platform];
}

function inspectJson<T>(image: string, format: string): T {
  const output = execFileSync(
    "docker",
    ["buildx", "imagetools", "inspect", image, "--format", format],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  return JSON.parse(output) as T;
}

function toPlatform(value: unknown): Platform | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.os !== "string" ||
    typeof candidate.architecture !== "string"
  ) {
    return undefined;
  }
  if (candidate.os === "unknown" || candidate.architecture === "unknown") {
    return undefined;
  }

  return typeof candidate.variant === "string"
    ? {
        os: candidate.os,
        architecture: candidate.architecture,
        variant: candidate.variant,
      }
    : { os: candidate.os, architecture: candidate.architecture };
}

function uniquePlatforms(platforms: Platform[]): Platform[] {
  const unique = new Map<string, Platform>();
  for (const platform of platforms) {
    unique.set(
      `${platform.os}/${platform.architecture}/${platform.variant ?? ""}`,
      platform,
    );
  }
  return [...unique.values()];
}
