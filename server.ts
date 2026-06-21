import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client on the server
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Successfully initialized Gemini API Client.");
    } else {
      console.warn("GEMINI_API_KEY is not defined. Falling back to rule-based highlights split.");
    }
  }
  return aiClient;
}

// API Route: Generate compelling highlights using AI
app.post("/api/highlights", async (req, res) => {
  try {
    const { fileName, fileSize, duration, userPrompt, clipDurationSeconds } = req.body;

    if (!duration || duration <= 0) {
      return res.status(400).json({ error: "Invalid video duration" });
    }

    const targetClipDuration = Number(clipDurationSeconds) || 30;

    interface VideoSegment {
      clipNumber: number;
      startTime: number;
      endTime: number;
      duration: number;
    }

    const intervals: VideoSegment[] = [];
    let currentStart = 0;
    let clipNum = 1;

    while (currentStart < duration) {
      const currentEnd = Math.min(duration, currentStart + targetClipDuration);
      const segmentDur = Number((currentEnd - currentStart).toFixed(2));
      // Stop if remaining part is practically zero
      if (segmentDur <= 0.05) {
        break;
      }
      intervals.push({
        clipNumber: clipNum,
        startTime: Number(currentStart.toFixed(2)),
        endTime: Number(currentEnd.toFixed(2)),
        duration: segmentDur
      });
      currentStart = currentEnd;
      clipNum++;
    }

    const N = intervals.length;

    const ai = getGeminiClient();

    // If Gemini client is available, try to use Gemini to enrich the structured segments
    if (ai) {
      try {
        const promptText = `
          We have a video file named "${fileName}" of size ${fileSize || "unknown"} and total duration ${duration} seconds.
          We have pre-calculated contiguous, non-overlapping segment intervals for this video:
          ${JSON.stringify(intervals)}

          Please enrich each segment by analyzing its specific time interval window. For each segment, provide:
          1. A dynamic, hook-style social highlight title (e.g., 'Wait for the Plot Twist!' or 'The Absolute Best Trick').
          2. A snappy social explanation description of why this interval stands out.
          3. A relevant emoji (e.g., 🔥, 💡, 🧠, 🎯, 🤣).
          4. A viral suitability score between 75 and 99.
          5. A list of suggested social platforms in string array format.

          Specific topic focus instruction from user: "${userPrompt || "Automatically branding this as standard short reels, TikTok highlights, or shorts."}"

          Your response MUST be a JSON array of exactly ${N} elements, matching the specified segments in identical order.
          Do NOT generate subtitle captions / text lyrics.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            systemInstruction: "You are an elite video editor and viral content strategist. Always output formatted JSON list matching the schema exactly with no markdown backticks.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: `List of enriched highlight details (must have exactly ${N} elements corresponding to the respective input intervals)`,
              items: {
                type: Type.OBJECT,
                required: ["title", "description", "viralScore", "suggestedPlatforms", "emoji"],
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "Hook-style viral clip title"
                  },
                  description: {
                    type: Type.STRING,
                    description: "Short dynamic description of why this segment is viral"
                  },
                  viralScore: {
                    type: Type.INTEGER,
                    description: "Calculated social potential score from 75 to 99"
                  },
                  suggestedPlatforms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Social channels like TikTok, YouTube Shorts, or Instagram Reels"
                  },
                  emoji: {
                    type: Type.STRING,
                    description: "Single high-relevance emoji for the clip"
                  }
                }
              }
            }
          }
        });

        const queryText = response.text?.trim() || "[]";
        let parsedDetails = JSON.parse(queryText);

        // Map enriched details back to mathematical intervals
        if (Array.isArray(parsedDetails) && parsedDetails.length > 0) {
          const enrichedClips = intervals.map((interval, idx) => {
            const detail = parsedDetails[idx] || parsedDetails[idx % parsedDetails.length] || {};
            return {
              id: `ai-clip-${idx}-${Date.now()}`,
              clipNumber: interval.clipNumber,
              title: detail.title || `Compelling Fragment #${interval.clipNumber}`,
              description: detail.description || "Identified peak viewer retention highlight.",
              startTime: interval.startTime,
              endTime: interval.endTime,
              duration: interval.duration,
              viralScore: Math.min(100, Math.max(10, Number(detail.viralScore) || 85)),
              suggestedPlatforms: detail.suggestedPlatforms || ["TikTok", "Instagram Reels"],
              emoji: detail.emoji || "🔥",
              captions: [] // Strictly empty, do not generate captions
            };
          });

          return res.json({ clips: enrichedClips, mode: "Gemini AI Semantic Detection" });
        }
      } catch (geminiError) {
        console.error("Gemini processing error, falling back to rule-based titles:", geminiError);
      }
    }

    // Fail-safe Rule-Based Segmentation (always uses pre-calculated mathematical contiguous intervals)
    console.log("Using rule-based split fallback with perfect math intervals...");
    const generalTitles = [
      "The Ultimate Golden Rule",
      "This Changes Everything!",
      "Perfect Timing Captured",
      "Pay Absolute Attention",
      "Mindset Shift Required",
      "Why You're Doing This Wrong",
      "The Hidden Plot Twist",
      "Pro Tips Nobody Tells You",
      "This is Honestly CRAZY!",
      "Save This For Later"
    ];

    const generalDescriptions = [
      "Unlocking major tactical lessons from this exclusive session.",
      "A golden chunk of action advice that went viral in seconds.",
      "The exact moment viewers stayed 100% glued to their screens.",
      "Pure wisdom packed into a bite-sized mobile-first segment."
    ];

    const emojis = ["🔥", "💡", "🎯", "🧠", "😮", "🎬", "✨", "🚀", "🚨", "💎"];

    const clipsList = intervals.map((interval, idx) => {
      const titlePreset = generalTitles[idx % generalTitles.length];
      const descPreset = generalDescriptions[idx % generalDescriptions.length];
      const emojiPreset = emojis[idx % emojis.length];

      return {
        id: `split-clip-${interval.clipNumber}-${Date.now()}`,
        clipNumber: interval.clipNumber,
        title: `${titlePreset} #${interval.clipNumber}`,
        description: descPreset,
        startTime: interval.startTime,
        endTime: interval.endTime,
        duration: interval.duration,
        viralScore: Math.floor(78 + Math.random() * 21),
        suggestedPlatforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
        emoji: emojiPreset,
        captions: [] // Strictly empty, do NOT generate captions
      };
    });

    return res.json({ clips: clipsList, mode: "Standard Auto-Split Subdivisions" });
  } catch (err: any) {
    console.error("Critical highlights error:", err);
    res.status(500).json({ error: "Highlight extraction failed", details: err?.message });
  }
});

// Serve health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ready", geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// Configure Vite integration or static file rendering
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Auto Shorts Clip Generator server running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
