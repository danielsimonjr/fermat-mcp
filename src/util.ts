/** Shared helpers for MCP tool results. */

export function textResult(data: unknown): {
  content: [{ type: "text"; text: string }];
} {
  const text =
    typeof data === "string" ? data : JSON.stringify(data, jsonReplacer, 2);
  return { content: [{ type: "text", text }] };
}

export function errorResult(message: string): {
  content: [{ type: "text"; text: string }];
  isError: true;
} {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function imageResult(
  svg: string,
  mimeType: "image/svg+xml" | "image/png" = "image/svg+xml",
): {
  content: [{ type: "image"; data: string; mimeType: string }];
} {
  return {
    content: [
      {
        type: "image",
        data: Buffer.from(svg, "utf8").toString("base64"),
        mimeType,
      },
    ],
  };
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

/** Serialize nested numeric arrays, converting complex-ish objects to strings. */
export function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toJsonSafe(v);
    }
    return out;
  }
  return String(value);
}
