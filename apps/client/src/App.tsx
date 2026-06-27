import { useState } from "react";
import ProblemForm from "./components/ProblemForm.js";
import AnalysisResult from "./components/AnalysisResult.js";
import LoadingState from "./components/LoadingState.js";
import { analyzeSubmission } from "./lib/api.js";
import type { AnalyzeResponse, SupportedLanguage } from "./types/index.js";

type Status = "idle" | "loading" | "success" | "error";

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<{
    problemNumber: number;
    language: SupportedLanguage;
    code: string;
  } | null>(null);

  async function handleSubmit(params: { problemNumber: number; language: SupportedLanguage; code: string }) {
    setStatus("loading");
    setErrorMessage(null);
    setLastSubmission(params);
    try {
      const response = await analyzeSubmission(params);
      setResult(response);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="brand">
          <span className="brand-mark">{"{ }"}</span>
          <h1>verdict</h1>
        </div>
        <p className="tagline">
          Paste a LeetCode problem number and your code. No account, no signup - just a judge-style read on
          correctness, complexity vs. constraints, and the pattern you used.
        </p>
      </header>

      <main className="page-main">
        <ProblemForm onSubmit={handleSubmit} disabled={status === "loading"} />

        {status === "loading" && <LoadingState />}

        {status === "error" && errorMessage && (
          <div className="error-banner" role="alert">
            <strong>Couldn't complete the analysis.</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {status === "success" && result && lastSubmission && (
          <AnalysisResult result={result} submission={lastSubmission} />
        )}
      </main>

      <footer className="page-footer">
        <span>Execution covers the problem's public examples only - not the full hidden judge suite.</span>
      </footer>
    </div>
  );
}
