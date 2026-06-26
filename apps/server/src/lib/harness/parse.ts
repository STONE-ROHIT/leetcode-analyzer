// Splits on a separator while respecting [...] / (...) nesting and "..."
// strings, so "nums = [1,2,3], target = 5" splits into two parts, not five.
export function splitTopLevel(input: string, separator = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"' && input[i - 1] !== "\\") inString = !inString;
    if (!inString) {
      if (ch === "[" || ch === "(") depth++;
      if (ch === "]" || ch === ")") depth--;
    }
    if (ch === separator && depth === 0 && !inString) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}

// "nums = [1,2,3], target = 5" -> { nums: "[1,2,3]", target: "5" }
export function parseAssignments(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of splitTopLevel(input)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    result[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return result;
}

// Parses a single LeetCode-style literal ("[1,2,null,3]", "\"abc\"", "9",
// "true") into a real JS value. Recurses for nested arrays.
export function parseLiteral(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner === "") return [];
    return splitTopLevel(inner).map(parseLiteral);
  }
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  // Bare/unquoted string - the common case in LeetCode's raw example format.
  return trimmed;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}
