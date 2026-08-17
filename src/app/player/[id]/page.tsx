"use client";

import React, { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  Sliders,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface MediaItemData {
  id: number;
  filename: string;
  path: string;
  type: string;
  progress: number;
  total_progress?: number;
  folderName?: string;
}

type QualityOption = "original" | "1080p" | "720p" | "480p" | "360p";

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [item, setItem] = useState<MediaItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  const [quality, setQuality] = useState<QualityOption>("original");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isTranscoding, setIsTranscoding] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch item details
  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true);
        const res = await fetch(`/api/items/${id}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao carregar o vídeo.");
        }
        setItem(data.item);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar mídia.");
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  // Save progress API call
  const saveProgress = useCallback(async () => {
    if (!videoRef.current || !id) return;
    const time = videoRef.current.currentTime;
    const dur = videoRef.current.duration;

    if (time > 0) {
      try {
        await fetch(`/api/items/${id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progress: Math.floor(time),
            total_progress: dur > 0 ? Math.floor(dur) : undefined,
          }),
        });
      } catch (err) {
        console.error("Erro ao salvar progresso:", err);
      }
    }
  }, [id]);

  // Periodic auto-save every 10 seconds & before unload
  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress();
    }, 10000);

    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveProgress();
    };
  }, [saveProgress]);

  // Auto hide controls logic
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowQualityMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, resetControlsTimeout]);

  // Handle Video Metadata Loaded (restore saved progress)
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);

      if (item && item.progress > 0 && !hasRestoredProgress) {
        videoRef.current.currentTime = item.progress;
        setHasRestoredProgress(true);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      saveProgress();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
    resetControlsTimeout();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
    resetControlsTimeout();
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(0, videoRef.current.currentTime + seconds),
        duration
      );
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
    resetControlsTimeout();
  };

  const handleQualitySelect = (newQuality: QualityOption) => {
    if (!videoRef.current || !item) return;
    setQuality(newQuality);
    setShowQualityMenu(false);
    setIsTranscoding(newQuality !== "original");

    const currTime = videoRef.current.currentTime;
    let newUrl = `/api/stream?path=${encodeURIComponent(item.path)}`;

    if (newQuality !== "original") {
      newUrl = `/api/stream/transcode?path=${encodeURIComponent(item.path)}&quality=${newQuality}&startTime=${currTime}`;
    }

    videoRef.current.src = newUrl;
    if (newQuality === "original") {
      videoRef.current.currentTime = currTime;
    }
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleBack = async () => {
    await saveProgress();
    router.push("/");
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return "00:00";
    const totalSec = Math.floor(sec);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando vídeo local...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-zinc-400 gap-4">
        <p className="text-sm text-red-400 font-semibold">{error || "Vídeo não encontrado."}</p>
        <Link href="/">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Home</span>
          </Button>
        </Link>
      </div>
    );
  }

  const streamUrl =
    quality === "original"
      ? `/api/stream?path=${encodeURIComponent(item.path)}`
      : `/api/stream/transcode?path=${encodeURIComponent(item.path)}&quality=${quality}&startTime=${currentTime}`;

  const cleanTitle = item.filename.replace(/\.[^/.]+$/, "");

  return (
    <div className="flex flex-col min-h-screen py-3 gap-4 max-w-5xl mx-auto select-none">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="touch-target p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-base text-zinc-100 truncate">{cleanTitle}</h1>
            <p className="text-xs text-zinc-400 truncate">{item.folderName}</p>
          </div>
        </div>
      </header>

      {/* Player Container */}
      <main className="w-full flex-1 flex flex-col justify-center">
        <div
          ref={containerRef}
          onMouseMove={resetControlsTimeout}
          onTouchStart={resetControlsTimeout}
          className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center group"
        >
          {/* HTML5 Native Video Tag */}
          <video
            ref={videoRef}
            src={streamUrl}
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlay}
            playsInline
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Overlay Controls */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 flex flex-col justify-between p-4 transition-opacity duration-300 ${
              showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Top Bar Title & Quality Badge inside fullscreen */}
            <div className="flex items-center justify-between text-white/90">
              <span className="text-xs font-semibold truncate max-w-[70%]">{cleanTitle}</span>
              {isTranscoding && (
                <span className="flex items-center gap-1 text-[10px] bg-indigo-600/80 backdrop-blur-md px-2 py-0.5 rounded-full font-bold text-white uppercase tracking-wider">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>FFmpeg {quality}</span>
                </span>
              )}
            </div>

            {/* Central Playback Controls */}
            <div className="flex items-center justify-center gap-6 my-auto">
              <button
                type="button"
                onClick={() => skipTime(-10)}
                className="touch-target p-3 rounded-full bg-black/50 text-white/90 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Retroceder 10s"
              >
                <RotateCcw className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="touch-target p-4 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/40 transition-all active:scale-90 cursor-pointer"
                title={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>

              <button
                type="button"
                onClick={() => skipTime(10)}
                className="touch-target p-3 rounded-full bg-black/50 text-white/90 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Avançar 10s"
              >
                <RotateCw className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Controls Panel */}
            <div className="flex flex-col gap-2">
              {/* Progress Seek Bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-300 min-w-[45px]">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-zinc-700/80 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-xs font-mono text-zinc-400 min-w-[45px] text-right">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center justify-between pt-1">
                {/* Volume Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="touch-target p-2 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title={isMuted ? "Ativar som" : "Mutar"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-red-400" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Right controls: Quality selector & Fullscreen */}
                <div className="flex items-center gap-2 relative">
                  {/* Quality Selector Menu Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className="touch-target px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span className="uppercase">{quality}</span>
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-10 right-0 w-40 rounded-xl bg-zinc-900 border border-zinc-800 p-1.5 shadow-2xl z-50 flex flex-col gap-1">
                        <span className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-800">
                          Qualidade de Vídeo
                        </span>
                        <button
                          onClick={() => handleQualitySelect("original")}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            quality === "original" ? "bg-indigo-600 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span>Original (Direto)</span>
                          {quality === "original" && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleQualitySelect("1080p")}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            quality === "1080p" ? "bg-indigo-600 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span>1080p (FFmpeg)</span>
                          {quality === "1080p" && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleQualitySelect("720p")}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            quality === "720p" ? "bg-indigo-600 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span>720p (FFmpeg)</span>
                          {quality === "720p" && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleQualitySelect("480p")}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            quality === "480p" ? "bg-indigo-600 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span>480p (FFmpeg)</span>
                          {quality === "480p" && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleQualitySelect("360p")}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            quality === "360p" ? "bg-indigo-600 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span>360p (FFmpeg)</span>
                          {quality === "360p" && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="touch-target p-2 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Tela cheia"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
