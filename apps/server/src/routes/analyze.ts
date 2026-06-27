import { Router } from "express";
import { getOrEnrichProblem } from "../db/problemRepo.js";
import { isHarnessSupported, generateCases } from "../lib/harness/index.js";
import { runOnJudge0 } from "../services/judge0.js";
import { analyzeSubmission, getOptimizationHint, type AnalysisContext } from "../services/groq.js";
import { analyzeRateLimiter } from "../lib/rateLimiter.js";
import type {
  AnalyzeRequestBody,
  AnalyzeResponse,
  ExecutionResult,
  JudgeCaseResult,
  HintRequestBody,
  HintResponse,
  Difficulty,
  SupportedLanguage,
} from "../types/index.js";
import type { ProblemRow } from "../db/schema.js";

const router = Router();
router.use(analyzeRateLimiter);

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["python", "cpp", "java"];
const MAX_CODE_LENGTH = 20000;

function isValidAnalyzeBody(body: unknown): body is AnalyzeRequestBody {
  const b = body as Partial<AnalyzeRequestBody> | null;
  return (
    typeof b?.problemNumber === "number" &&
    Number.isInteger(b.problemNumber) &&
    typeof b.language === "string" &&
    SUPPORTED_LANGUAGES.includes(b.language as SupportedLanguage) &&
    typeof b.code === "string" &&
    b.code.trim().length > 0 &&
    b.code.length <= MAX_CODE_LENGTH
  );
}

// Tries to empirically verify the submission against the problem's public
// example test cases. Falls back to { available: false, reason } whenever
// the harness can't handle this problem's signature, examples weren't
// extractable, or anything in the execution path throws - the analyze
// route always degrades gracefully rather than failing the request.
async function buildExecutionResult(
  problem: ProblemRow,
  language: SupportedLanguage,
  code: string
): Promise<ExecutionResult> {
  if (!process.env.JUDGE0_BASE_URL) {
    return {
      available: false,
      reason: "Code execution is not enabled in this deployment — the analysis below is powered by the LLM only.",
      allPassed: false,
      cases: [],
    };
  }

  if (!isHarnessSupported(problem.metaData)) {
    return {
      available: false,
      reason:
        "This problem's signature (e.g. a design/multi-method problem, or a parameter type outside the supported set) isn't covered by execution yet. Analysis below is reasoning-only.",
      allPassed: false,
      cases: [],
    };
  }

  if (!problem.examples || problem.examples.length === 0) {
    return {
      available: false,
      reason: "Could not extract example test cases for this problem. Analysis below is reasoning-only.",
      allPassed: false,
      cases: [],
    };
  }

  try {
    const generated = generateCases(problem.metaData!, problem.examples, language, code);
    const cases: JudgeCaseResult[] = [];

    for (const gc of generated) {
      const result = await runOnJudge0(gc.source, language);
      const actual = (result.stdout ?? "").trim();
      const passed = result.statusDescription === "Accepted" && actual === gc.expectedOutputJson;

      cases.push({
        input: gc.rawInput,
        expectedOutput: gc.rawOutput,
        actualOutput: result.stdout?.trim() || result.stderr || result.compileOutput,
        passed,
        error: passed ? null : result.compileOutput || result.stderr || null,
        status: result.statusDescription,
      });
    }

    return { available: true, reason: null, allPassed: cases.every((c) => c.passed), cases };
  } catch (err) {
    return {
      available: false,
      reason: `Execution harness failed: ${err instanceof Error ? err.message : "unknown error"}. Analysis below is reasoning-only.`,
      allPassed: false,
      cases: [],
    };
  }
}

function toAnalysisContext(problem: ProblemRow, language: SupportedLanguage, code: string, execution: ExecutionResult): AnalysisContext {
  return {
    problem: {
      title: problem.title,
      difficulty: problem.difficulty as Difficulty,
      tags: problem.tags,
      constraints: problem.constraints ?? "",
    },
    language,
    code,
    execution,
  };
}

router.post("/", async (req, res) => {
  if (!isValidAnalyzeBody(req.body)) {
    return res.status(400).json({
      error: "Body must include problemNumber (integer), language (python|cpp|java), and non-empty code.",
    });
  }

  const { problemNumber, language, code } = req.body;

  const problem = await getOrEnrichProblem(problemNumber);
  if (!problem) {
    return res.status(404).json({
      error: `No problem #${problemNumber}. Run the seed script if it's a new/recent problem.`,
    });
  }

  try {
    const execution = await buildExecutionResult(problem, language, code);
    const { analysis, correctnessHint } = await analyzeSubmission(toAnalysisContext(problem, language, code, execution));

    const response: AnalyzeResponse = {
      problem: {
        number: problem.frontendId,
        title: problem.title,
        difficulty: problem.difficulty as Difficulty,
        tags: problem.tags,
      },
      execution,
      analysis,
      correctnessHint,
    };

    res.json(response);
  } catch (err) {
    console.error("Analyze pipeline failed:", err);
    res.status(502).json({ error: "Analysis failed - the AI or execution backend may be temporarily unavailable. Try again shortly." });
  }
});

router.post("/hint", async (req, res) => {
  const body = req.body as Partial<HintRequestBody> | null;
  if (
    typeof body?.problemNumber !== "number" ||
    typeof body.language !== "string" ||
    !SUPPORTED_LANGUAGES.includes(body.language as SupportedLanguage) ||
    typeof body.code !== "string" ||
    body.code.trim().length === 0
  ) {
    return res.status(400).json({ error: "Body must include problemNumber, language, and code." });
  }

  const { problemNumber, language, code } = body as HintRequestBody;

  const problem = await getOrEnrichProblem(problemNumber);
  if (!problem) {
    return res.status(404).json({ error: `No problem #${problemNumber}.` });
  }

  try {
    const execution = await buildExecutionResult(problem, language, code);
    const hint = await getOptimizationHint(toAnalysisContext(problem, language, code, execution));
    const response: HintResponse = { hint };
    res.json(response);
  } catch (err) {
    console.error("Hint pipeline failed:", err);
    res.status(502).json({ error: "Hint generation failed - try again shortly." });
  }
});

export default router;
