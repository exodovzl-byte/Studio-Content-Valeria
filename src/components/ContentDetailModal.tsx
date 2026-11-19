import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
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

interface ContentDetailModalProps {
  post: ContentPost | null;
  onClose: () => void;
  onUpdatePost: (postId: string, patch: Partial<ContentPost>) => void;
  onDeletePost: (postId: string) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!post) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [post, onClose]);

  if (!post) return null;

  const handleField = <K extends keyof ContentPost>(
    field: K,
    value: ContentPost[K]
  ) => {
    onUpdatePost(post.id, { [field]: value });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const readPromises = files.map(async (file): Promise<MediaItem> => {
      const isVideo = file.type.startsWith('video/');
      const id = `media-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      if (!isVideo) {
        const compressed = await compressImageFile(file, 720, 0.78);
        return {
          id,
          name: file.name,
          type: 'image',
          url: compressed || URL.createObjectURL(file),
        };
      }

      return {
        id,
        name: file.name,
        type: 'video',
        url: URL.createObjectURL(file),
      };
    });

    Promise.all(readPromises).then((created) => {
      const nextMedia = [...(post.mediaItems || []), ...created];
      const firstImage = nextMedia.find((m) => m.type === 'image');
      onUpdatePost(post.id, {
        mediaItems: nextMedia,
        coverUrl: post.coverUrl || firstImage?.url || '',
      });
    });

    e.target.value = '';
  };

  const removeMedia = (mediaId: string) => {
    const removed = (post.mediaItems || []).find((m) => m.id === mediaId);
    const nextMedia = (post.mediaItems || []).filter((m) => m.id !== mediaId);
    const firstImage = nextMedia.find((m) => m.type === 'image');
    const nextCover =
      removed && post.coverUrl === removed.url
        ? firstImage?.url || ''
        : post.coverUrl;
    onUpdatePost(post.id, {
      mediaItems: nextMedia,
      coverUrl: nextCover,
    });
  };

  const setAsCover = (url: string) => {
    onUpdatePost(post.id, { coverUrl: url });
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 shrink-0">
              Pieza:
            </span>
            <input
              type="text"
              value={post.title}
              onChange={(e) => handleField('title', e.target.value)}
              aria-label="Título de la pieza"
              className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:bg-slate-100/70 dark:focus:bg-zinc-800/70 px-2 py-1 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyFullCaption}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
              title="Copiar caption, CTA y hashtags"
            >
              {copiedCopy ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar texto
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onDeletePost(post.id);
                onClose();
              }}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Eliminar pieza"
              aria-label="Eliminar pieza"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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
          <div className="lg:col-span-7 p-5 space-y-5">
            {/* Multimedia */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  Multimedia de referencia (imágenes, artes, videos)
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir archivo
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
                  const isCover = post.coverUrl === item.url;
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
                        <video
                          src={item.url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}

                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'image' && !isCover && (
                          <button
                            type="button"
                            onClick={() => setAsCover(item.url)}
                            className="p-1 rounded bg-black/70 text-white hover:bg-indigo-600"
                            title="Usar como portada"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(item.id)}
                          className="p-1 rounded bg-black/70 text-white hover:bg-rose-600"
                          title="Quitar archivo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white truncate">
                        {isCover ? 'Portada · ' : ''}
                        {item.name}
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
                      Sube artes finales, fotos o clips de referencia
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
          <div className="lg:col-span-5 p-5 space-y-5 bg-slate-50/60 dark:bg-zinc-950/35">
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

              <form onSubmit={addComment} className="flex gap-1.5">
                <select
                  value={commentAuthor}
                  onChange={(e) =>
                    setCommentAuthor(e.target.value as Assignee)
                  }
                  aria-label="Autor del comentario"
                  className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2 py-1.5 text-xs font-medium shrink-0"
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
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
