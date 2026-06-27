import { Router } from "express";
import { getOrEnrichProblem } from "../db/problemRepo.js";
import { problemsRateLimiter } from "../lib/rateLimiter.js";

const router = Router();
router.use(problemsRateLimiter);

router.get("/:number", async (req, res) => {
  const frontendId = parseInt(req.params.number, 10);
  if (isNaN(frontendId)) {
    return res.status(400).json({ error: "Problem number must be an integer" });
  }

  const row = await getOrEnrichProblem(frontendId);
  if (!row) {
    return res.status(404).json({
      error: `No problem #${frontendId}. Run the seed script if it's a new/recent problem.`,
    });
  }

  res.json({
    number: row.frontendId,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty,
    tags: row.tags,
    constraints: row.constraints,
  });
});

export default router;
