import type { AnalyzeResponse, ApiError, SupportedLanguage } from "../types/index.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export async function analyzeSubmission(params: {
  problemNumber: number;
  language: SupportedLanguage;
  code: string;
}): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow<AnalyzeResponse>(res);
}

export async function fetchOptimizationHint(params: {
  problemNumber: number;
  language: SupportedLanguage;
  code: string;
}): Promise<{ hint: string }> {
  const res = await fetch(`${API_BASE}/api/analyze/hint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow<{ hint: string }>(res);
}
