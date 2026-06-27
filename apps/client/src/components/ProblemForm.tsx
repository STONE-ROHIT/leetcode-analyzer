import { useState, type FormEvent } from "react";
import type { SupportedLanguage } from "../types/index.js";

interface Props {
  onSubmit: (params: { problemNumber: number; language: SupportedLanguage; code: string }) => void;
  disabled: boolean;
}

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
];

export default function ProblemForm({ onSubmit, disabled }: Props) {
  const [problemNumber, setProblemNumber] = useState("");
  const [language, setLanguage] = useState<SupportedLanguage>("python");
  const [code, setCode] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const parsed = parseInt(problemNumber, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setValidationError("Enter the problem number shown on LeetCode, e.g. 200 for Number of Islands.");
      return;
    }
    if (code.trim().length === 0) {
      setValidationError("Paste your solution code first.");
      return;
    }

    setValidationError(null);
    onSubmit({ problemNumber: parsed, language, code });
  }

  return (
    <form className="problem-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="field field-number">
          <label htmlFor="problem-number">Problem #</label>
          <input
            id="problem-number"
            type="text"
            inputMode="numeric"
            placeholder="200"
            value={problemNumber}
            onChange={(e) => setProblemNumber(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="field field-language">
          <label htmlFor="language">Language</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            disabled={disabled}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="code">Your code</label>
        <textarea
          id="code"
          className="code-input"
          placeholder={"class Solution:\n    def twoSum(self, nums, target):\n        ..."}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={disabled}
          spellCheck={false}
          rows={14}
        />
      </div>

      {validationError && (
        <p className="field-error" role="alert">
          {validationError}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={disabled}>
        {disabled ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}
