import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
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
import { ContentPost, ContentType, KanbanStatus } from '../types/content';

interface CalendarViewProps {
  posts: ContentPost[];
  onSelectPost: (postId: string) => void;
  onQuickCreate: (dateStr: string) => void;
}

type CalendarCell =
  | { type: 'empty'; key: string }
  | { type: 'day'; day: number; key: string };

const STATUS_DOT_STYLES: Record<KanbanStatus, string> = {
  estrategia: 'bg-amber-500',
  produccion: 'bg-purple-500',
  copywriting: 'bg-sky-500',
  programado: 'bg-indigo-500',
  publicado: 'bg-emerald-500',
};

function formatReadableDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function CalendarView({
  posts,
  onSelectPost,
  onQuickCreate,
}: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(
    () => new Date(CURRENT_YEAR, CURRENT_MONTH, 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string>(TODAY_KEY);
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

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const monthScheduledPosts = useMemo(() => {
    return filteredPosts
      .filter((p) => p.date && p.date.startsWith(monthPrefix))
      .sort((a, b) =>
        `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`)
      );
  }, [filteredPosts, monthPrefix]);

  const selectedDayPosts = postsByDate[selectedDateKey] || [];
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const shortWeekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const goToMonth = (nextYear: number, nextMonth: number) => {
    const nextDate = new Date(nextYear, nextMonth, 1);
    setViewDate(nextDate);
    if (
      nextDate.getFullYear() === CURRENT_YEAR &&
      nextDate.getMonth() === CURRENT_MONTH
    ) {
      setSelectedDateKey(TODAY_KEY);
    } else {
      setSelectedDateKey(
        formatDateKey(nextDate.getFullYear(), nextDate.getMonth(), 1)
      );
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-zinc-900/75 border border-slate-200 dark:border-zinc-800 rounded-xl p-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between xl:justify-start gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToMonth(year, month - 1)}
              className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Mes anterior"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold capitalize min-w-[136px] text-center">
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() => goToMonth(year, month + 1)}
              className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Mes siguiente"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setViewDate(new Date(CURRENT_YEAR, CURRENT_MONTH, 1));
              setSelectedDateKey(TODAY_KEY);
            }}
            className="px-3 py-1.5 sm:py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            Hoy
          </button>
        </div>

        {/* Content Type Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 xl:pb-0">
          {(['Todos', ...CONTENT_TYPES] as const).map((type) => {
            const active = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
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
        <div className="grid grid-cols-2 xl:flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg w-full sm:w-auto xl:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setColorBy('platform')}
            className={`px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
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
            className={`px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
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
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 px-1 text-xs text-slate-500 dark:text-zinc-400">
        {colorBy === 'platform'
          ? PLATFORMS.map((pl) => (
              <span
                key={pl}
                className={`inline-flex items-center gap-1.5 font-medium ${PLATFORM_STYLES[pl].text}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${PLATFORM_STYLES[pl].swatch}`}
                />
                {pl}
              </span>
            ))
          : KANBAN_COLUMNS.map((col) => (
              <span
                key={col.id}
                className={`inline-flex items-center gap-1.5 font-medium ${col.accentText}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${STATUS_DOT_STYLES[col.id]}`}
                />
                <span className="md:hidden">{col.shortTitle}</span>
                <span className="hidden md:inline">{col.title}</span>
              </span>
            ))}
      </div>

      {/* ==================== MOBILE MINI CALENDAR + AGENDA (< md) ==================== */}
      <div className="md:hidden space-y-3.5">
        <div className="bg-white dark:bg-zinc-900/75 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
            {shortWeekDays.map((wd, idx) => (
              <div
                key={`${wd}-${idx}`}
                className="py-2 text-center text-[11px] font-semibold text-slate-500 dark:text-zinc-400"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 p-1.5">
            {cells.map((cell) => {
              if (cell.type === 'empty') {
                return <div key={cell.key} className="h-12" />;
              }

              const dayPosts = postsByDate[cell.key] || [];
              const isToday = cell.key === TODAY_KEY;
              const isSelected = cell.key === selectedDateKey;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.key)}
                  aria-label={`${cell.day} ${monthLabel}, ${dayPosts.length} piezas`}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isToday
                        ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-xs font-mono tabular-nums leading-none">
                    {cell.day}
                  </span>
                  <div className="flex items-center justify-center gap-0.5 h-1.5">
                    {dayPosts.slice(0, 3).map((post) => {
                      const dotClass =
                        colorBy === 'platform'
                          ? PLATFORM_STYLES[post.platform]?.swatch ||
                            'bg-indigo-500'
                          : STATUS_DOT_STYLES[post.status];
                      return (
                        <span
                          key={post.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white/90' : dotClass
                          }`}
                        />
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <span
                        className={`text-[8px] font-mono leading-none ${
                          isSelected
                            ? 'text-white/90'
                            : 'text-slate-400 dark:text-zinc-500'
                        }`}
                      >
                        +
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold capitalize text-slate-900 dark:text-zinc-100 truncate">
                {formatReadableDate(selectedDateKey)}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {selectedDayPosts.length}{' '}
                {selectedDayPosts.length === 1
                  ? 'pieza programada'
                  : 'piezas programadas'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onQuickCreate(selectedDateKey)}
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Programar
            </button>
          </div>

          {selectedDayPosts.length > 0 ? (
            <div className="space-y-2">
              {selectedDayPosts.map((post) => {
                const colorClass =
                  colorBy === 'platform'
                    ? PLATFORM_STYLES[post.platform]?.cal
                    : STATUS_CAL_STYLES[post.status];
                const colMeta = KANBAN_COLUMNS.find(
                  (c) => c.id === post.status
                );
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onSelectPost(post.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-opacity active:opacity-85 ${colorClass}`}
                  >
                    {post.coverUrl && (
                      <img
                        src={post.coverUrl}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-lg object-cover shrink-0 bg-black/10"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {post.title}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] opacity-85 flex-wrap">
                        {post.time && (
                          <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
                            <Clock className="w-3 h-3" />
                            {post.time}
                          </span>
                        )}
                        <span>·</span>
                        <span>{post.contentType}</span>
                        <span>·</span>
                        <span>
                          {colorBy === 'platform'
                            ? colMeta?.shortTitle || post.status
                            : post.platform}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-5 px-3 text-center rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
              No hay publicaciones en esta fecha.
            </div>
          )}

          {/* Quick Jump to Other Posts in Viewed Month */}
          {selectedDayPosts.length === 0 && monthScheduledPosts.length > 0 && (
            <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Programado este mes ({monthScheduledPosts.length})
              </p>
              <div className="space-y-1.5">
                {monthScheduledPosts.slice(0, 6).map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      if (post.date) setSelectedDateKey(post.date);
                      onSelectPost(post.id);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40 text-left hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-zinc-100 truncate">
                        {post.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        {post.platform} · {post.contentType}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400 shrink-0">
                      {post.date.slice(5)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ==================== DESKTOP MONTHLY GRID (md+) ==================== */}
      <div className="hidden md:block bg-white dark:bg-zinc-900/65 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
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
                          {post.contentType} ·{' '}
                          {PLATFORM_STYLES[post.platform].short}
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
