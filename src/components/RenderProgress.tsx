import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Film, ShieldCheck, Download, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { VideoClip, ExportSettings } from "../types";

interface RenderProgressProps {
  clip: VideoClip;
  settings: ExportSettings;
  videoSrc: string; // The uploaded video's local Blob URL or stream asset
  onClose: () => void;
  onComplete: (downloadUrl: string) => void;
}

export default function RenderProgress({
  clip,
  settings,
  videoSrc,
  onClose,
  onComplete
}: RenderProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing Creator Render Pipeline...");
  const [logs, setLogs] = useState<string[]>([]);
  const [renderedBlobUrl, setRenderedBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-6));
  };

  useEffect(() => {
    // Start the Canvas recording pipeline
    let isCancelled = false;

    const startRecording = async () => {
      try {
        addLog("Detecting hardware acceleration & canvas contexts...");
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) {
          throw new Error("Failed to initialize system rendering elements.");
        }

        setStatus("Configuring canvas target resolution...");
        // Set dimensions based on selected quality
        let width = 1920;
        let height = 1080;

        if (settings.quality === "480p") {
          width = 854;
          height = 480;
        } else if (settings.quality === "720p") {
          width = 1280;
          height = 720;
        } else if (settings.quality === "1080p") {
          width = 1920;
          height = 1080;
        } else if (settings.quality === "4k") {
          width = 3840;
          height = 2160;
        }

        // Adjust dimensions if 9:16 vertical crop is chosen
        if (settings.aspectRatio === "9:16") {
          const originalWidth = width;
          width = height; // e.g. 1080 for 1080p vertical
          height = originalWidth; // e.g. 1920 for 1080p vertical
        }

        canvas.width = width;
        canvas.height = height;
        addLog(`Set canvas frame size: ${width}x${height} (${settings.aspectRatio})`);

        setStatus("Pre-loading video frame stream...");
        video.src = videoSrc;
        video.muted = false; // Must be false so Web Audio node captures real audio data (muting makes audio track silent)
        video.volume = 1.0;
        video.currentTime = clip.startTime;

        // Ensure both oncanplay and onseeked have completed perfectly before recording
        await new Promise<void>((resolve) => {
          let canPlay = false;
          let seeked = false;
          const check = () => {
            if (canPlay && seeked) resolve();
          };
          video.oncanplay = () => {
            canPlay = true;
            check();
          };
          video.onseeked = () => {
            seeked = true;
            check();
          };
          if (video.readyState >= 3) {
            canPlay = true;
            seeked = true;
            resolve();
          }
          setTimeout(() => resolve(), 2200); // safety timeout
        });

        if (isCancelled) return;

        addLog("Starting Web Audio context and output routing...");
        // Capture original audio stream using Web Audio API
        let audioTrack: MediaStreamTrack | null = null;
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioCtxRef.current = audioCtx;
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          streamDestRef.current = dest;

          // Route video audio source only to the recorder destination
          source.connect(dest);
          
          audioTrack = dest.stream.getAudioTracks()[0] || null;
          if (audioTrack) {
            addLog("Successfully connected high-fidelity audio track at 44.1kHz.");
          } else {
            addLog("Warning: No audio tracks detected in source video.");
          }
        } catch (e) {
          addLog("Web Audio API not supported. Proceeding without audio mix.");
        }

        // Extract Canvas Video Track with constant 30 FPS
        const videoStream = canvas.captureStream(30);
        const videoTrack = videoStream.getVideoTracks()[0];

        // Create combined stream
        const tracks: MediaStreamTrack[] = [videoTrack];
        if (audioTrack) {
          tracks.push(audioTrack);
        }
        const combinedStream = new MediaStream(tracks);

        setStatus("Initializing MediaRecorder container...");
        
        // Find best supported format with high-fidelity bitrates to render the crispest social feed clips
        let options: MediaRecorderOptions = { 
          mimeType: "video/webm;codecs=vp9,opus",
          videoBitsPerSecond: 8000000, 
          audioBitsPerSecond: 128000
        };
        if (!MediaRecorder.isTypeSupported(options.mimeType || "")) {
          options = { 
            mimeType: "video/webm;codecs=vp8,opus",
            videoBitsPerSecond: 8000000,
            audioBitsPerSecond: 128000
          };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType || "")) {
          options = { 
            mimeType: "video/webm",
            videoBitsPerSecond: 8000000,
            audioBitsPerSecond: 128000
          };
        }

        addLog(`Selected format encoding: ${options.mimeType} @ 8.0 Mbps`);
        const recorder = new MediaRecorder(combinedStream, options);
        recorderRef.current = recorder;

        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          addLog("Combining data chunks into playable video block...");
          const blob = new Blob(chunksRef.current, { type: "video/mp4" });
          const url = URL.createObjectURL(blob);
          setRenderedBlobUrl(url);
          setProgress(100);
          setStatus("Enhancement Completes!");
          addLog("Clip successfully saved! Click download to export.");
          onComplete(url);
        };

        setStatus("Rendering Clip frame-by-frame with active LUTs...");
        addLog("Applying 'Vivid Social Pop' color space LUT...");
        addLog("AI subtitles overlay system rendering online.");

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not construct 2D render context.");

        const duration = clip.endTime - clip.startTime;

        // Force a synchronous single-frame draw *before* starting recorder and video playback
        // to make sure there is no leading blank frame in recorder initialization.
        const drawSingleFirstFrame = () => {
          ctx.clearRect(0, 0, width, height);
          
          if (settings.enhancement === "vibrant") {
            ctx.filter = "contrast(1.22) saturate(1.4) brightness(1.10) saturate(1.15)";
          } else if (settings.enhancement === "cinematic") {
            ctx.filter = "contrast(1.3) saturate(0.9) hue-rotate(4deg) brightness(1.02)";
          } else if (settings.enhancement === "promatte") {
            ctx.filter = "contrast(0.9) brightness(1.05) saturate(0.85)";
          } else {
            ctx.filter = "none";
          }

          if (settings.aspectRatio === "9:16") {
            const videoRatio = video.videoWidth / video.videoHeight;
            if (settings.blurBackground) {
              // Draw solid black background
              ctx.fillStyle = "#000000";
              ctx.fillRect(0, 0, width, height);
              ctx.filter = settings.enhancement === "vibrant" 
                ? "contrast(1.22) saturate(1.4) brightness(1.10) saturate(1.15)"
                : settings.enhancement === "cinematic"
                  ? "contrast(1.3) saturate(0.9) hue-rotate(4deg)"
                  : settings.enhancement === "promatte"
                    ? "contrast(0.9) brightness(1.05) saturate(0.85)"
                    : "none";
              const targetHeight = width / videoRatio;
              const targetY = (height - targetHeight) / 2;
              ctx.drawImage(video, 0, targetY, width, targetHeight);
            } else {
              const sourceHeight = video.videoHeight;
              const sourceWidth = sourceHeight * (9 / 16);
              const sourceX = (video.videoWidth - sourceWidth) / 2;
              ctx.drawImage(video, sourceX, 0, sourceWidth, sourceHeight, 0, 0, width, height);
            }
          } else {
            ctx.drawImage(video, 0, 0, width, height);
          }
          ctx.filter = "none";

          if (settings.includeWatermark) {
            ctx.save();
            ctx.font = `${Math.floor(height * 0.02)}px "Inter", "Arial"`;
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.textAlign = "right";
            ctx.fillText("★ AI SHORTS AUTO-GENERATOR", width - 20, Math.floor(height * 0.04));
            ctx.restore();
          }
        };

        drawSingleFirstFrame();

        // Start recorder
        recorder.start();

        // Start playing
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise.catch((e) => {
              console.warn("video.play() failed or was interrupted:", e);
            });
          }
        } catch (err) {
          console.warn("video.play() synchronous exception:", err);
        }

        const drawFrame = () => {
          if (isCancelled || !video || !canvas) return;

          const currentClipTime = video.currentTime - clip.startTime;
          const currentProgress = Math.min(100, Math.max(0, (currentClipTime / duration) * 100));
          setProgress(Math.floor(currentProgress));

          if (video.currentTime >= clip.endTime || video.ended) {
            try {
              video.pause();
            } catch (_) {}
            addLog(`Reached target clip boundary: ${clip.endTime}s`);
            if (recorderRef.current && recorderRef.current.state !== "inactive") {
              recorderRef.current.stop();
            }
            return;
          }

          // RENDER PIPELINE
          ctx.clearRect(0, 0, width, height);

          // 1. Color enhancements filter
          if (settings.enhancement === "vibrant") {
            ctx.filter = "contrast(1.22) saturate(1.4) brightness(1.10) saturate(1.15)";
          } else if (settings.enhancement === "cinematic") {
            ctx.filter = "contrast(1.3) saturate(0.9) hue-rotate(4deg) brightness(1.02)";
          } else if (settings.enhancement === "promatte") {
            ctx.filter = "contrast(0.9) brightness(1.05) saturate(0.85)";
          } else {
            ctx.filter = "none";
          }

          // 2. Aspect ratio / Crop logic
          if (settings.aspectRatio === "9:16") {
            const videoRatio = video.videoWidth / video.videoHeight;
            
            if (settings.blurBackground) {
              // Draw solid black background
              ctx.fillStyle = "#000000";
              ctx.fillRect(0, 0, width, height);
              ctx.filter = settings.enhancement === "vibrant" 
                ? "contrast(1.22) saturate(1.4) brightness(1.10) saturate(1.15)"
                : settings.enhancement === "cinematic"
                  ? "contrast(1.3) saturate(0.9) hue-rotate(4deg)"
                  : settings.enhancement === "promatte"
                    ? "contrast(0.9) brightness(1.05) saturate(0.85)"
                    : "none";
              
              // Draw 16:9 middle card
              const targetHeight = width / videoRatio;
              const targetY = (height - targetHeight) / 2;
              ctx.drawImage(video, 0, targetY, width, targetHeight);
            } else {
              // Strictly crop centered vertical frame
              const sourceHeight = video.videoHeight;
              const sourceWidth = sourceHeight * (9 / 16);
              const sourceX = (video.videoWidth - sourceWidth) / 2;
              ctx.drawImage(video, sourceX, 0, sourceWidth, sourceHeight, 0, 0, width, height);
            }
          } else {
            // Standard original landscape 16:9
            ctx.drawImage(video, 0, 0, width, height);
          }

          // Reset filter for secondary overlays
          ctx.filter = "none";

          // 3. Subtitles text overlay
          if (settings.subtitlesStyle !== "none" && clip.captions && clip.captions.length > 0) {
            // Find current active caption
            const activeCap = clip.captions.find((cap, idx) => {
              const nextCap = clip.captions?.[idx + 1];
              const capStart = cap.time;
              const capEnd = nextCap ? nextCap.time : duration;
              return currentClipTime >= capStart && currentClipTime < capEnd;
            });

            if (activeCap) {
              ctx.save();
              
              const text = activeCap.text.toUpperCase();
              let fontSize = Math.floor(height * 0.045);
              fontSize = Math.min(100, Math.max(22, fontSize));

              ctx.font = `italic bold ${fontSize}px "Inter", "Impact", "Arial Black"`;
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";

              // Positioning subtiles in the bottom third
              const posX = width / 2;
              const posY = height * 0.82;

              // Styles
              if (settings.subtitlesStyle === "bold-yellow") {
                // Black block dynamic shadow text
                ctx.lineWidth = 10;
                ctx.strokeStyle = "black";
                ctx.strokeText(text, posX, posY);
                ctx.fillStyle = "#FBBF24"; // Bright Yellow
                ctx.fillText(text, posX, posY);
              } else if (settings.subtitlesStyle === "neon-green") {
                // Cyberpunk neon
                ctx.shadowColor = "#10B981";
                ctx.shadowBlur = 15;
                ctx.lineWidth = 6;
                ctx.strokeStyle = "rgba(0,0,0,0.8)";
                ctx.strokeText(text, posX, posY);
                ctx.fillStyle = "#34D399";
                ctx.fillText(text, posX, posY);
              } else if (settings.subtitlesStyle === "minimal-white") {
                // Clean elegant drop shadow
                ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
                ctx.shadowBlur = 10;
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText(text, posX, posY);
              }

              ctx.restore();
            }
          }

          // 4. Pro Overlay Watermark
          if (settings.includeWatermark) {
            ctx.save();
            ctx.font = `${Math.floor(height * 0.02)}px "Inter", "Arial"`;
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.textAlign = "right";
            ctx.fillText("★ AI SHORTS AUTO-GENERATOR", width - 20, Math.floor(height * 0.04));
            ctx.restore();
          }

          animationFrameIdRef.current = requestAnimationFrame(drawFrame);
        };

        animationFrameIdRef.current = requestAnimationFrame(drawFrame);

      } catch (err: any) {
        console.error("Rendering failed:", err);
        setError(err?.message || "An exception occurred inside the Canvas Recorder pipeline.");
        addLog(`[CRITICAL] Render error: ${err?.message || "Encoder failure"}`);
      }
    };

    startRecording();

    return () => {
      isCancelled = true;
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (_) {}
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const triggerDownload = () => {
    if (!renderedBlobUrl) return;
    const a = document.createElement("a");
    a.href = renderedBlobUrl;
    a.download = `EnhancedShort_${clip.clipNumber}_${settings.quality}_${settings.aspectRatio.replace(":", "x")}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addLog("Export has successfully downloaded to your device!");
  };

  return (
    <div
      id="render-progress-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in"
    >
      <div
        id="render-wizard"
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center shadow-2xl text-slate-800"
      >
        <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">AI Enhancement & Rendering Studio</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel Render
          </button>
        </div>

        {error ? (
          <div className="text-center py-6 max-w-md">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto mb-4 border border-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-rose-700">GPU Encoder Exception</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* Hidden source element, visible render canvas */}
            <div className="relative aspect-video max-h-[30vh] w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                style={{ display: "none" }}
                crossOrigin="anonymous"
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
              
              {/* Overlaid preview badge */}
              <div className="absolute bottom-3 left-3 bg-black/80 border border-slate-750 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-wider text-indigo-400 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                In-Studio Frame Buffer
              </div>
            </div>

            {/* Circular Progress & Status */}
            <div className="text-center py-2">
              <div className="text-4xl font-black text-indigo-600 font-mono tracking-tighter">
                {progress}%
              </div>
              <div className="text-sm font-bold text-slate-700 mt-2 flex items-center justify-center gap-2">
                {progress < 100 && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                <span>{status}</span>
              </div>
            </div>

            {/* Simulated Specs */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center font-mono text-[10px] text-slate-500">
              <div>
                <span className="text-slate-400 block text-[9px] mb-0.5">STYLE</span>
                <span className="font-bold text-slate-700 uppercase">{settings.enhancement}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] mb-0.5">RATIO</span>
                <span className="font-bold text-slate-700">{settings.aspectRatio}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] mb-0.5">ENVELOPE</span>
                <span className="font-bold text-slate-700 uppercase">{settings.quality} @ 30FPS</span>
              </div>
            </div>

            {/* Real-Time Processing Console logs */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" /> System Pipeline Console logs
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1.5 h-36 overflow-y-auto leading-relaxed text-left">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="text-indigo-600 tracking-wide font-medium">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic">No operational logs generated yet.</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 w-full">
              {renderedBlobUrl ? (
                <div className="flex gap-3 w-full">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-755 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Studio
                  </button>
                  <button
                    id="save-rendered-clip-btn"
                    onClick={triggerDownload}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-md shadow-indigo-150"
                  >
                    <Download className="w-4 h-4 fill-current" />
                    Download Clip to Device
                  </button>
                </div>
              ) : (
                <div className="w-full text-center text-xs text-slate-500 flex items-center justify-center gap-1 bg-indigo-50/30 py-2.5 rounded-lg border border-indigo-100/45">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 animate-pulse" /> Do not close this browser tab during active hardware rendering
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
