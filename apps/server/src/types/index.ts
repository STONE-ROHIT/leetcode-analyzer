export type Difficulty = "Easy" | "Medium" | "Hard";

// The set of LeetCode parameter/return types our harness generator knows how
// to construct and serialize. This covers the large majority of array,
// string, DP, tree, and linked-list problems. Anything outside this set
// (design/OOP problems like LRUCache, custom Node types, interactive
// problems) is intentionally NOT supported by execution — see
// lib/harness/index.ts for the graceful-degradation path.
export type KnownParamType =
  | "integer"
  | "long"
  | "double"
  | "boolean"
  | "string"
  | "character"
  | "integer[]"
  | "long[]"
  | "double[]"
  | "string[]"
  | "character[]"
  | "integer[][]"
  | "string[][]"
  | "ListNode"
  | "TreeNode";

export interface ProblemParam {
  name: string;
  type: string; // raw type string from LeetCode; checked against KnownParamType at runtime
}

export interface ProblemMetaData {
  name: string;
  params: ProblemParam[];
  return: { type: string };
}

export interface ProblemExample {
  input: string; // raw text, one value per param, newline-separated, in param order
  output: string; // raw text of the expected output literal
}

export type SupportedLanguage = "python" | "cpp" | "java";

export interface JudgeCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
  error: string | null;
  status: string;
}

export interface ExecutionResult {
  available: boolean;
  reason: string | null;
  allPassed: boolean;
  cases: JudgeCaseResult[];
}

export interface AnalysisResult {
  correctness: {
    verdict: "correct" | "incorrect" | "uncertain";
    explanation: string;
  };
  acceptanceLikelihood: {
    verdict: "likely" | "likely-tle" | "unknown";
    reasoning: string;
  };
  complexity: {
    time: string;
    space: string;
    explanation: string;
  };
  codeQuality: {
    notes: string[];
  };
  pattern: string;
  hasOptimizationHint: boolean;
}

export interface AnalyzeRequestBody {
  problemNumber: number;
  language: SupportedLanguage;
  code: string;
}

export interface AnalyzeResponse {
  problem: {
    number: number;
    title: string;
    difficulty: Difficulty;
    tags: string[];
  };
  execution: ExecutionResult;
  analysis: AnalysisResult;
  correctnessHint: string | null;
}

export interface HintRequestBody {
  problemNumber: number;
  language: SupportedLanguage;
  code: string;
}

export interface HintResponse {
  hint: string;
}
