import Groq from "groq-sdk";
import type { AnalysisResult, ExecutionResult, SupportedLanguage, Difficulty } from "../types/index.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq deprecated llama-3.3-70b-versatile in June 2026; this is their
// current recommended general-purpose replacement. If this model ID 404s,
// check https://console.groq.com/docs/deprecations or hit
// GET https://api.groq.com/openai/v1/models - Groq's catalog has moved
// more than once in the last year, this is the #1 thing to re-verify.
const MODEL = "openai/gpt-oss-120b";

export interface AnalysisContext {
  problem: {
    title: string;
    difficulty: Difficulty;
    tags: string[];
    constraints: string;
  };
  language: SupportedLanguage;
  code: string;
  execution: ExecutionResult;
}

interface RawAnalysisResponse {
  correctness: { verdict: "correct" | "incorrect" | "uncertain"; explanation: string };
  acceptanceLikelihood: { verdict: "likely" | "likely-tle" | "unknown"; reasoning: string };
  complexity: { time: string; space: string; explanation: string };
  codeQuality: { notes: string[] };
  pattern: string;
  hasOptimizationHint: boolean;
  correctnessHint: string | null;
}

const SYSTEM_PROMPT = `You are a competitive-programming code reviewer embedded in a tool used by ICPC/LeetCode-level programmers preparing for SDE interviews. You analyze ONE code submission against ONE LeetCode-style problem and return STRICT JSON matching this exact shape, no prose outside the JSON:

{
  "correctness": { "verdict": "correct" | "incorrect" | "uncertain", "explanation": string },
  "acceptanceLikelihood": { "verdict": "likely" | "likely-tle" | "unknown", "reasoning": string },
  "complexity": { "time": string, "space": string, "explanation": string },
  "codeQuality": { "notes": string[] },
  "pattern": string,
  "hasOptimizationHint": boolean,
  "correctnessHint": string | null
}

Rules:
- If execution results against the problem's public examples are provided and ALL passed, treat that as strong (not absolute - examples aren't the full hidden judge suite) evidence of correctness. If ANY failed, the verdict is "incorrect" - explain which case and why, citing the actual stdout/expected diff given.
- If no execution results are available, reason from the code and problem description alone, set verdict to "uncertain" unless you are very confident, and say explicitly in the explanation that this is reasoning-only, not execution-verified.
- "acceptanceLikelihood" must reason about the code's time complexity against the problem's stated constraints (e.g. n <= 10^5 generally rules out O(n^2)). Use "likely-tle" when correctness looks fine but complexity will likely exceed limits at the upper constraint bound. Be specific in "reasoning" - cite the actual bound and the actual complexity, don't hand-wave.
- "pattern" is the core technique in a few words, e.g. "Depth-First Search", "Sliding Window", "Dynamic Programming - 1D", "Inorder Tree Traversal". Pick the most specific accurate label.
- "codeQuality.notes" is 2-4 short, specific, actionable notes (naming, structure, edge-case handling, idiomatic-ness for the language). Not generic praise.
- "hasOptimizationHint" is true only if a meaningfully better-complexity approach exists (not micro-optimizations).
- "correctnessHint" is ONLY populated when correctness.verdict is "incorrect". It must be a Socratic nudge toward the bug (what category of input breaks it, or what invariant is violated) - NEVER the fix, NEVER corrected code, NEVER the full working approach. One or two sentences.
- If correctness.verdict is "correct" or "uncertain", correctnessHint must be null.
- Output ONLY the JSON object. No markdown fences, no commentary outside the JSON.`;

function buildUserPrompt(ctx: AnalysisContext): string {
  const execSummary = ctx.execution.available
    ? ctx.execution.cases
        .map(
          (c, i) =>
            `Example ${i + 1}: input=${c.input} | expected=${c.expectedOutput} | actual=${c.actualOutput ?? "(none)"} | status=${c.status} | passed=${c.passed}`
        )
        .join("\n")
    : `Not available - ${ctx.execution.reason}. Reason purely from the code and problem description.`;

  return `Problem: ${ctx.problem.title} (${ctx.problem.difficulty})
Tags: ${ctx.problem.tags.join(", ")}
Constraints: ${ctx.problem.constraints || "not extracted"}

Language: ${ctx.language}

Submitted code:
\`\`\`${ctx.language}
${ctx.code}
\`\`\`

Execution results against public examples:
${execSummary}`;
}

export async function analyzeSubmission(
  ctx: AnalysisContext
): Promise<{ analysis: AnalysisResult; correctnessHint: string | null }> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(ctx) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned an empty response");

  let parsed: RawAnalysisResponse;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Groq response was not valid JSON: ${raw.slice(0, 200)}`);
  }

  const analysis: AnalysisResult = {
    correctness: parsed.correctness,
    acceptanceLikelihood: parsed.acceptanceLikelihood,
    complexity: parsed.complexity,
    codeQuality: parsed.codeQuality,
    pattern: parsed.pattern,
    hasOptimizationHint: parsed.hasOptimizationHint,
  };

  return { analysis, correctnessHint: parsed.correctnessHint ?? null };
}

const OPTIMIZATION_HINT_SYSTEM_PROMPT = `You are a competitive-programming mentor. The user's code is already correct, but a meaningfully better-complexity solution exists. Give ONE short Socratic hint (1-3 sentences) that points toward the better approach or the key insight/data structure that unlocks it - WITHOUT naming the algorithm outright, without pseudocode, and without corrected code. Make them take the next step of thinking themselves. Respond with plain text only, no JSON, no markdown.`;

export async function getOptimizationHint(ctx: AnalysisContext): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: OPTIMIZATION_HINT_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(ctx) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Groq returned an empty response");
  return text.trim();
}
