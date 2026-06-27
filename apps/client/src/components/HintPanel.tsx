import { useState } from "react";
import { fetchOptimizationHint } from "../lib/api.js";
import type { SupportedLanguage } from "../types/index.js";

interface Props {
  problemNumber: number;
  language: SupportedLanguage;
  code: string;
}

type HintStatus = "idle" | "loading" | "loaded" | "error";

export default function HintPanel({ problemNumber, language, code }: Props) {
  const [status, setStatus] = useState<HintStatus>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestHint() {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetchOptimizationHint({ problemNumber, language, code });
      setHint(response.hint);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch a hint. Try again.");
      setStatus("error");
    }
  }

  return (
    <div className="hint-panel">
      <div className="hint-panel-header">
        <span className="hint-panel-title">A better-complexity approach exists</span>
        {status === "idle" && (
          <button type="button" className="btn-secondary" onClick={handleRequestHint}>
            Show a hint
          </button>
        )}
      </div>

      {status === "loading" && <p className="hint-loading">Thinking of a nudge, not the answer...</p>}

      {status === "loaded" && hint && (
        <p className="hint-text">
          <span className="hint-label">Hint —</span> {hint}
        </p>
      )}

      {status === "error" && error && (
        <div className="hint-error">
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={handleRequestHint}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
