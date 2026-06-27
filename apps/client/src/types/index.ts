export type SupportedLanguage = "python" | "cpp" | "java";
export type Difficulty = "Easy" | "Medium" | "Hard";

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

export interface ApiError {
  error: string;
}
