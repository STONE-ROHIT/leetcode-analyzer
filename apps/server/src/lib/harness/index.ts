import type { ProblemMetaData, ProblemExample, SupportedLanguage } from "../../types/index.js";
import { parseAssignments, parseLiteral, canonicalJson } from "./parse.js";
import { generatePython } from "./generatePython.js";
import { generateCpp } from "./generateCpp.js";
import { generateJava } from "./generateJava.js";

const KNOWN_TYPES = new Set([
  "integer", "long", "double", "boolean", "string", "character",
  "integer[]", "long[]", "double[]", "string[]", "character[]",
  "integer[][]", "string[][]",
  "ListNode", "TreeNode",
]);

// True only if every param type AND the return type are in our supported
// set. Design/OOP problems (LRUCache-style, multiple methods), custom
// Node types, and anything else outside KNOWN_TYPES return false here -
// those problems skip execution entirely and fall back to LLM-only
// reasoning. This is a deliberate scope boundary, not a bug.
export function isHarnessSupported(metaData: ProblemMetaData | null | undefined): boolean {
  if (!metaData) return false;
  const types = [...metaData.params.map((p) => p.type), metaData.return.type];
  return types.every((t) => KNOWN_TYPES.has(t));
}

export interface GeneratedCase {
  source: string;
  expectedOutputJson: string;
  rawInput: string;
  rawOutput: string;
}

export function generateCases(
  metaData: ProblemMetaData,
  examples: ProblemExample[],
  language: SupportedLanguage,
  userCode: string
): GeneratedCase[] {
  return examples.map((example) => {
    const assignments = parseAssignments(example.input);

    const args = metaData.params.map((param) => {
      const raw = assignments[param.name];
      if (raw === undefined) {
        throw new Error(`Could not locate value for param "${param.name}" in example input: ${example.input}`);
      }
      return parseLiteral(raw);
    });

    const expectedValue = parseLiteral(example.output);
    const expectedOutputJson = canonicalJson(expectedValue);

    let source: string;
    if (language === "python") source = generatePython(metaData, args, userCode);
    else if (language === "cpp") source = generateCpp(metaData, args, userCode);
    else source = generateJava(metaData, args, userCode);

    return { source, expectedOutputJson, rawInput: example.input, rawOutput: example.output };
  });
}
