import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const SECRET_KEY = "Bi7eEfMpVimsvRZBB8gLGyfnjuueKpVodU";

// Middleware to check secret key
function validateSecretKey(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  const secretKey = request.headers.get("X-Secret-Key");
  
  // Check for secret key in Authorization header (Bearer token format)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === SECRET_KEY;
  }
  
  // Check for secret key in X-Secret-Key header
  if (secretKey === SECRET_KEY) {
    return true;
  }
  
  // Check for secret key in query parameters
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === SECRET_KEY;
}

// Get mini crossword by date
http.route({
  path: "/api/mini",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Validate secret key
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    
    if (!date) {
      return new Response(JSON.stringify({ error: "Date parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const mini = await ctx.runQuery(api.minis.getMiniByDate, { date });
      
      if (!mini) {
        return new Response(JSON.stringify({ error: "Mini not found for this date" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(mini), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Get all minis
http.route({
  path: "/api/minis",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Validate secret key
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const minis = await ctx.runQuery(api.minis.getAllMinis);
      
      return new Response(JSON.stringify(minis), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Create or update mini crossword
http.route({
  path: "/api/mini",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Validate secret key
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { date, grid, acrossClues, downClues } = body;

      if (!date || !grid || !acrossClues || !downClues) {
        return new Response(JSON.stringify({ error: "Missing required fields: date, grid, acrossClues, downClues" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const miniId = await ctx.runMutation(api.minis.createOrUpdateMiniPublic, {
        date,
        grid,
        acrossClues,
        downClues,
      });

      return new Response(JSON.stringify({ id: miniId, message: "Mini crossword saved successfully" }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Delete mini crossword
http.route({
  path: "/api/mini",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    // Validate secret key
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    
    if (!date) {
      return new Response(JSON.stringify({ error: "Date parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await ctx.runMutation(api.minis.deleteMiniByDate, { date });

      return new Response(JSON.stringify({ message: "Mini crossword deleted successfully" }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ===== Audio File Endpoints =====

// Upload audio file (two-step: get upload URL, then store metadata)
http.route({
  path: "/api/audio/upload-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const uploadUrl = await ctx.runMutation(api.audioFiles.generateUploadUrl);
      return new Response(JSON.stringify({ uploadUrl }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Failed to generate upload URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Save audio file metadata after upload
http.route({
  path: "/api/audio",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { storageId, fileName, contentType, size } = body;

      if (!storageId || !fileName || !contentType || size === undefined) {
        return new Response(JSON.stringify({ error: "Missing required fields: storageId, fileName, contentType, size" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = await ctx.runMutation(api.audioFiles.saveFileMetadata, {
        storageId,
        fileName,
        contentType,
        size,
      });

      return new Response(JSON.stringify({ id, message: "Audio file saved successfully" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Get all audio files
http.route({
  path: "/api/audio",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(request.url);
      const fileName = url.searchParams.get("fileName");

      if (fileName) {
        const file = await ctx.runQuery(api.audioFiles.getAudioFileByName, { fileName });
        if (!file) {
          return new Response(JSON.stringify({ error: "Audio file not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(file), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const files = await ctx.runQuery(api.audioFiles.getAllAudioFiles);
      return new Response(JSON.stringify(files), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Delete audio file by fileName
http.route({
  path: "/api/audio",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!validateSecretKey(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing secret key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const fileName = url.searchParams.get("fileName");

    if (!fileName) {
      return new Response(JSON.stringify({ error: "fileName parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await ctx.runMutation(api.audioFiles.deleteAudioFileByName, { fileName });
      return new Response(JSON.stringify({ message: "Audio file deleted successfully" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Serve audio file directly by fileName (public, no auth needed for playback)
http.route({
  path: "/api/audio/serve",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const fileName = url.searchParams.get("fileName");

    if (!fileName) {
      return new Response("fileName parameter required", { status: 400 });
    }

    const file = await ctx.runQuery(api.audioFiles.getAudioFileByName, { fileName });
    if (!file || !file.url) {
      return new Response("File not found", { status: 404 });
    }

    // Redirect to the Convex storage URL
    return new Response(null, {
      status: 302,
      headers: {
        Location: file.url,
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// ===== CORS Preflight Handlers =====

http.route({
  path: "/api/mini",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Secret-Key",
      },
    });
  }),
});

http.route({
  path: "/api/minis",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Secret-Key",
      },
    });
  }),
});

http.route({
  path: "/api/audio",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Secret-Key",
      },
    });
  }),
});

http.route({
  path: "/api/audio/upload-url",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Secret-Key",
      },
    });
  }),
});

http.route({
  path: "/api/audio/serve",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Secret-Key",
      },
    });
  }),
});

export default http;
