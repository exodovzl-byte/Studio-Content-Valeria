export const MAX_VIDEO_SIZE_MB = 50;
export const MAX_IMAGE_SIZE_MB = 15;
export const MAX_MEDIA_ITEMS = 10;

export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const tenths = Math.floor((seconds - totalSec) * 10);
  return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatFileSizeMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

/**
 * Captures the currently displayed frame from an HTMLVideoElement into a bounded
 * JPEG data URL that fits cleanly inside Firestore document size limits.
 */
export function captureVideoFrameDataUrl(
  video: HTMLVideoElement,
  maxDimension = 720,
  maxBytes = 175000
): string {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (vw === 0 || vh === 0) return '';

  const renderAt = (targetMax: number, quality: number): string => {
    const scale = Math.min(1, targetMax / Math.max(vw, vh));
    const width = Math.max(1, Math.round(vw * scale));
    const height = Math.max(1, Math.round(vh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  };

  const attempts: Array<[number, number]> = [
    [maxDimension, 0.82],
    [maxDimension, 0.68],
    [Math.round(maxDimension * 0.8), 0.62],
    [Math.round(maxDimension * 0.65), 0.55],
    [480, 0.5],
  ];

  for (const [dim, q] of attempts) {
    try {
      const candidate = renderAt(dim, q);
      if (candidate && candidate.length <= maxBytes) {
        return candidate;
      }
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Seeks an offscreen video element to a non-black initial timestamp and extracts
 * an automatic starter thumbnail + video duration in seconds.
 */
export function extractInitialVideoThumbnail(
  videoUrl: string
): Promise<{ thumbnailUrl: string; durationSec: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let settled = false;
    const finish = (thumbnailUrl: string, durationSec: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute('src');
      video.load();
      resolve({ thumbnailUrl, durationSec });
    };

    const timeoutId = setTimeout(() => finish('', 0), 8000);

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime =
        duration > 0 ? Math.min(Math.max(duration * 0.12, 0.25), Math.max(duration - 0.1, 0)) : 0;
      try {
        video.currentTime = targetTime;
      } catch {
        finish(captureVideoFrameDataUrl(video, 720, 170000), duration);
      }
    };

    video.onseeked = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const thumb = captureVideoFrameDataUrl(video, 720, 170000);
      finish(thumb, duration);
    };

    video.onerror = () => finish('', 0);
    video.src = videoUrl;
  });
}

/**
 * Extracts a strip of evenly spaced low-weight preview frames from a local video URL
 * so the user can tap any frame or scrub precisely.
 */
export function extractVideoFrameStrip(
  videoUrl: string,
  count = 6
): Promise<Array<{ timeSec: number; previewUrl: string }>> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let settled = false;
    const frames: Array<{ timeSec: number; previewUrl: string }> = [];
    let targets: number[] = [];
    let index = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute('src');
      video.load();
      resolve(frames);
    };

    const timeoutId = setTimeout(finish, 12000);

    const seekNext = () => {
      if (index >= targets.length) {
        finish();
        return;
      }
      try {
        video.currentTime = targets[index];
      } catch {
        finish();
      }
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (duration <= 0) {
        finish();
        return;
      }
      const safeEnd = Math.max(0, duration - 0.08);
      if (count <= 1 || safeEnd <= 0.1) {
        targets = [0];
      } else {
        targets = Array.from({ length: count }, (_, i) => {
          const ratio = i / (count - 1);
          return Math.round(ratio * safeEnd * 100) / 100;
        });
      }
      seekNext();
    };

    video.onseeked = () => {
      const previewUrl = captureVideoFrameDataUrl(video, 220, 28000);
      if (previewUrl) {
        frames.push({ timeSec: targets[index], previewUrl });
      }
      index += 1;
      seekNext();
    };

    video.onerror = () => finish();
    video.src = videoUrl;
  });
}
