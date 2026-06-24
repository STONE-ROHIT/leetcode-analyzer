import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { problems, type ProblemRow } from "./schema.js";
import { fetchProblemDetail } from "../services/leetcode.js";

export async function getOrEnrichProblem(frontendId: number): Promise<ProblemRow | null> {
  const [row] = await db.select().from(problems).where(eq(problems.frontendId, frontendId));
  if (!row) return null;

  if (!row.detailsFetchedAt) {
    try {
      const detail = await fetchProblemDetail(row.slug);
      await db
        .update(problems)
        .set({
          constraints: detail.constraints,
          metaData: detail.metaData,
          examples: detail.examples,
          detailsFetchedAt: new Date(),
        })
        .where(eq(problems.frontendId, frontendId));

      row.constraints = detail.constraints;
      row.metaData = detail.metaData;
      row.examples = detail.examples;
      row.detailsFetchedAt = new Date();
    } catch (err) {
      // Don't fail the whole request if live enrichment fails - return
      // what we have. The analyze route gracefully degrades to LLM-only
      // reasoning when metaData/examples are still missing.
      console.error(`Failed to enrich problem #${frontendId}:`, err);
    }
  }

  return row;
}
