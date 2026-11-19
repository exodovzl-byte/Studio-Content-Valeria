import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  CONTENT_TYPES,
  CURRENT_MONTH,
  CURRENT_YEAR,
  KANBAN_COLUMNS,
  PLATFORMS,
  PLATFORM_STYLES,
  STATUS_CAL_STYLES,
  TODAY_KEY,
  formatDateKey,
} from '../data/initialData';
import { ContentPost, ContentType } from '../types/content';

interface CalendarViewProps {
  posts: ContentPost[];
  onSelectPost: (postId: string) => void;
  onQuickCreate: (dateStr: string) => void;
}

type CalendarCell =
  | { type: 'empty'; key: string }
  | { type: 'day'; day: number; key: string };

export function CalendarView({
  posts,
  onSelectPost,
  onQuickCreate,
}: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(
    () => new Date(CURRENT_YEAR, CURRENT_MONTH, 1)
  );
  const [colorBy, setColorBy] = useState<'platform' | 'status'>('platform');
  const [selectedType, setSelectedType] = useState<'Todos' | ContentType>(
    'Todos'
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
  const firstDayIndex = new Date(year, month, 1).getDay();
  const mondayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const filteredPosts = useMemo(() => {
    return posts.filter((p) =>
      selectedType === 'Todos' ? true : p.contentType === selectedType
    );
  }, [posts, selectedType]);

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    filteredPosts.forEach((p) => {
      if (!p.date) return;
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });
    return map;
  }, [filteredPosts]);

  const cells = useMemo<CalendarCell[]>(() => {
    const list: CalendarCell[] = [];
    for (let i = 0; i < mondayOffset; i++) {
      list.push({ type: 'empty', key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(year, month, d);
      list.push({ type: 'day', day: d, key });
    }
    while (list.length % 7 !== 0) {
      list.push({ type: 'empty', key: `tail-${list.length}` });
    }
    return list;
  }, [year, month, mondayOffset, daysInMonth]);

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white dark:bg-zinc-900/75 border border-slate-200 dark:border-zinc-800 rounded-xl p-3">
        {/* Month Navigation */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Mes anterior"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold capitalize min-w-[144px] text-center">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Mes siguiente"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewDate(new Date(CURRENT_YEAR, CURRENT_MONTH, 1))}
            className="ml-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            Hoy
          </button>
        </div>

        {/* Content Type Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 xl:pb-0">
          {(['Todos', ...CONTENT_TYPES] as const).map((type) => {
            const active = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-700/70'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Color Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg self-start xl:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setColorBy('platform')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              colorBy === 'platform'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            Por Plataforma
          </button>
          <button
            type="button"
            onClick={() => setColorBy('status')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              colorBy === 'status'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            Por Estado
          </button>
        </div>
      </div>

      {/* Inline Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs text-slate-500 dark:text-zinc-400">
        {colorBy === 'platform'
          ? PLATFORMS.map((pl) => (
              <span
                key={pl}
                className={`font-medium ${PLATFORM_STYLES[pl].text}`}
              >
                {pl}
              </span>
            ))
          : KANBAN_COLUMNS.map((col) => (
              <span key={col.id} className={`font-medium ${col.accentText}`}>
                {col.title}
              </span>
            ))}
      </div>

      {/* Monthly Grid */}
      <div className="bg-white dark:bg-zinc-900/65 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="py-2.5 px-2 text-center text-xs font-semibold text-slate-500 dark:text-zinc-400"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/80 dark:divide-zinc-800/80">
          {cells.map((cell) => {
            if (cell.type === 'empty') {
              return (
                <div
                  key={cell.key}
                  className="min-h-[118px] bg-slate-50/50 dark:bg-zinc-950/35"
                />
              );
            }

            const dayPosts = postsByDate[cell.key] || [];
            const isToday = cell.key === TODAY_KEY;

            return (
              <div
                key={cell.key}
                className={`min-h-[118px] p-1.5 flex flex-col gap-1 group transition-colors hover:bg-slate-50/75 dark:hover:bg-zinc-800/25 ${
                  isToday ? 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.07]' : ''
                }`}
              >
                <div className="flex items-center justify-between px-1">
                  <span
                    className={`text-xs font-mono tabular-nums w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-zinc-400 font-medium'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQuickCreate(cell.key)}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-opacity"
                    title="Programar pieza en esta fecha"
                    aria-label={`Programar pieza el ${cell.key}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[98px]">
                  {dayPosts.map((post) => {
                    const colorClass =
                      colorBy === 'platform'
                        ? PLATFORM_STYLES[post.platform]?.cal
                        : STATUS_CAL_STYLES[post.status];
                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => onSelectPost(post.id)}
                        className={`w-full text-left px-2 py-1 rounded-md text-[11px] leading-tight transition-opacity hover:opacity-85 ${colorClass}`}
                      >
                        <div className="flex items-center justify-between gap-1 font-semibold">
                          <span className="truncate">{post.title}</span>
                          {post.time && (
                            <span className="text-[10px] font-mono tabular-nums opacity-80 shrink-0">
                              {post.time}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-80 truncate mt-0.5">
                          {post.contentType} · {PLATFORM_STYLES[post.platform].short}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
