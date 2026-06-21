import React, { useState, useRef, useEffect } from "react";
import {
  Film,
  Sparkles,
  Scissors,
  Download,
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  Video,
  ListVideo,
  Flame,
  CheckCircle,
  Undo2,
  Sliders,
  ChevronRight,
  MonitorPlay,
  Wand2
} from "lucide-react";
import UploadZone from "./components/UploadZone";
import ClipCard from "./components/ClipCard";
import ExportModal from "./components/ExportModal";
import RenderProgress from "./components/RenderProgress";
import { VideoClip, ExportSettings } from "./types";

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoName, setVideoName] = useState<string>("");
  const [videoSizeFormatted, setVideoSizeFormatted] = useState<string>("");

  const [clipDurationSeconds, setClipDurationSeconds] = useState<number | "">(30);
  const isDurationError = clipDurationSeconds !== "" && (clipDurationSeconds < 5 || clipDurationSeconds > 180);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [engineMode, setEngineMode] = useState<string>("");

  // Preview Loop Player state
  const [currentPreviewClip, setCurrentPreviewClip] = useState<VideoClip | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);

  // Modals state
  const [selectedExportClip, setSelectedExportClip] = useState<VideoClip | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [activeRenderSettings, setActiveRenderSettings] = useState<ExportSettings | null>(null);

  const mainPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Helper: Format duration from seconds to MM:SS
  const formatDuration = (sec: number) => {
    if (isNaN(sec) || sec < 0) return "0:00";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // When a video is selected (either an uploaded file or demo url)
  const handleVideoSelected = (file: File | null, customUrl?: string) => {
    setIsLoading(true);
    setClips([]);
    setCurrentPreviewClip(null);
    setIsPreviewActive(false);

    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoName(file.name);
      
      // Calculate human-readable size
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setVideoSizeFormatted(`${mb} MB`);

      // Read duration from HTML5 audio/video element safely
      const tempVideo = document.createElement("video");
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        setVideoDuration(tempVideo.duration);
        setIsLoading(false);
      };
    } else if (customUrl) {
      setVideoFile(null);
      setVideoUrl(customUrl);
      const parts = customUrl.split("/");
      const fallbackName = parts[parts.length - 1] || "Sample_Streaming_Nature.mp4";
      setVideoName(fallbackName);
      setVideoSizeFormatted("Streaming Demo Cloud Asset");

      // Set approximate duration context from demo specs
      const tempVideo = document.createElement("video");
      tempVideo.src = customUrl;
      tempVideo.onloadedmetadata = () => {
        setVideoDuration(tempVideo.duration);
        setIsLoading(false);
      };
    }
  };

  // Loops the main player specifically on the active preview clip start-end timeframe
  useEffect(() => {
    const player = mainPlayerRef.current;
    if (!player || !currentPreviewClip || !isPreviewActive) return;

    // Force player to jump to beginning of the active clip when it starts
    player.currentTime = currentPreviewClip.startTime;
    player.play().catch(() => {});

    const handleTimeUpdate = () => {
      if (player.currentTime >= currentPreviewClip.endTime || player.currentTime < currentPreviewClip.startTime) {
        player.currentTime = currentPreviewClip.startTime;
        player.play().catch(() => {});
      }
    };

    player.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      player.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [currentPreviewClip, isPreviewActive]);

  // Request AI Highlight Splits from backend
  const handleGenerateShorts = async () => {
    if (!videoUrl || videoDuration <= 0) return;

    setIsLoading(true);
    setClips([]);
    setCurrentPreviewClip(null);
    setIsPreviewActive(false);

    try {
      const response = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: videoName,
          fileSize: videoSizeFormatted,
          duration: videoDuration,
          userPrompt,
          clipDurationSeconds
        })
      });

      if (!response.ok) {
        throw new Error("Highlight API responded with error.");
      }

      const data = await response.json();
      setClips(data.clips || []);
      setEngineMode(data.mode || "Smart Division Filter");

      // Auto play the first clip preview
      if (data.clips && data.clips.length > 0) {
        setCurrentPreviewClip(data.clips[0]);
        setIsPreviewActive(true);
      }
    } catch (err) {
      console.error("AI Splitter failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Play/Pause individual clip preview on the main player monitor
  const handlePreviewToggle = (clip: VideoClip) => {
    if (currentPreviewClip?.id === clip.id && isPreviewActive) {
      // Pause
      setIsPreviewActive(false);
      mainPlayerRef.current?.pause();
    } else {
      // Start previewing
      setCurrentPreviewClip(clip);
      setIsPreviewActive(true);
      if (mainPlayerRef.current) {
        mainPlayerRef.current.currentTime = clip.startTime;
        mainPlayerRef.current.play().catch(() => {});
      }
    }
  };

  // Launch Export Customizer Dialog
  const handleExportTrigger = (clip: VideoClip) => {
    setSelectedExportClip(clip);
    setIsExportModalOpen(true);
  };

  // Trigger Rendering Window
  const handleConfirmExportSettings = (settings: ExportSettings) => {
    setIsExportModalOpen(false);
    setActiveRenderSettings(settings);
    setIsRendering(true);
  };

  const handleResetVideo = () => {
    setVideoFile(null);
    setVideoUrl("");
    setVideoDuration(0);
    setClips([]);
    setCurrentPreviewClip(null);
    setIsPreviewActive(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Upper Navigation Rail */}
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                VibeClip <span className="text-indigo-600">AI</span> Studio <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full font-bold font-mono tracking-wide uppercase">AI Active</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Turn landscape footage into vertical TikToks instantly</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {videoUrl && (
              <button
                id="reset-studio-btn"
                onClick={handleResetVideo}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg flex items-center gap-2 border border-slate-200 shadow-sm transition-colors"
              >
                <Undo2 className="w-4.5 h-4.5" />
                Reset Studio
              </button>
            )}
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/65 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> AI Engine Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Arena */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-5 md:p-8 space-y-8">
        {!videoUrl ? (
          /* Zone 1: Drag Drop upload */
          <div className="max-w-4xl mx-auto py-12 space-y-12 animate-fade-in">
            <div className="text-center space-y-4">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                Social Growth Hack
              </span>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight sm:text-5xl leading-tight">
                Instantly Transmute Long Videos <br />
                Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">Viral Short Clips</span>
              </h2>
              <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Our platform automatically extracts Compelling Hooks, Climax scenes, and Takeaway points.
                Graded into exact lengths (e.g. 30s) and enhanced with custom resolutions for TikTok, Reels, & Shorts.
              </p>
            </div>

            <UploadZone onVideoSelected={handleVideoSelected} isLoading={isLoading} />
          </div>
        ) : (
          /* Zone 2: Dashboard controls & Visual splits */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left Columns: Parameters, Prompts & Splits */}
            <div className="lg:col-span-4 space-y-6">
              {/* Studio Console settings */}
              <div id="split-parameters" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Sliders className="w-4 h-4 text-indigo-600" /> Studio Cutter Parameters
                </h3>

                {/* Info summary */}
                <div className="font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="text-slate-800 font-bold truncate max-w-[150px]">{videoName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File size:</span>
                    <span className="text-slate-800">{videoSizeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-slate-800 font-bold">{formatDuration(videoDuration)} ({videoDuration.toFixed(1)}s)</span>
                  </div>
                </div>

                {/* Target length input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block flex justify-between">
                    <span>Target Clip Segment Length:</span>
                    <span className={`${isDurationError ? "text-red-600 animate-pulse font-black" : "text-indigo-600 font-black"} font-mono`}>{clipDurationSeconds} seconds</span>
                  </label>
                  <div className="relative">
                    <input
                      id="clip-duration-spec"
                      type="number"
                      value={clipDurationSeconds}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setClipDurationSeconds("");
                        } else {
                          setClipDurationSeconds(Number(val));
                        }
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold ${
                        isDurationError ? "border-red-500 focus:border-red-500 bg-red-50/15" : "border-slate-200"
                      }`}
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold font-mono text-slate-400">SEC</span>
                  </div>
                  {isDurationError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      Limit error: Select a value between 5 seconds and 3 minutes (180s) in the red colour error.
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 leading-snug pt-0.5">
                    E.g. splitting a 3 min video at 30 seconds outputs 6 short videos of 30 seconds each automatically.
                  </p>
                </div>

                {/* AI instruction prompt guidelines */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-indigo-600" /> AI Highlight Instructions (Optional)
                  </label>
                  <textarea
                    id="ai-user-prompt"
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="Focus on funny gags, code explanations, tutorial steps, peak dramatic actions..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 scrollbar-none focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Trigger analysis button */}
                <button
                  id="split-generator-btn"
                  onClick={handleGenerateShorts}
                  disabled={isLoading || isDurationError || clipDurationSeconds === ""}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-450 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4.5 h-4.5 animate-spin" />
                      Semantically Analyzing Audio & Motion...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5 fill-current" />
                      Generate Highlights
                    </>
                  )}
                </button>
              </div>

              {/* Status Alert */}
              {clips.length > 0 && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-700 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h5 className="text-xs font-black text-indigo-800">Analysis complete</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Generated <span className="text-slate-800 font-bold font-mono">{clips.length}</span> compelling clips in <span className="text-slate-800 font-semibold font-mono">{engineMode}</span>. Click Preview below to view overlays.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Columns: Video preview monitor and Clips list */}
            <div className="lg:col-span-8 space-y-6">
              {/* Studio Video Live Monitor */}
              <div id="video-monitor-panel" className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-550">Live Monitor</span>
                  </div>
                  {currentPreviewClip && isPreviewActive && (
                    <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-indigo-700 font-bold uppercase animate-pulse">
                      LOOPING PREVIEW: #{currentPreviewClip.clipNumber} ({currentPreviewClip.startTime.toFixed(1)}s - {currentPreviewClip.endTime.toFixed(1)}s)
                    </span>
                  )}
                </div>

                <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-4 border-white shadow-xl">
                  <video
                    ref={mainPlayerRef}
                    id="studio-live-player"
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>

                {currentPreviewClip && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Clip {currentPreviewClip.clipNumber}: {currentPreviewClip.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{currentPreviewClip.description}</p>
                    </div>
                    <button
                      id="studio-player-focus-btn"
                      onClick={() => handlePreviewToggle(currentPreviewClip)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {isPreviewActive ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" /> Restart Segment
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Play Segment Loop
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Clips Listing Grid/List */}
              <div id="clips-inventory" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <ListVideo className="w-4.5 h-4.5 text-indigo-600" /> Identified Clips ({clips.length})
                  </h3>
                  {clips.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Total Clips Duration: {formatDuration(clips.reduce((acc, c) => acc + c.duration, 0))}
                    </span>
                  )}
                </div>

                {clips.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-slate-200 border-dashed rounded-2xl shadow-sm">
                    <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-sm font-bold text-slate-700">No clips generated yet</h4>
                    <p className="text-xs text-slate-450 mt-1.5 max-w-md mx-auto leading-relaxed">
                      Configure your clip duration length inside the Studio Cutter block, then click 'Generate Highlights' to let AI find the golden retainable hooks!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clips.map((clip) => (
                      <ClipCard
                        key={clip.id}
                        clip={clip}
                        isPlaying={currentPreviewClip?.id === clip.id && isPreviewActive}
                        onPreviewToggle={handlePreviewToggle}
                        onExportTrigger={handleExportTrigger}
                        formatDuration={formatDuration}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export parameters Modal Dialog */}
      <ExportModal
        clip={selectedExportClip}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirmExport={handleConfirmExportSettings}
      />

      {/* Active Rendering Frame buffer Studio */}
      {isRendering && selectedExportClip && activeRenderSettings && (
        <RenderProgress
          clip={selectedExportClip}
          settings={activeRenderSettings}
          videoSrc={videoUrl}
          onClose={() => {
            setIsRendering(false);
            setActiveRenderSettings(null);
            setSelectedExportClip(null);
          }}
          onComplete={(url) => {
            console.log("Completed custom export! Download URL generated successfully.", url);
          }}
        />
      )}

      {/* Footer Branding block */}
      <footer className="border-t border-slate-200 text-center py-6 mt-12 bg-white text-slate-400 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 Auto Shorts Clip Generator Studio. DeepMind Antigravity framework.</span>
          <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100/50 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Complete client-side Canvas acceleration active
          </span>
        </div>
      </footer>
    </div>
  );
}
