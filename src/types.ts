export interface CaptionWord {
  time: number; // in seconds from starting of clip
  text: string;
}

export interface VideoClip {
  id: string;
  clipNumber: number;
  title: string;
  description: string;
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds
  viralScore: number; // 0-100%
  suggestedPlatforms: string[]; // ['TikTok', 'Instagram Reels', 'YouTube Shorts']
  captions?: CaptionWord[];
  emoji: string;
}

export interface ExportSettings {
  quality: "480p" | "720p" | "1080p" | "4k";
  enhancement: "none" | "cinematic" | "vibrant" | "promatte";
  aspectRatio: "16:9" | "9:16";
  subtitlesStyle: "none" | "bold-yellow" | "neon-green" | "minimal-white";
  includeWatermark: boolean;
  blurBackground: boolean; // overlay 9:16 on top of blurred 16:9 backdrop
}

export interface AIAnalysisRequest {
  fileName: string;
  fileSize: string;
  duration: number; // total seconds
  userPrompt?: string; // e.g. "Highlight cooking techniques or humor"
  clipDurationSeconds: number; // e.g. 30
}
