import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMiniByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const mini = await ctx.db
      .query("minis")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    return mini;
  },
});

export const getAllMinis = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("minis").order("desc").collect();
  },
});

export const createOrUpdateMini = mutation({
  args: {
    date: v.string(),
    grid: v.array(v.array(v.string())),
    acrossClues: v.record(v.string(), v.string()),
    downClues: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("minis")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        grid: args.grid,
        acrossClues: args.acrossClues,
        downClues: args.downClues,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("minis", {
        date: args.date,
        grid: args.grid,
        acrossClues: args.acrossClues,
        downClues: args.downClues,
      });
    }
  },
});

// Public version that doesn't require authentication (for API access with secret key)
export const createOrUpdateMiniPublic = mutation({
  args: {
    date: v.string(),
    grid: v.array(v.array(v.string())),
    acrossClues: v.record(v.string(), v.string()),
    downClues: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("minis")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        grid: args.grid,
        acrossClues: args.acrossClues,
        downClues: args.downClues,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("minis", {
        date: args.date,
        grid: args.grid,
        acrossClues: args.acrossClues,
        downClues: args.downClues,
      });
    }
  },
});

export const deleteMini = mutation({
  args: { id: v.id("minis") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Public version that deletes by date (for API access with secret key)
export const deleteMiniByDate = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("minis")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      throw new Error("Mini not found for this date");
    }
  },
});
