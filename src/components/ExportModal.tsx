import React, { useState } from "react";
import { X, Sparkles, Video, Settings, Palette, Crop, Shield, FileText } from "lucide-react";
import { VideoClip, ExportSettings } from "../types";

interface ExportModalProps {
  clip: VideoClip | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: (settings: ExportSettings) => void;
}

export default function ExportModal({
  clip,
  isOpen,
  onClose,
  onConfirmExport
}: ExportModalProps) {
  const [quality, setQuality] = useState<ExportSettings["quality"]>("1080p");
  const [enhancement, setEnhancement] = useState<ExportSettings["enhancement"]>("vibrant");
  const [aspectRatio, setAspectRatio] = useState<ExportSettings["aspectRatio"]>("9:16");
  const [subtitlesStyle, setSubtitlesStyle] = useState<ExportSettings["subtitlesStyle"]>("none");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [blurBackground, setBlurBackground] = useState(true);

  if (!isOpen || !clip) return null;

  const handleExportClick = () => {
    onConfirmExport({
      quality,
      enhancement,
      aspectRatio,
      subtitlesStyle,
      includeWatermark,
      blurBackground
    });
  };

  // Estimate size based on parameters
  const getFileSizeEstimate = () => {
    const duration = clip.duration || 30;
    let factor = 1.2; // default 1080p MB/sec
    if (quality === "480p") factor = 0.4;
    else if (quality === "720p") factor = 0.8;
    else if (quality === "1080p") factor = 1.5;
    else if (quality === "4k") factor = 5.2;

    if (aspectRatio === "9:16" && !blurBackground) {
      factor *= 0.65; // vertical crop occupies less data space
    }
    return `${(duration * factor).toFixed(1)} MB`;
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in"
    >
      <div
        id="export-modal-content"
        className="relative w-full max-w-2xl bg-white border border-slate-250 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Enhance & Export Creator Studios
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Optimize render parameters for mobile platforms
              </p>
            </div>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clip Summary Preview Indicator */}
        <div className="my-5 p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{clip.emoji}</span>
            <div>
              <span className="text-[10px] font-mono tracking-wider font-bold text-indigo-600 uppercase">
                ACTIVE CLIP SELECTION: #{clip.clipNumber}
              </span>
              <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{clip.title}</h4>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-slate-500">
            <div>Duration: <span className="text-slate-800 font-bold">{clip.duration.toFixed(1)}s</span></div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              Timeframe: {clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="space-y-6 flex-grow text-slate-800">
          {/* Quality Choice / Resolution */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-4 h-4 text-indigo-600" /> 1. Select Export Quality Format
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { id: "480p", label: "480p", desc: "SD Website" },
                { id: "720p", label: "720p", desc: "HD Frame" },
                { id: "1080p", label: "1085p", desc: "Full HD Reels" },
                { id: "4k", label: "4K UHD", desc: "Ultra Premium" }
              ].map((q) => (
                <button
                  key={q.id}
                  id={`quality-opt-${q.id}`}
                  onClick={() => setQuality(q.id as ExportSettings["quality"])}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200 ${
                    quality === q.id
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/25 font-bold"
                      : "border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-bold">{q.id.toUpperCase()}</span>
                  <span className="text-[9px] text-slate-400 mt-1 uppercase font-bold font-mono tracking-tight">{q.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Enhancement Option / Quality Filter */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-indigo-600" /> 2. AI Style Grading & Image Enhancements
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  id: "none",
                  name: "Original Source Render",
                  desc: "Keep true source color grades and contrasts."
                },
                {
                  id: "vibrant",
                  name: "🚀 Vivid Social Pop",
                  desc: "Optimized saturations and high-contrast brightness for mobile feeds."
                },
                {
                  id: "cinematic",
                  name: "🎬 Cinematic Moody Glow",
                  desc: "Teal-and-orange grade with subtle vignette and warm highlights."
                },
                {
                  id: "promatte",
                  name: "🎨 Pro Custom Matte Look",
                  desc: "Muted contrast and high-grade aesthetic desaturated pastel colors."
                }
              ].map((style) => (
                <button
                  key={style.id}
                  id={`enhancement-opt-${style.id}`}
                  onClick={() => setEnhancement(style.id as ExportSettings["enhancement"])}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${
                    enhancement === style.id
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-800 ring-1 ring-indigo-500/25"
                      : "border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-bold">{style.name}</div>
                  <div className="text-xs text-slate-500 mt-1 font-normal leading-normal">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Cropping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Crop className="w-4 h-4 text-indigo-600" /> 3. Layout Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "16:9", label: "16:9 Landscape" },
                  { id: "9:16", label: "9:16 Vertical" }
                ].map((a) => (
                  <button
                    key={a.id}
                    id={`ratio-opt-${a.id}`}
                    onClick={() => setAspectRatio(a.id as ExportSettings["aspectRatio"])}
                    className={`py-3.5 px-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200 ${
                      aspectRatio === a.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                        : "border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" /> 4. Subtitle Design
              </label>
              <select
                id="subtitles-style-selector"
                value={subtitlesStyle}
                onChange={(e) => setSubtitlesStyle(e.target.value as ExportSettings["subtitlesStyle"])}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="none">No captions overlay</option>
                <option value="bold-yellow">🌟 Yellow Bold Impact (TikTok/Reels Style)</option>
                <option value="neon-green">⚡ Cyberpunk Neon Green Glow</option>
                <option value="minimal-white">🤍 Elegant Centered White</option>
              </select>
            </div>
          </div>

          {/* Secondary Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {aspectRatio === "9:16" && (
              <label id="backdrop-toggle" className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={blurBackground}
                  onChange={(e) => setBlurBackground(e.target.checked)}
                  className="w-4.5 h-4.5 accent-indigo-600 rounded border-slate-305"
                />
                <div>
                  <div className="text-xs font-bold text-slate-700">Solid Black Background Padding</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fit video with clean solid black letterbox bars instead of vertical crop</p>
                </div>
              </label>
            )}

            <label id="watermark-toggle" className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={includeWatermark}
                onChange={(e) => setIncludeWatermark(e.target.checked)}
                className="w-4.5 h-4.5 accent-indigo-600 rounded border-slate-305"
              />
              <div>
                <div className="text-xs font-bold text-slate-700">Add Creator Watermark</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Overlay small professional watermark at the top-right corner</p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer info & trigger */}
        <div className="mt-8 pt-5 border-t border-slate-150 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                ESTIMATED SIZE
              </span>
              <div className="text-lg font-bold text-slate-800 font-mono">
                {getFileSizeEstimate()}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="text-left flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Enhanced high-fidelity rendering pipeline enabled</span>
            </div>
          </div>

          <button
            id="start-export-btn"
            onClick={handleExportClick}
            className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-indigo-150"
          >
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            Enhance & Render Clip
          </button>
        </div>
      </div>
    </div>
  );
}
