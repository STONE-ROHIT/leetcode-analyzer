// Run this FIRST, before relying on the analyze pipeline:
//   pnpm --filter server exec tsx src/scripts/verifyLeetcodeDetail.ts two-sum
//
// This is the #1 thing flagged throughout this project as needing live
// verification - leetcode-query wraps an undocumented API, and field
// availability/shape can change without notice. This script prints exactly
// what we depend on (metaData, extracted constraints, extracted examples)
// so you can eyeball it against the real problem before trusting the
// pipeline end-to-end.
import { fetchProblemDetail } from "../services/leetcode.js";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: tsx src/scripts/verifyLeetcodeDetail.ts <problem-slug>");
  console.error("Example: tsx src/scripts/verifyLeetcodeDetail.ts two-sum");
  process.exit(1);
}

fetchProblemDetail(slug)
  .then((detail) => {
    console.log("=== metaData (used to build the execution harness) ===");
    console.log(JSON.stringify(detail.metaData, null, 2));

    console.log("\n=== constraints (extracted, should be a short factual line) ===");
    console.log(detail.constraints || "(none extracted - check the regex in services/leetcode.ts)");

    console.log("\n=== examples (extracted input/output pairs) ===");
    console.log(JSON.stringify(detail.examples, null, 2));

    if (!detail.metaData) {
      console.warn("\n⚠ No metaData parsed - execution will be unavailable for this problem until this is fixed.");
    }
    if (!detail.examples.length) {
      console.warn("⚠ No examples extracted - execution will be unavailable for this problem until this is fixed.");
    }
  })
  .catch((err) => {
    console.error("Failed to fetch problem detail:", err);
    process.exit(1);
  });
