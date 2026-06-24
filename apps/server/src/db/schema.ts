import { pgTable, integer, varchar, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import type { ProblemMetaData, ProblemExample } from "../types/index.js";

// Single table: a lazily-enriched cache of LeetCode problem metadata.
// Bulk fields (slug/title/difficulty/tags) are populated by the seed script
// for ALL problems. Detail fields (constraints/metaData/examples) are
// populated lazily, on first real request for that problem, to avoid an
// unnecessary ~3000-request crawl on day one.
//
// Deliberately NOT stored: the full HTML problem description. We only ever
// extract the short, structural pieces (constraints line, example
// input/output literals) needed to do the analysis - never the prose
// problem statement itself.
export const problems = pgTable("problems", {
  frontendId: integer("frontend_id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),

  constraints: text("constraints"),
  metaData: jsonb("meta_data").$type<ProblemMetaData | null>(),
  examples: jsonb("examples").$type<ProblemExample[] | null>(),
  detailsFetchedAt: timestamp("details_fetched_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProblemRow = typeof problems.$inferSelect;
export type NewProblemRow = typeof problems.$inferInsert;
