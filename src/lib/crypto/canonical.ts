/**
 * Canonical JSON serialization (RFC 8785 compliant)
 * Ensures deterministic string representation regardless of key insertion order.
 */

export function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalStringify(item)).join(",") + "]";
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys
    .filter((key) => (obj as Record<string, unknown>)[key] !== undefined)
    .map((key) => {
      const val = (obj as Record<string, unknown>)[key];
      return JSON.stringify(key) + ":" + canonicalStringify(val);
    });

  return "{" + pairs.join(",") + "}";
}
