import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  minis: defineTable({
    date: v.string(), // Format: YYYY-MM-DD
    grid: v.array(v.array(v.string())), // 5x5 grid of letters
    acrossClues: v.record(v.string(), v.string()), // e.g. {"1": "English muffin topper", "5": "Soup with a tonkotsu variety"}
    downClues: v.record(v.string(), v.string()),
  }).index("by_date", ["date"]),

  audioFiles: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedAt: v.string(), // ISO timestamp
  }).index("by_fileName", ["fileName"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
