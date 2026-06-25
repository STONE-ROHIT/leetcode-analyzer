import "dotenv/config";
import { db } from "../db/client.js";
import { problems } from "../db/schema.js";
import { fetchProblemPage } from "../services/leetcode.js";

async function seed() {
  let skip = 0;
  const limit = 50;
  let total = Infinity;
  let inserted = 0;

  while (skip < total) {
    const page = await fetchProblemPage(skip, limit);
    total = page.total;

    const rows = page.questions
      .filter((q) => !q.paidOnly) // can't fetch detail for premium problems anyway
      .map((q) => ({
        frontendId: parseInt(q.frontendQuestionId, 10),
        slug: q.titleSlug,
        title: q.title,
        difficulty: q.difficulty,
        tags: q.topicTags.map((t) => t.name),
      }))
      .filter((r) => !isNaN(r.frontendId));

    if (rows.length) {
      await db.insert(problems).values(rows).onConflictDoNothing();
      inserted += rows.length;
    }

    console.log(`Seeded ${inserted}/${total}`);
    skip += limit;
    await new Promise((r) => setTimeout(r, 300)); // be polite, don't hammer their API
  }

  console.log("Done.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
