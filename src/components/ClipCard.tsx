import React, { useState, useEffect } from "react";
import { Play, Pause, Download, MonitorPlay, Sparkles, Flame } from "lucide-react";
import { VideoClip } from "../types";

interface ClipCardProps {
  key?: string;
  clip: VideoClip;
  isPlaying: boolean;
  onPreviewToggle: (clip: VideoClip) => void;
  onExportTrigger: (clip: VideoClip) => void;
  formatDuration: (sec: number) => string;
}

export default function ClipCard({
  clip,
  isPlaying,
  onPreviewToggle,
  onExportTrigger,
  formatDuration
}: ClipCardProps) {
  const isViralHigh = clip.viralScore >= 90;

  return (
    <div
      id={`clip-card-${clip.id}`}
      className={`relative h-full flex flex-col bg-white border rounded-2xl overflow-hidden transition-all duration-300 group ${
        isPlaying
          ? "border-indigo-600 shadow-md ring-1 ring-indigo-500/25"
          : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
      }`}
    >
      {/* Badge Ribbon */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5 items-center">
        <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-slate-900/95 border border-slate-700 text-white flex items-center gap-1">
          <span>{clip.emoji}</span> Clip #{clip.clipNumber}
        </span>
        {isViralHigh && (
          <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-indigo-600 text-white flex items-center gap-1 font-mono">
            <Flame className="w-3 h-3 fill-white text-white animate-pulse" /> {clip.viralScore}% VIRAL
          </span>
        )}
      </div>

      {/* Decorative Box Thumbnail placeholder */}
      <div className="relative aspect-video bg-slate-950 flex items-center justify-center group overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent z-1"></div>
        
        {/* Play indicator overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity z-10">
          <button
            id={`play-preview-${clip.id}`}
            onClick={() => onPreviewToggle(clip)}
            className={`w-12 h-12 rounded-full flex items-center justify-center border font-bold transition-all duration-300 ${
              isPlaying
                ? "bg-indigo-600 border-indigo-500 text-white scale-105"
                : "bg-black/70 border-slate-600 text-white hover:bg-indigo-600 hover:border-indigo-500 hover:scale-105"
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
        </div>

        {/* Dynamic Static Capture Background */}
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 relative p-4">
          <span className="text-3xl filter saturate-150 mb-1">{clip.emoji}</span>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
            Segment {formatDuration(clip.startTime)} - {formatDuration(clip.endTime)}
          </span>
          {isPlaying && (
            <div className="absolute bottom-2 left-2 right-2 flex gap-1 items-end h-3 pl-1.5 overflow-hidden">
              <span className="w-1 bg-indigo-600 rounded animate-[bounce_0.6s_infinite_100ms] h-2"></span>
              <span className="w-1 bg-indigo-600 rounded animate-[bounce_0.6s_infinite_300ms] h-3"></span>
              <span className="w-1 bg-indigo-600 rounded animate-[bounce_0.6s_infinite_200ms] h-1.5"></span>
              <span className="w-1 bg-indigo-600 rounded animate-[bounce_0.6s_infinite_400ms] h-3.5"></span>
              <span className="text-[9px] text-indigo-600 font-mono font-bold tracking-wider uppercase ml-1 animate-pulse">
                PREVIEW LOOP ACTIVE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200 line-clamp-1 flex items-center gap-1.5">
            {clip.title}
          </h4>
          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {clip.description}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4 font-mono">
            <span>Duration:</span>
            <span className="text-slate-700 font-bold">{clip.duration.toFixed(1)}s</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-5">
            {clip.suggestedPlatforms.map((platform, idx) => (
              <span
                key={idx}
                className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded"
              >
                #{platform.replace(/\s+/g, "")}
              </span>
            ))}
          </div>

          <button
            id={`trigger-export-${clip.id}`}
            onClick={() => onExportTrigger(clip)}
            className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-900 hover:border-indigo-500 transition-all duration-300 active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Customize & Export Clip
          </button>
        </div>
      </div>
    </div>
  );
}
