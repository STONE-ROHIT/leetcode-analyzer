import { LeetCode } from "leetcode-query";
import type { ProblemMetaData, ProblemExample } from "../types/index.js";

const lc = new LeetCode();

const PROBLEMSET_QUERY = `
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      difficulty
      frontendQuestionId: questionFrontendId
      paidOnly: isPaidOnly
      title
      titleSlug
      topicTags { name slug }
    }
  }
}`;

export interface ProblemListItem {
  difficulty: string;
  frontendQuestionId: string;
  paidOnly: boolean;
  title: string;
  titleSlug: string;
  topicTags: { name: string }[];
}

export async function fetchProblemPage(skip: number, limit = 50): Promise<{ total: number; questions: ProblemListItem[] }> {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: PROBLEMSET_QUERY,
      variables: { categorySlug: "", skip, limit, filters: {} },
    }),
  });
  if (!res.ok) {
    throw new Error(`LeetCode problemset request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    data: { problemsetQuestionList: { total: number; questions: ProblemListItem[] } };
  };
  return json.data.problemsetQuestionList;
}

export interface ProblemDetail {
  constraints: string;
  metaData: ProblemMetaData | null;
  examples: ProblemExample[];
}

// VERIFY-FIRST: this calls leetcode-query's .problem(slug), which wraps an
// undocumented endpoint. Run `tsx src/scripts/verifyLeetcodeDetail.ts
// two-sum` (see scripts folder) before relying on this - field availability
// on an unofficial API can shift without notice.
export async function fetchProblemDetail(slug: string): Promise<ProblemDetail> {
  const detail = await lc.problem(slug);

  let metaData: ProblemMetaData | null = null;
  try {
    if (detail.metaData) {
      metaData = typeof detail.metaData === "string" ? JSON.parse(detail.metaData) : (detail.metaData as unknown as ProblemMetaData);
    }
  } catch {
    metaData = null;
  }

  const content = detail.content ?? "";
  return {
    constraints: extractConstraints(content),
    metaData,
    examples: extractExamples(content),
  };
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&le;/g, "<=")
    .replace(/&ge;/g, ">=")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pulls ONLY the constraints line(s) out of the problem's HTML. Never
// stores or returns the surrounding prose problem description.
export function extractConstraints(contentHtml: string): string {
  const match = contentHtml.match(/Constraints:?<\/[a-z]+>([\s\S]*?)(<p[ >]|$)/i);
  if (!match) return "";
  return stripHtml(match[1]);
}

// Pulls Input:/Output: literal pairs out of each <pre> example block.
// Deliberately stops before "Explanation:" - we want the short factual
// values, not the prose walkthrough. Best-effort: LeetCode's HTML
// formatting isn't perfectly uniform across ~3000 problems, so a handful
// of problems may yield zero examples here. Those gracefully fall back to
// LLM-only analysis (see lib/harness - execution requires examples).
export function extractExamples(contentHtml: string): ProblemExample[] {
  const examples: ProblemExample[] = [];
  const preBlocks = contentHtml.match(/<pre>([\s\S]*?)<\/pre>/gi) ?? [];

  for (const block of preBlocks) {
    const inputMatch = block.match(/Input:?<\/[a-z]+>\s*([\s\S]*?)(?=<strong|<\/pre>)/i);
    const outputMatch = block.match(/Output:?<\/[a-z]+>\s*([\s\S]*?)(?=<strong|<\/pre>)/i);
    if (!inputMatch || !outputMatch) continue;

    const input = stripHtml(inputMatch[1]);
    const output = stripHtml(outputMatch[1]);
    if (input && output) examples.push({ input, output });
  }
  return examples;
}
