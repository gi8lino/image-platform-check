/** Collect common container image references from YAML text without evaluating templates. */
export function collectImagesFromYaml(source) {
    const lines = source.split(/\r?\n/);
    const images = new Set();
    collectScalarImages(lines, images);
    collectImageObjects(lines, images);
    collectKustomizeImages(lines, images);
    return images;
}
/** Return image references present in the head set but absent from the base set. */
export function addedImages(base, head) {
    return [...head].filter((image) => !base.has(image)).sort();
}
function collectScalarImages(lines, images) {
    for (const line of lines) {
        const match = line.match(/^\s*(?:-\s*)?image:\s*(.+?)\s*$/);
        if (!match?.[1]) {
            continue;
        }
        const value = yamlScalar(match[1]);
        if (value !== undefined) {
            addImage(images, value);
        }
    }
}
function collectImageObjects(lines, images) {
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        const match = line.match(/^(\s*)image:\s*(?:#.*)?$/);
        if (!match) {
            continue;
        }
        const indent = match[1]?.length ?? 0;
        const fields = childFields(lines, index + 1, indent);
        const repository = fields.get("repository") ?? fields.get("name");
        if (!repository) {
            continue;
        }
        const digest = fields.get("digest");
        const tag = fields.get("tag");
        addImage(images, digest
            ? `${repository}@${digest}`
            : tag
                ? `${repository}:${tag}`
                : repository);
    }
}
function collectKustomizeImages(lines, images) {
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        const match = line.match(/^(\s*)images:\s*(?:#.*)?$/);
        if (!match) {
            continue;
        }
        const blockIndent = match[1]?.length ?? 0;
        let item;
        for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
            const current = lines[cursor] ?? "";
            if (!current.trim() || current.trimStart().startsWith("#")) {
                continue;
            }
            const indent = leadingSpaces(current);
            if (indent <= blockIndent) {
                break;
            }
            const itemStart = current.match(/^\s*-\s*([A-Za-z][\w.-]*):\s*(.*?)\s*$/);
            if (itemStart) {
                flushKustomizeItem(item, images);
                item = new Map();
                const value = yamlScalar(itemStart[2] ?? "");
                if (value !== undefined) {
                    item.set(itemStart[1] ?? "", value);
                }
                continue;
            }
            const field = current.match(/^\s+([A-Za-z][\w.-]*):\s*(.*?)\s*$/);
            if (item && field) {
                const value = yamlScalar(field[2] ?? "");
                if (value !== undefined) {
                    item.set(field[1] ?? "", value);
                }
            }
        }
        flushKustomizeItem(item, images);
    }
}
function childFields(lines, start, parentIndent) {
    const fields = new Map();
    let expectedIndent;
    for (let index = start; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        if (!line.trim() || line.trimStart().startsWith("#")) {
            continue;
        }
        const indent = leadingSpaces(line);
        if (indent <= parentIndent) {
            break;
        }
        expectedIndent ??= indent;
        if (indent !== expectedIndent) {
            continue;
        }
        const field = line.match(/^\s*([A-Za-z][\w.-]*):\s*(.*?)\s*$/);
        if (!field) {
            continue;
        }
        const value = yamlScalar(field[2] ?? "");
        if (value !== undefined) {
            fields.set(field[1] ?? "", value);
        }
    }
    return fields;
}
function flushKustomizeItem(item, images) {
    if (!item) {
        return;
    }
    const repository = item.get("newName") ?? item.get("name");
    if (!repository) {
        return;
    }
    const digest = item.get("digest");
    const tag = item.get("newTag");
    addImage(images, digest
        ? `${repository}@${digest}`
        : tag
            ? `${repository}:${tag}`
            : repository);
}
function yamlScalar(raw) {
    let value = raw.trim();
    if (!value || value === "|" || value === ">") {
        return undefined;
    }
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).trim();
    }
    else {
        value = value.replace(/\s+#.*$/, "").trim();
    }
    return value || undefined;
}
function addImage(images, value) {
    const normalized = value.trim();
    if (!normalized ||
        normalized.includes("{{") ||
        normalized.includes("}}") ||
        normalized.includes("${")) {
        return;
    }
    images.add(normalized);
}
function leadingSpaces(value) {
    return value.match(/^\s*/)?.[0].length ?? 0;
}
