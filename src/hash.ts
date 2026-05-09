import { createHash } from "node:crypto";

export function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

export function shortHash(value: unknown, length = 16): string {
  return createHash("sha256").update(stableJson(value)).digest("hex").slice(0, length);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }

  return value;
}
