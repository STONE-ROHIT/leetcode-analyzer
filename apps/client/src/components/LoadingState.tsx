export default function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-dot" />
      <span className="loading-dot" />
      <span className="loading-dot" />
      <p>Running your code against the public examples, then asking the model to reason about it...</p>
    </div>
  );
}
