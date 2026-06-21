import React, { useRef, useState } from "react";
import { Upload, FileVideo, Sparkles, CheckCircle, AlertTriangle } from "lucide-react";

interface UploadZoneProps {
  onVideoSelected: (file: File | null, customUrl?: string) => void;
  isLoading: boolean;
}

export const DEMO_VIDEOS = [
  {
    name: "Tech Keynote Presentation (Demo)",
    url: "https://assets.mixkit.co/videos/preview/mixkit-womans-feet-splashing-in-the-sea-water-41221-large.mp4",
    duration: 180, // 3 minutes
    description: "Ideal for testing vertical social crop & vivid filters."
  },
  {
    name: "Nature Vlog Tutorial (Demo)",
    url: "https://assets.mixkit.co/videos/preview/mixkit-cinematic-view-of-rocky-hills-and-clouds-40910-large.mp4",
    duration: 120, // 2 minutes
    description: "Cinematic scenery ideal for moody grading exports."
  }
];

export default function UploadZone({ onVideoSelected, isLoading }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    // Strict requirement: "filter the videos or .mp4 file format files only filter and show"
    if (!file.name.toLowerCase().endsWith(".mp4") && file.type !== "video/mp4") {
      setErrorMsg("Strict Media Restriction: Please upload an MP4 format (.mp4) video file only.");
      return;
    }
    
    // Check maximum video length approximate guidance
    // 30 min is max (about 1800s). We'll accept it and let the browser load it.
    onVideoSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="upload-zone-container" className="w-full">
      <div
        id="drag-drop-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInput}
        className={`w-full border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center group ${
          isDragActive
            ? "border-indigo-600 bg-indigo-50/50 shadow-md scale-[1.01]"
            : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50 shadow-sm"
        }`}
      >
        <input
          id="mp4-file-picker"
          ref={fileInputRef}
          type="file"
          accept="video/mp4" // strict file system filter
          className="hidden"
          onChange={handleFileInput}
          disabled={isLoading}
        />

        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
          <Upload className="w-7 h-7 text-indigo-600 group-hover:text-indigo-500" />
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">
          Drag & Drop your video clip
        </h3>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          Supports ONLY <span className="text-indigo-600 font-semibold font-mono">.mp4</span> format up to 30 mins.
          Ideal for creating vertical reels instantly.
        </p>

        <button
          type="button"
          id="select-file-btn"
          disabled={isLoading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-100 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            triggerInput();
          }}
        >
          Select MP4 File
        </button>
      </div>

      {errorMsg && (
        <div id="upload-error-banner" className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preset Demo Videos for Instant Testing */}
      <div id="demo-preset-section" className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> No raw video on hand? Test instantly
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_VIDEOS.map((demo, idx) => (
            <div
              key={idx}
              id={`demo-preset-${idx}`}
              onClick={() => onVideoSelected(null, demo.url)}
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer transition-all duration-200 text-left flex items-start gap-3 group shadow-sm hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100">
                <FileVideo className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {demo.name}
                </h5>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {demo.description}
                </p>
                <div className="text-[10px] font-bold text-slate-600 font-mono mt-2 bg-slate-100 px-2 py-0.5 rounded inline-block border border-slate-200/50">
                  Duration: {Math.floor(demo.duration / 60)}m 00s
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
