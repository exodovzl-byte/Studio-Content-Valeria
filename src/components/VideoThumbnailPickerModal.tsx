import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Pause,
  Play,
  X,
} from 'lucide-react';
import {
  captureVideoFrameDataUrl,
  extractVideoFrameStrip,
  formatMediaTime,
} from '../utils/videoThumbnail';

interface VideoThumbnailPickerModalProps {
  open: boolean;
  videoUrl: string;
  videoName: string;
  onClose: () => void;
  onSelectThumbnail: (thumbnailDataUrl: string) => void;
}

export function VideoThumbnailPickerModal({
  open,
  videoUrl,
  videoName,
  onClose,
  onSelectThumbnail,
}: VideoThumbnailPickerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [stripFrames, setStripFrames] = useState<
    Array<{ timeSec: number; previewUrl: string }>
  >([]);
  const [loadingStrip, setLoadingStrip] = useState<boolean>(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !videoUrl) return;
    let cancelled = false;
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setVideoReady(false);
    setCaptureError(null);
    setStripFrames([]);
    setLoadingStrip(true);

    extractVideoFrameStrip(videoUrl, 6)
      .then((frames) => {
        if (!cancelled) {
          setStripFrames(frames);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStrip(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, videoUrl]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open || !videoUrl) return null;

  const seekTo = (nextTime: number) => {
    const v = videoRef.current;
    if (!v) return;
    const maxT = duration > 0 ? duration : v.duration || 0;
    const clamped = Math.max(0, Math.min(maxT, nextTime));
    try {
      v.pause();
      setIsPlaying(false);
      v.currentTime = clamped;
      setCurrentTime(clamped);
    } catch {
      // Ignore seek errors while loading
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleConfirmFrame = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setIsPlaying(false);
    setCaptureError(null);

    const captured = captureVideoFrameDataUrl(v, 720, 175000);
    if (!captured) {
      setCaptureError(
        'No se pudo capturar este fotograma. Mueve ligeramente el deslizador e intenta nuevamente.'
      );
      return;
    }
    onSelectThumbnail(captured);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar miniatura del video"
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[94dvh] rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                Elegir portada / miniatura del video
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                {videoName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector de miniatura"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Live Video Frame Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[340px] w-full flex items-center justify-center border border-slate-200 dark:border-zinc-800">
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) {
                  setDuration(dur);
                  const starter = Math.min(Math.max(dur * 0.12, 0.25), Math.max(dur - 0.1, 0));
                  e.currentTarget.currentTime = starter;
                  setCurrentTime(starter);
                }
                setVideoReady(true);
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onEnded={() => setIsPlaying(false)}
              className="max-h-[340px] w-full h-full object-contain"
            />

            <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-md bg-black/75 text-white font-mono tabular-nums text-[11px]">
              {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
            </div>
          </div>

          {/* Interactive Timeline Scrubber & Step Controls */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-600 dark:text-zinc-300">
              <span>Desliza para elegir el momento exacto de la portada</span>
              <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                {formatMediaTime(currentTime)}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 1}
              step={0.05}
              value={Math.min(currentTime, duration > 0 ? duration : 1)}
              disabled={!videoReady || duration <= 0}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              aria-label="Línea de tiempo del video"
              className="w-full accent-indigo-600 cursor-pointer"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!videoReady}
                  onClick={togglePlay}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Reproducir
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!videoReady}
                  onClick={() => seekTo(currentTime - 1)}
                  className="inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                  title="Retroceder 1 segundo"
                >
                  <ChevronLeft className="w-3 h-3" />
                  1s
                </button>
                <button
                  type="button"
                  disabled={!videoReady}
                  onClick={() => seekTo(currentTime - 0.1)}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                  title="Retroceder 0.1 segundos"
                >
                  -0.1s
                </button>
                <button
                  type="button"
                  disabled={!videoReady}
                  onClick={() => seekTo(currentTime + 0.1)}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                  title="Avanzar 0.1 segundos"
                >
                  +0.1s
                </button>
                <button
                  type="button"
                  disabled={!videoReady}
                  onClick={() => seekTo(currentTime + 1)}
                  className="inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                  title="Avanzar 1 segundo"
                >
                  1s
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick-Pick Frame Strip */}
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-2">
              {loadingStrip
                ? 'Generando fotogramas sugeridos...'
                : 'Fotogramas rápidos (toca cualquiera para saltar)'}
            </div>
            {stripFrames.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {stripFrames.map((frame, idx) => {
                  const isNear = Math.abs(frame.timeSec - currentTime) < 0.25;
                  return (
                    <button
                      key={`${frame.timeSec}-${idx}`}
                      type="button"
                      onClick={() => seekTo(frame.timeSec)}
                      className={`relative aspect-video rounded-lg overflow-hidden border transition-all ${
                        isNear
                          ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                          : 'border-slate-200 dark:border-zinc-700 hover:border-indigo-400'
                      }`}
                    >
                      <img
                        src={frame.previewUrl}
                        alt={`Fotograma ${formatMediaTime(frame.timeSec)}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/75 text-[9px] font-mono text-white">
                        {formatMediaTime(frame.timeSec)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {captureError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {captureError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:inline">
            La miniatura se guarda comprimida en la nube para el Feed de IG y TikTok.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!videoReady}
              onClick={handleConfirmFrame}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <Check className="w-3.5 h-3.5 -ml-1" />
              Usar este fotograma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
