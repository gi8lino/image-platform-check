import { execFileSync } from "node:child_process";
/** Inspect a remote image and return all concrete platforms advertised by it. */
export function inspectPlatforms(image) {
    const manifest = inspectJson(image, "{{json .Manifest}}");
    const indexed = manifest.manifests
        ?.map((descriptor) => toPlatform(descriptor.platform))
        .filter((platform) => platform !== undefined);
    if (indexed && indexed.length > 0) {
        return uniquePlatforms(indexed);
    }
    const config = inspectJson(image, "{{json .Image}}");
    const platform = toPlatform(config);
    return platform === undefined ? [] : [platform];
}
function inspectJson(image, format) {
    const output = execFileSync("docker", ["buildx", "imagetools", "inspect", image, "--format", format], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return JSON.parse(output);
}
function toPlatform(value) {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }
    const candidate = value;
    if (typeof candidate.os !== "string" || typeof candidate.architecture !== "string") {
        return undefined;
    }
    if (candidate.os === "unknown" || candidate.architecture === "unknown") {
        return undefined;
    }
    return typeof candidate.variant === "string"
        ? { os: candidate.os, architecture: candidate.architecture, variant: candidate.variant }
        : { os: candidate.os, architecture: candidate.architecture };
}
function uniquePlatforms(platforms) {
    const unique = new Map();
    for (const platform of platforms) {
        unique.set(`${platform.os}/${platform.architecture}/${platform.variant ?? ""}`, platform);
    }
    return [...unique.values()];
}
