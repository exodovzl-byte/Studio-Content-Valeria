import { DragEvent, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  GripVertical,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { KANBAN_COLUMNS, PLATFORM_STYLES } from '../data/initialData';
import { ContentPost, KanbanStatus } from '../types/content';

interface KanbanBoardProps {
  posts: ContentPost[];
  onMovePost: (postId: string, nextStatus: KanbanStatus) => void;
  onSelectPost: (postId: string) => void;
  onQuickCreateInColumn: (colId: KanbanStatus) => void;
}

export function KanbanBoard({
  posts,
  onMovePost,
  onSelectPost,
  onQuickCreateInColumn,
}: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanStatus | null>(null);
  const [activeMobileCol, setActiveMobileCol] =
    useState<KanbanStatus>('estrategia');

  const handleDrop = (e: DragEvent<HTMLElement>, colId: KanbanStatus) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain') || draggedId;
    if (postId) {
      onMovePost(postId, colId);
    }
    setDraggedId(null);
    setDragOverCol(null);
  };

  const mobileColIndex = Math.max(
    0,
    KANBAN_COLUMNS.findIndex((c) => c.id === activeMobileCol)
  );
  const mobileCol = KANBAN_COLUMNS[mobileColIndex] || KANBAN_COLUMNS[0];
  const mobileColPosts = posts.filter((p) => p.status === mobileCol.id);
  const mobilePrevCol =
    mobileColIndex > 0 ? KANBAN_COLUMNS[mobileColIndex - 1] : null;
  const mobileNextCol =
    mobileColIndex < KANBAN_COLUMNS.length - 1
      ? KANBAN_COLUMNS[mobileColIndex + 1]
      : null;

  return (
    <>
      {/* ==================== MOBILE SINGLE-STAGE KANBAN (< md) ==================== */}
      <div className="md:hidden space-y-3">
        {/* Horizontal Stage Switcher */}
        <div
          role="tablist"
          aria-label="Etapas del tablero Kanban"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
        >
          {KANBAN_COLUMNS.map((col) => {
            const count = posts.filter((p) => p.status === col.id).length;
            const active = col.id === mobileCol.id;
            return (
              <button
                key={col.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveMobileCol(col.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
                }`}
              >
                <span>{col.shortTitle}</span>
                <span
                  className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                    active
                      ? 'bg-white/20 text-white dark:bg-zinc-950/15 dark:text-zinc-950'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Header */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75">
          <div className="min-w-0">
            <h3
              className={`text-xs font-semibold truncate ${mobileCol.accentText}`}
            >
              {mobileCol.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
              {mobileCol.owner}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onQuickCreateInColumn(mobileCol.id)}
            className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>

        {/* Full-Width Touch Cards */}
        <div className="space-y-3">
          {mobileColPosts.map((post) => {
            const doneCount = post.checklist?.filter((i) => i.done).length || 0;
            const totalCount = post.checklist?.length || 0;
            const platformMeta =
              PLATFORM_STYLES[post.platform] || PLATFORM_STYLES.Instagram;

            return (
              <article
                key={post.id}
                onClick={() => onSelectPost(post.id)}
                className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 active:scale-[0.99] transition-transform cursor-pointer shadow-2xs"
              >
                <div className="flex gap-3">
                  {post.coverUrl && (
                    <div className="relative w-20 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-zinc-800">
                      <img
                        src={post.coverUrl}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold leading-snug text-slate-900 dark:text-zinc-100 line-clamp-2">
                        {post.title}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                        <span className={`font-semibold ${platformMeta.text}`}>
                          {post.platform}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{post.contentType}</span>
                        {post.date && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {post.date.slice(5)}
                              {post.time ? ` ${post.time}` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {post.assignee?.[0] || 'A'}
                        </span>
                        <span className="truncate">{post.assignee}</span>
                      </span>

                      <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                        {totalCount > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              doneCount === totalCount
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : ''
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            {doneCount}/{totalCount}
                          </span>
                        )}
                        {post.comments?.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {post.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Touch-Friendly Stage Controls */}
                <div
                  className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={!mobilePrevCol}
                    onClick={() =>
                      mobilePrevCol && onMovePost(post.id, mobilePrevCol.id)
                    }
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {mobilePrevCol ? mobilePrevCol.shortTitle : 'Inicio'}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!mobileNextCol}
                    onClick={() =>
                      mobileNextCol && onMovePost(post.id, mobileNextCol.id)
                    }
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 rounded-lg text-xs font-semibold bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 hover:bg-indigo-600/15 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <span className="truncate">
                      {mobileNextCol ? mobileNextCol.shortTitle : 'Final'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </article>
            );
          })}

          {mobileColPosts.length === 0 && (
            <div className="py-12 px-4 text-center text-xs text-slate-500 dark:text-zinc-400 border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl bg-white/50 dark:bg-zinc-900/30">
              <p>Sin piezas en {mobileCol.shortTitle}</p>
              <button
                type="button"
                onClick={() => onQuickCreateInColumn(mobileCol.id)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear pieza aquí
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== DESKTOP 5-COLUMN KANBAN (md+) ==================== */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4 items-start">
        {KANBAN_COLUMNS.map((col, colIndex) => {
          const colPosts = posts.filter((p) => p.status === col.id);
          const isOver = dragOverCol === col.id;
          const prevCol = colIndex > 0 ? KANBAN_COLUMNS[colIndex - 1] : null;
          const nextCol =
            colIndex < KANBAN_COLUMNS.length - 1
              ? KANBAN_COLUMNS[colIndex + 1]
              : null;

          return (
            <section
              key={col.id}
              aria-label={col.title}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-76 xl:w-80 shrink-0 rounded-xl border transition-colors flex flex-col max-h-[calc(100vh-168px)] ${
                isOver
                  ? 'border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08]'
                  : 'border-slate-200 dark:border-zinc-800/90 bg-slate-100/75 dark:bg-zinc-900/55'
              }`}
            >
              {/* Column Header */}
              <div className="px-3.5 py-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`text-xs font-semibold truncate ${col.accentText}`}
                  >
                    {col.title}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold tabular-nums text-slate-600 dark:text-zinc-400 shrink-0">
                    {colPosts.length}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="truncate">{col.owner}</span>
                  <button
                    type="button"
                    onClick={() => onQuickCreateInColumn(col.id)}
                    className="inline-flex items-center gap-1 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Añadir
                  </button>
                </div>
              </div>

              {/* Cards Stack */}
              <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                {colPosts.map((post) => {
                  const doneCount =
                    post.checklist?.filter((i) => i.done).length || 0;
                  const totalCount = post.checklist?.length || 0;
                  const platformMeta =
                    PLATFORM_STYLES[post.platform] || PLATFORM_STYLES.Instagram;

                  return (
                    <article
                      key={post.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedId(post.id);
                        e.dataTransfer.setData('text/plain', post.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => onSelectPost(post.id)}
                      className={`group rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-150 cursor-pointer ${
                        draggedId === post.id ? 'opacity-45 scale-[0.98]' : ''
                      }`}
                    >
                      {post.coverUrl && (
                        <div className="relative h-28 w-full rounded-md overflow-hidden mb-2.5 bg-slate-100 dark:bg-zinc-800">
                          <img
                            src={post.coverUrl}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
                          <span className="absolute bottom-1.5 left-2 text-[11px] font-medium text-white/95">
                            {post.contentType}
                          </span>
                        </div>
                      )}

                      {/* Title & drag affordance */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[13px] font-semibold leading-snug text-slate-900 dark:text-zinc-100 line-clamp-2">
                          {post.title}
                        </h4>
                        <GripVertical
                          aria-hidden="true"
                          className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 shrink-0 mt-0.5"
                        />
                      </div>

                      {/* Clean unboxed metadata row */}
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                        <span className={`font-semibold ${platformMeta.text}`}>
                          {post.platform}
                        </span>
                        {!post.coverUrl && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{post.contentType}</span>
                          </>
                        )}
                        {post.date && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {post.date.slice(5)}
                              {post.time ? ` ${post.time}` : ''}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Footer: Assignee + Counters */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-800 text-[9px] font-bold flex items-center justify-center shrink-0">
                            {post.assignee?.[0] || 'A'}
                          </span>
                          <span className="truncate">{post.assignee}</span>
                        </span>

                        <div className="flex items-center gap-2.5 font-mono tabular-nums shrink-0">
                          {totalCount > 0 && (
                            <span
                              className={`inline-flex items-center gap-1 ${
                                doneCount === totalCount
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : ''
                              }`}
                            >
                              <CheckSquare className="w-3 h-3" />
                              {doneCount}/{totalCount}
                            </span>
                          )}
                          {post.comments?.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {post.comments.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Stage Controls */}
                      <div
                        className="mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={!prevCol}
                          onClick={() =>
                            prevCol && onMovePost(post.id, prevCol.id)
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                          title={
                            prevCol ? `Mover a ${prevCol.title}` : undefined
                          }
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Atrás
                        </button>
                        <button
                          type="button"
                          disabled={!nextCol}
                          onClick={() =>
                            nextCol && onMovePost(post.id, nextCol.id)
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                          title={
                            nextCol ? `Avanzar a ${nextCol.title}` : undefined
                          }
                        >
                          Avanzar
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </article>
                  );
                })}

                {colPosts.length === 0 && (
                  <div className="py-10 px-3 text-center text-xs text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
                    <p>Sin piezas en esta etapa</p>
                    <button
                      type="button"
                      onClick={() => onQuickCreateInColumn(col.id)}
                      className="mt-2 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Crear pieza
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
