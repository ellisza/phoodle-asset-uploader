import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFileMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("audioFiles", {
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      size: args.size,
      uploadedAt: new Date().toISOString(),
    });
  },
});

export const getAllAudioFiles = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("audioFiles").order("desc").collect();
    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});

export const getAudioFileByName = query({
  args: { fileName: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("audioFiles")
      .withIndex("by_fileName", (q) => q.eq("fileName", args.fileName))
      .first();
    if (!file) return null;
    return {
      ...file,
      url: await ctx.storage.getUrl(file.storageId),
    };
  },
});

export const deleteAudioFile = mutation({
  args: { id: v.id("audioFiles") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id);
    if (file) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(args.id);
    }
  },
});

export const deleteAudioFileByName = mutation({
  args: { fileName: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("audioFiles")
      .withIndex("by_fileName", (q) => q.eq("fileName", args.fileName))
      .first();
    if (file) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    } else {
      throw new Error("Audio file not found");
    }
  },
});
