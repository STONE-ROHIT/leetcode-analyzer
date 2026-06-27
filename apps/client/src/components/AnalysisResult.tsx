import HintPanel from "./HintPanel.js";
import type { AnalyzeResponse, SupportedLanguage } from "../types/index.js";

interface Props {
  result: AnalyzeResponse;
  submission: { problemNumber: number; language: SupportedLanguage; code: string };
}

const DIFFICULTY_CLASS: Record<string, string> = {
  Easy: "difficulty-easy",
  Medium: "difficulty-medium",
  Hard: "difficulty-hard",
};

function verdictDisplay(verdict: "correct" | "incorrect" | "uncertain") {
  if (verdict === "correct") return { label: "ACCEPTED", className: "verdict-pass" };
  if (verdict === "incorrect") return { label: "WRONG ANSWER", className: "verdict-fail" };
  return { label: "UNVERIFIED", className: "verdict-neutral" };
}

export default function AnalysisResult({ result, submission }: Props) {
  const { problem, execution, analysis, correctnessHint } = result;
  const verdict = verdictDisplay(analysis.correctness.verdict);
  const showOptimizationHint = analysis.hasOptimizationHint && analysis.correctness.verdict === "correct";

  return (
    <section className="result" aria-live="polite">
      <div className="result-header">
        <div>
          <h2>
            #{problem.number} {problem.title}
          </h2>
          <div className="tag-row">
            <span className={`difficulty-badge ${DIFFICULTY_CLASS[problem.difficulty] ?? ""}`}>{problem.difficulty}</span>
            {problem.tags.map((tag) => (
              <span key={tag} className="topic-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className={`verdict-chip ${verdict.className}`}>{verdict.label}</div>
      </div>

      <p className="correctness-explanation">{analysis.correctness.explanation}</p>

      {correctnessHint && (
        <div className="hint-panel hint-panel-correctness">
          <span className="hint-label">Hint —</span> {correctnessHint}
        </div>
      )}

      <div className="result-grid">
        <div className="result-card">
          <h3>Acceptance likelihood</h3>
          <span className={`pill pill-${analysis.acceptanceLikelihood.verdict}`}>
            {analysis.acceptanceLikelihood.verdict === "likely" && "Likely accepted"}
            {analysis.acceptanceLikelihood.verdict === "likely-tle" && "Likely TLE"}
            {analysis.acceptanceLikelihood.verdict === "unknown" && "Unknown"}
          </span>
          <p>{analysis.acceptanceLikelihood.reasoning}</p>
        </div>

        <div className="result-card">
          <h3>Complexity</h3>
          <div className="complexity-row">
            <span className="complexity-badge">Time {analysis.complexity.time}</span>
            <span className="complexity-badge">Space {analysis.complexity.space}</span>
          </div>
          <p>{analysis.complexity.explanation}</p>
        </div>

        <div className="result-card">
          <h3>Pattern</h3>
          <span className="pattern-tag">{analysis.pattern}</span>
        </div>

        <div className="result-card">
          <h3>Code quality</h3>
          <ul className="quality-notes">
            {analysis.codeQuality.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="execution-section">
        <h3>Execution against public examples</h3>
        {!execution.available ? (
          <p className="execution-unavailable">{execution.reason}</p>
        ) : (
          <ul className="case-list">
            {execution.cases.map((c, i) => (
              <li key={i} className={`case-item ${c.passed ? "case-pass" : "case-fail"}`}>
                <div className="case-item-header">
                  <span className="case-status">{c.passed ? "PASS" : "FAIL"}</span>
                  <span className="case-judge-status">{c.status}</span>
                </div>
                <div className="case-detail">
                  <code>input: {c.input}</code>
                  <code>expected: {c.expectedOutput}</code>
                  <code>got: {c.actualOutput ?? "(no output)"}</code>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showOptimizationHint && (
        <HintPanel problemNumber={submission.problemNumber} language={submission.language} code={submission.code} />
      )}
    </section>
  );
}
