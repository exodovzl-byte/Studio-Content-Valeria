import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Film,
  Image as ImageIcon,
  Star,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  ASSIGNEES,
  CONTENT_TYPES,
  KANBAN_COLUMNS,
  PLATFORMS,
} from '../data/initialData';
import { compressImageFile } from '../firebase';
import {
  Assignee,
  ContentPost,
  ContentType,
  KanbanStatus,
  MediaItem,
  Platform,
} from '../types/content';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  MAX_MEDIA_ITEMS,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_SIZE_MB,
  extractInitialVideoThumbnail,
  formatFileSizeMB,
} from '../utils/videoThumbnail';
import { VideoThumbnailPickerModal } from './VideoThumbnailPickerModal';

interface ContentDetailModalProps {
  post: ContentPost | null;
  onClose: () => void;
  onUpdatePost: (postId: string, patch: Partial<ContentPost>) => void;
  onDeletePost: (postId: string) => void;
}

function revokeIfBlobUrl(url: string | undefined) {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore already-revoked blob URLs
    }
  }
}

export function ContentDetailModal({
  post,
  onClose,
  onUpdatePost,
  onDeletePost,
}: ContentDetailModalProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState<Assignee>('Andrés');
  const [commentText, setCommentText] = useState('');
  const [copiedCopy, setCopiedCopy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploadError(null);
    setPickerTargetId(null);
  }, [post?.id]);

  useEffect(() => {
    if (!post) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pickerTargetId) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [post, pickerTargetId, onClose]);

  if (!post) return null;

  const pickerItem = pickerTargetId
    ? (post.mediaItems || []).find(
        (m) => m.id === pickerTargetId && m.type === 'video' && Boolean(m.url)
      ) || null
    : null;

  const handleField = <K extends keyof ContentPost>(
    field: K,
    value: ContentPost[K]
  ) => {
    onUpdatePost(post.id, { [field]: value });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (!rawFiles.length) return;

    setUploadError(null);
    const existingMedia = post.mediaItems || [];
    const remainingSlots = Math.max(0, MAX_MEDIA_ITEMS - existingMedia.length);
    if (remainingSlots === 0) {
      setUploadError(
        `Límite alcanzado: máximo ${MAX_MEDIA_ITEMS} archivos por pieza.`
      );
      return;
    }

    const rejectedMessages: string[] = [];
    const acceptedFiles: File[] = [];

    for (const file of rawFiles) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        rejectedMessages.push(`"${file.name}" no es una imagen o video válido.`);
        continue;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        rejectedMessages.push(
          `"${file.name}" pesa ${formatFileSizeMB(file.size)} MB (límite máximo: ${MAX_VIDEO_SIZE_MB} MB por video).`
        );
        continue;
      }

      if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
        rejectedMessages.push(
          `"${file.name}" pesa ${formatFileSizeMB(file.size)} MB (límite máximo: ${MAX_IMAGE_SIZE_MB} MB por imagen).`
        );
        continue;
      }

      if (acceptedFiles.length >= remainingSlots) {
        rejectedMessages.push(
          `Solo se admitieron ${remainingSlots} archivo(s) más (máximo ${MAX_MEDIA_ITEMS} por pieza).`
        );
        break;
      }
      acceptedFiles.push(file);
    }

    if (rejectedMessages.length > 0) {
      setUploadError(rejectedMessages.join(' '));
    }

    if (acceptedFiles.length === 0) return;

    setProcessingUpload(true);
    try {
      const created: MediaItem[] = [];
      for (const file of acceptedFiles) {
        const isVideo = file.type.startsWith('video/');
        const id = `media-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;

        if (!isVideo) {
          const compressed = await compressImageFile(file, 720, 0.78);
          if (!compressed) {
            setUploadError(
              `No se pudo optimizar la imagen "${file.name}". Intenta con otra imagen más ligera.`
            );
            continue;
          }
          created.push({
            id,
            name: file.name,
            type: 'image',
            url: compressed,
            fileSizeMB: formatFileSizeMB(file.size),
          });
        } else {
          const localBlobUrl = URL.createObjectURL(file);
          const { thumbnailUrl } =
            await extractInitialVideoThumbnail(localBlobUrl);
          created.push({
            id,
            name: file.name,
            type: 'video',
            url: localBlobUrl,
            thumbnailUrl: thumbnailUrl || undefined,
            fileSizeMB: formatFileSizeMB(file.size),
          });
        }
      }

      if (created.length === 0) return;

      const nextMedia = [...existingMedia, ...created];
      const firstUploadedVideo = created.find((m) => m.type === 'video');
      const fallbackCover =
        nextMedia.find((m) => m.type === 'image' && m.url)?.url ||
        nextMedia.find((m) => m.type === 'video' && m.thumbnailUrl)
          ?.thumbnailUrl ||
        '';
      const hasAnyVideo = nextMedia.some((m) => m.type === 'video');

      onUpdatePost(post.id, {
        mediaItems: nextMedia,
        mediaType: hasAnyVideo ? 'video' : post.mediaType,
        coverUrl:
          post.coverUrl ||
          firstUploadedVideo?.thumbnailUrl ||
          fallbackCover,
      });

      // Open frame picker automatically so the user can pick the exact thumbnail for their video
      if (firstUploadedVideo) {
        setPickerTargetId(firstUploadedVideo.id);
      }
    } finally {
      setProcessingUpload(false);
    }
  };

  const handleSelectVideoThumbnail = (mediaId: string, dataUrl: string) => {
    const nextMedia = (post.mediaItems || []).map((item) =>
      item.id === mediaId ? { ...item, thumbnailUrl: dataUrl } : item
    );
    onUpdatePost(post.id, {
      mediaItems: nextMedia,
      mediaType: 'video',
      coverUrl: dataUrl,
    });
  };

  const removeMedia = (mediaId: string) => {
    const removed = (post.mediaItems || []).find((m) => m.id === mediaId);
    if (removed) {
      revokeIfBlobUrl(removed.url);
    }
    if (pickerTargetId === mediaId) {
      setPickerTargetId(null);
    }

    const nextMedia = (post.mediaItems || []).filter((m) => m.id !== mediaId);
    const removedVisualUrl =
      removed?.type === 'video' ? removed.thumbnailUrl : removed?.url;
    const fallbackCover =
      nextMedia.find((m) => m.type === 'image' && m.url)?.url ||
      nextMedia.find((m) => m.type === 'video' && m.thumbnailUrl)
        ?.thumbnailUrl ||
      '';
    const nextCover =
      removedVisualUrl && post.coverUrl === removedVisualUrl
        ? fallbackCover
        : post.coverUrl;
    const stillHasVideo = nextMedia.some((m) => m.type === 'video');

    onUpdatePost(post.id, {
      mediaItems: nextMedia,
      mediaType: stillHasVideo ? 'video' : 'image',
      coverUrl: nextCover,
    });
  };

  const setAsCover = (url: string) => {
    if (!url) return;
    onUpdatePost(post.id, { coverUrl: url });
  };

  const handleDeleteCurrentPost = () => {
    (post.mediaItems || []).forEach((item) => revokeIfBlobUrl(item.url));
    onDeletePost(post.id);
    onClose();
  };

  const addChecklistItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const item = {
      id: `chk-${Date.now()}`,
      text: newTaskText.trim(),
      done: false,
    };
    onUpdatePost(post.id, { checklist: [...(post.checklist || []), item] });
    setNewTaskText('');
  };

  const toggleChecklistItem = (itemId: string) => {
    const updated = (post.checklist || []).map((i) =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    onUpdatePost(post.id, { checklist: updated });
  };

  const deleteChecklistItem = (itemId: string) => {
    const updated = (post.checklist || []).filter((i) => i.id !== itemId);
    onUpdatePost(post.id, { checklist: updated });
  };

  const addComment = (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment = {
      id: `cmt-${Date.now()}`,
      author: commentAuthor,
      text: commentText.trim(),
      time: 'Ahora mismo',
    };
    onUpdatePost(post.id, {
      comments: [...(post.comments || []), newComment],
    });
    setCommentText('');
  };

  const handleCopyFullCaption = () => {
    const parts = [post.caption, post.cta, post.hashtags]
      .map((s) => (s || '').trim())
      .filter(Boolean);
    if (!parts.length) return;
    navigator.clipboard?.writeText(parts.join('\n\n')).then(() => {
      setCopiedCopy(true);
      setTimeout(() => setCopiedCopy(false), 1800);
    });
  };

  const doneCount = post.checklist?.filter((c) => c.done).length || 0;
  const totalCount = post.checklist?.length || 0;
  const progressPct =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editar pieza: ${post.title}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[94dvh] sm:max-h-[92vh] rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Grab Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="hidden sm:inline text-xs font-medium text-slate-400 dark:text-zinc-500 shrink-0">
              Pieza:
            </span>
            <input
              type="text"
              value={post.title}
              onChange={(e) => handleField('title', e.target.value)}
              aria-label="Título de la pieza"
              className="w-full min-w-0 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:bg-slate-100/70 dark:focus:bg-zinc-800/70 px-2 py-1.5 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyFullCaption}
              className="inline-flex items-center justify-center gap-1.5 min-w-[38px] min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
              title="Copiar caption, CTA y hashtags"
            >
              {copiedCopy ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copiar texto</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDeleteCurrentPost}
              className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Eliminar pieza"
              aria-label="Eliminar pieza"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Cerrar"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Two-Column Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-zinc-800">
          {/* Left Column: Media & Copy */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 sm:space-y-5">
            {/* Multimedia */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    Multimedia de referencia
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    Videos hasta {MAX_VIDEO_SIZE_MB} MB (elige el fotograma de miniatura) · Imágenes hasta {MAX_IMAGE_SIZE_MB} MB
                  </p>
                </div>
                <button
                  type="button"
                  disabled={processingUpload}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {processingUpload ? 'Procesando...' : 'Subir archivo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {uploadError && (
                <div className="mb-2.5 flex items-start justify-between gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    aria-label="Cerrar error de subida"
                    className="p-0.5 rounded hover:bg-rose-500/15 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {post.coverUrl &&
                  (!post.mediaItems || post.mediaItems.length === 0) && (
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800">
                      <img
                        src={post.coverUrl}
                        alt="Portada"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-white">
                        Portada
                      </span>
                    </div>
                  )}

                {(post.mediaItems || []).map((item) => {
                  const visualCoverCandidate =
                    item.type === 'video' ? item.thumbnailUrl || '' : item.url;
                  const isCover =
                    Boolean(visualCoverCandidate) &&
                    post.coverUrl === visualCoverCandidate;
                  const hasLiveVideoStream =
                    item.type === 'video' && Boolean(item.url);
                  const videoPoster = item.thumbnailUrl || post.coverUrl || '';

                  return (
                    <div
                      key={item.id}
                      className={`group relative aspect-square rounded-lg overflow-hidden border bg-slate-100 dark:bg-zinc-800 ${
                        isCover
                          ? 'border-indigo-500 ring-1 ring-indigo-500/40'
                          : 'border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      {item.type === 'video' ? (
                        hasLiveVideoStream ? (
                          <video
                            src={item.url}
                            poster={videoPoster || undefined}
                            controls
                            playsInline
                            className="w-full h-full object-cover bg-black"
                          />
                        ) : videoPoster ? (
                          <div className="relative w-full h-full">
                            <img
                              src={videoPoster}
                              alt={`Miniatura de ${item.name}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-medium text-white">
                              <Film className="w-2.5 h-2.5" />
                              Miniatura
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center bg-zinc-900 text-zinc-400">
                            <Film className="w-5 h-5" />
                            <span className="text-[10px] leading-tight">
                              Video sin miniatura
                            </span>
                          </div>
                        )
                      ) : (
                        <img
                          src={item.url}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}

                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {hasLiveVideoStream && (
                          <button
                            type="button"
                            onClick={() => setPickerTargetId(item.id)}
                            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-indigo-600/95 text-white hover:bg-indigo-500 text-[10px] font-semibold shadow-sm"
                            title="Elegir fotograma del video como portada / miniatura"
                          >
                            <Film className="w-3 h-3" />
                            <span>Miniatura</span>
                          </button>
                        )}
                        {visualCoverCandidate && !isCover && (
                          <button
                            type="button"
                            onClick={() => setAsCover(visualCoverCandidate)}
                            className="p-1.5 sm:p-1 rounded-md bg-black/75 text-white hover:bg-indigo-600"
                            title="Usar como portada del feed"
                          >
                            <Star className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(item.id)}
                          className="p-1.5 sm:p-1 rounded-md bg-black/75 text-white hover:bg-rose-600"
                          title="Quitar archivo"
                        >
                          <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>

                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white truncate pointer-events-none">
                        {isCover ? 'Portada · ' : ''}
                        {item.name}
                        {typeof item.fileSizeMB === 'number'
                          ? ` (${item.fileSizeMB} MB)`
                          : ''}
                      </div>
                    </div>
                  );
                })}

                {!post.coverUrl &&
                  (!post.mediaItems || post.mediaItems.length === 0) && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="col-span-2 sm:col-span-3 py-7 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-xs text-slate-500 dark:text-zinc-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <UploadCloud className="w-5 h-5 mb-1.5" />
                      Sube artes finales, fotos o clips (máx. {MAX_VIDEO_SIZE_MB} MB por video)
                    </button>
                  )}
              </div>
            </div>

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  Caption / Copy
                </label>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {(post.caption || '').length} caracteres
                </span>
              </div>
              <textarea
                rows={4}
                value={post.caption || ''}
                onChange={(e) => handleField('caption', e.target.value)}
                placeholder="Escribe el copy principal de la publicación..."
                className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-3 text-xs sm:text-sm leading-relaxed text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            {/* CTA & Hashtags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                  Llamado a la acción (CTA)
                </label>
                <textarea
                  rows={2}
                  value={post.cta || ''}
                  onChange={(e) => handleField('cta', e.target.value)}
                  placeholder="Ej. Comenta 'DROP' o visita el link..."
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                  Hashtags
                </label>
                <textarea
                  rows={2}
                  value={post.hashtags || ''}
                  onChange={(e) => handleField('hashtags', e.target.value)}
                  placeholder="#Tag1 #Tag2 #Tag3"
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 p-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>

            {/* Internal Production Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Notas internas de producción
              </label>
              <textarea
                rows={2}
                value={post.internalNotes || ''}
                onChange={(e) => handleField('internalNotes', e.target.value)}
                placeholder="Especificaciones técnicas, referencias de color, tiempos..."
                className="w-full rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          {/* Right Column: Metadata, Checklist, Comments */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-5 bg-slate-50/60 dark:bg-zinc-950/35">
            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Etapa Kanban
                </label>
                <select
                  value={post.status}
                  onChange={(e) =>
                    handleField('status', e.target.value as KanbanStatus)
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 font-medium"
                >
                  {KANBAN_COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Plataforma
                </label>
                <select
                  value={post.platform}
                  onChange={(e) =>
                    handleField('platform', e.target.value as Platform)
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 font-medium"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Tipo de contenido
                </label>
                <select
                  value={post.contentType}
                  onChange={(e) =>
                    handleField('contentType', e.target.value as ContentType)
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 font-medium"
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Responsable
                </label>
                <select
                  value={post.assignee}
                  onChange={(e) =>
                    handleField('assignee', e.target.value as Assignee)
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 font-medium"
                >
                  {ASSIGNEES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={post.date || ''}
                  onChange={(e) => handleField('date', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  value={post.time || '18:00'}
                  onChange={(e) => handleField('time', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  Checklist de subtareas
                </span>
                <span className="text-[11px] font-mono tabular-nums font-medium text-indigo-600 dark:text-indigo-400">
                  {doneCount}/{totalCount} ({progressPct}%)
                </span>
              </div>

              {totalCount > 0 && (
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden mb-2.5">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              <div className="space-y-1.5 mb-2.5">
                {(post.checklist || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-zinc-800"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span
                        className={
                          item.done
                            ? 'line-through text-slate-400 dark:text-zinc-500'
                            : 'text-slate-800 dark:text-zinc-200'
                        }
                      >
                        {item.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => deleteChecklistItem(item.id)}
                      className="text-slate-400 hover:text-rose-500 shrink-0"
                      aria-label="Eliminar subtarea"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={addChecklistItem} className="flex gap-1.5">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Nueva subtarea..."
                  className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-medium hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  Añadir
                </button>
              </form>
            </div>

            {/* Team Comments */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800">
              <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-2">
                Comentarios del equipo
              </span>

              <div className="space-y-2 max-h-44 overflow-y-auto mb-2.5">
                {(post.comments || []).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {c.author}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {c.time}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-300 leading-snug">
                      {c.text}
                    </p>
                  </div>
                ))}
                {(!post.comments || post.comments.length === 0) && (
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Sin comentarios aún.
                  </p>
                )}
              </div>

              <form
                onSubmit={addComment}
                className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-1.5"
              >
                <select
                  value={commentAuthor}
                  onChange={(e) =>
                    setCommentAuthor(e.target.value as Assignee)
                  }
                  aria-label="Autor del comentario"
                  className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-2 sm:py-1.5 text-xs font-medium shrink-0"
                >
                  {ASSIGNEES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escribir nota..."
                  className="flex-1 min-w-[140px] rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-2 sm:py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {pickerItem && (
        <div onClick={(e) => e.stopPropagation()}>
          <VideoThumbnailPickerModal
            open={Boolean(pickerItem)}
            videoUrl={pickerItem.url}
            videoName={pickerItem.name}
            onClose={() => setPickerTargetId(null)}
            onSelectThumbnail={(dataUrl) =>
              handleSelectVideoThumbnail(pickerItem.id, dataUrl)
            }
          />
        </div>
      )}
    </div>
  );
}
