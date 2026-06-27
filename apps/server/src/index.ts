import "dotenv/config";
import express from "express";
import cors from "cors";
import problemsRouter from "./routes/problems.js";
import analyzeRouter from "./routes/analyze.js";

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : undefined; // undefined = allow all (fine for local dev only)

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/problems", problemsRouter);
app.use("/api/analyze", analyzeRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
