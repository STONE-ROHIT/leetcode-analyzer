import rateLimit from "express-rate-limit";

// No login means no per-user quota to lean on - this is the only thing
// standing between the public internet and your Groq/Judge0 free-tier caps.
// 8 requests / 10 minutes per IP is generous for a real user trying the
// tool, and tight enough that one bad actor can't burn your daily Groq
// quota (free tier: ~1,000-14,400 req/day depending on model) by themselves.
export const analyzeRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many analysis requests from this IP. Please wait a few minutes and try again.",
  },
});

// Problem lookups are cheap (cached after first fetch) - looser limit.
export const problemsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
