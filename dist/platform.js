/** Parse and normalize a required platform string. */
export function parsePlatform(value) {
    const parts = value.trim().split("/");
    const os = parts[0];
    const architecture = parts[1];
    const variant = parts[2];
    if (!os || !architecture || parts.length > 3) {
        throw new Error(`invalid platform ${JSON.stringify(value)}; expected os/architecture[/variant]`);
    }
    return variant === undefined ? { os, architecture } : { os, architecture, variant };
}
/** Render a normalized OCI platform as a string. */
export function formatPlatform(platform) {
    return platform.variant
        ? `${platform.os}/${platform.architecture}/${platform.variant}`
        : `${platform.os}/${platform.architecture}`;
}
/** Return whether an available platform satisfies the requested platform. */
export function matchesPlatform(available, required) {
    return available.os === required.os
        && available.architecture === required.architecture
        && (required.variant === undefined || available.variant === required.variant);
}
