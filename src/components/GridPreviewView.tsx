import { DragEvent, MouseEvent, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BadgeCheck,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Grid3X3,
  Heart,
  Home,
  Layers,
  Link2,
  ListVideo,
  Menu,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  PlusSquare,
  Repeat2,
  Search,
  ShoppingBag,
  UserPlus,
  Users,
} from 'lucide-react';
import { Brand, ContentPost, Platform } from '../types/content';

export type SocialPreviewNetwork = 'Instagram' | 'TikTok';

interface GridPreviewViewProps {
  posts: ContentPost[];
  brand: Brand;
  network: SocialPreviewNetwork;
  onChangeNetwork: (network: SocialPreviewNetwork) => void;
  onReorderFeed: (orderedIds: string[]) => void;
  onSelectPost: (postId: string) => void;
  onQuickCreateForPlatform: (platform: Platform) => void;
  onEditProfile: () => void;
  compact?: boolean;
}

type IgTab = 'all' | 'reels' | 'editorial';
type TtTab = 'all' | 'clips' | 'live';

const SIMULATED_VIEWS = ['24.8K', '14.2K', '8.9K', '31.4K', '6.1K', '19.5K'];

export function GridPreviewView({
  posts,
  brand,
  network,
  onChangeNetwork,
  onReorderFeed,
  onSelectPost,
  onQuickCreateForPlatform,
  onEditProfile,
  compact = false,
}: GridPreviewViewProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [igTab, setIgTab] = useState<IgTab>('all');
  const [ttTab, setTtTab] = useState<TtTab>('all');
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const orderedPosts = useMemo(() => {
    return [...posts].sort(
      (a, b) => (a.feedOrder ?? 999) - (b.feedOrder ?? 999)
    );
  }, [posts]);

  const visiblePosts = useMemo(() => {
    if (network === 'Instagram') {
      if (igTab === 'reels') {
        return orderedPosts.filter((p) => p.contentType === 'Reel');
      }
      if (igTab === 'editorial') {
        return orderedPosts.filter(
          (p) =>
            p.contentType === 'Carrusel' ||
            p.contentType === 'Lanzamiento de Producto'
        );
      }
      return orderedPosts;
    }

    if (ttTab === 'clips') {
      return orderedPosts.filter(
        (p) => p.contentType === 'Reel' || p.contentType === 'Historia'
      );
    }
    if (ttTab === 'live') {
      return orderedPosts.filter(
        (p) => p.status === 'programado' || p.status === 'publicado'
      );
    }
    return orderedPosts;
  }, [orderedPosts, network, igTab, ttTab]);

  const handleDropOnPost = (
    e: DragEvent<HTMLDivElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;
    const ids = orderedPosts.map((p) => p.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, sourceId);
    onReorderFeed(ids);
  };

  const swapAdjacent = (
    e: MouseEvent<HTMLButtonElement>,
    postId: string,
    delta: number
  ) => {
    e.stopPropagation();
    const ids = orderedPosts.map((p) => p.id);
    const index = ids.indexOf(postId);
    const targetIndex = index + delta;
    if (index === -1 || targetIndex < 0 || targetIndex >= ids.length) return;
    const temp = ids[index];
    ids[index] = ids[targetIndex];
    ids[targetIndex] = temp;
    onReorderFeed(ids);
  };

  const handleCopyHandle = () => {
    navigator.clipboard?.writeText(`@${brand.handle}`).then(() => {
      setCopiedHandle(true);
      setTimeout(() => setCopiedHandle(false), 1600);
    });
  };

  const getTikTokMetricLabel = (post: ContentPost, idx: number) => {
    if (post.status === 'publicado') {
      return SIMULATED_VIEWS[idx % SIMULATED_VIEWS.length];
    }
    if (post.status === 'programado') return 'Prog.';
    return 'Borrador';
  };

  return (
    <section
      aria-label={`Vista previa de feed en ${network}`}
      className={compact ? 'w-full' : 'max-w-[430px] mx-auto w-full'}
    >
      {/* Network Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="inline-flex items-center bg-slate-200/75 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onChangeNetwork('Instagram')}
            className={`px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              network === 'Instagram'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            Instagram
          </button>
          <button
            type="button"
            onClick={() => onChangeNetwork('TikTok')}
            className={`px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              network === 'TikTok'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            TikTok
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {visiblePosts.length > 1 && (
            <button
              type="button"
              onClick={() => setReorderMode((r) => !r)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                reorderMode
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title="Reordenar publicaciones del feed"
            >
              <ArrowUpDown className="w-3 h-3" />
              {reorderMode ? 'Listo' : 'Ordenar'}
            </button>
          )}

          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
            title="Personalizar foto, seguidores, bio y destacadas del feed"
          >
            <Pencil className="w-3 h-3" />
            <span>Editar perfil</span>
          </button>
        </div>
      </div>

      {reorderMode && (
        <p className="mb-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium px-1">
          Toca las flechas &lt; y &gt; en cada publicación para mover su posición en el feed.
        </p>
      )}

      {/* Social Mobile Preview Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 overflow-hidden shadow-sm">
        {network === 'Instagram' ? (
          /* ==================== INSTAGRAM FEED VIEW ==================== */
          <div>
            {/* IG Top App Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-900">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[14px] font-bold tracking-tight truncate">
                  {brand.handle}
                </span>
                {brand.verified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
              </div>
              <div className="flex items-center gap-3.5 text-slate-800 dark:text-zinc-200 shrink-0">
                <button
                  type="button"
                  onClick={() => onQuickCreateForPlatform('Instagram')}
                  title="Crear publicación para Instagram"
                  aria-label="Crear publicación para Instagram"
                  className="hover:opacity-70 transition-opacity"
                >
                  <PlusSquare className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={onEditProfile}
                  title="Editar perfil"
                  aria-label="Editar perfil"
                  className="hover:opacity-70 transition-opacity"
                >
                  <Menu className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* IG Profile Header */}
            <div className="px-3.5 sm:px-4 pt-3.5 pb-3">
              <div className="flex items-center gap-3.5 sm:gap-5">
                {/* Avatar with optional IG Story Ring */}
                <button
                  type="button"
                  onClick={onEditProfile}
                  title="Cambiar foto de perfil"
                  className={`w-[68px] h-[68px] rounded-full shrink-0 transition-transform hover:scale-[1.03] ${
                    brand.showStoryRing !== false
                      ? 'p-[2.5px] bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600'
                      : 'p-[1px] bg-slate-200 dark:bg-zinc-700'
                  }`}
                >
                  <div className="w-full h-full rounded-full p-[2px] bg-white dark:bg-[#09090b]">
                    <div
                      className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm font-mono"
                      style={{ backgroundColor: brand.accent }}
                    >
                      {brand.avatarUrl ? (
                        <img
                          src={brand.avatarUrl}
                          alt={brand.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        brand.badge
                      )}
                    </div>
                  </div>
                </button>

                {/* IG Stats */}
                <div className="flex-1 grid grid-cols-3 text-center gap-1">
                  <div>
                    <div className="text-[14px] font-bold font-mono tabular-nums leading-tight">
                      {brand.igPostsOverride?.trim() || orderedPosts.length}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                      publicaciones
                    </div>
                  </div>
                  <div>
                    <div className="text-[14px] font-bold font-mono tabular-nums leading-tight">
                      {brand.igFollowers}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                      seguidores
                    </div>
                  </div>
                  <div>
                    <div className="text-[14px] font-bold font-mono tabular-nums leading-tight">
                      {brand.igFollowing}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                      seguidos
                    </div>
                  </div>
                </div>
              </div>

              {/* IG Bio */}
              <div className="mt-3 text-xs leading-snug space-y-0.5">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {brand.name}
                </div>
                {brand.category && (
                  <div className="text-slate-500 dark:text-zinc-400">
                    {brand.category}
                  </div>
                )}
                {brand.description && (
                  <p className="text-slate-800 dark:text-zinc-200 whitespace-pre-line">
                    {brand.description}
                  </p>
                )}
                {brand.website && (
                  <div className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium pt-0.5">
                    <Link2 className="w-3 h-3" />
                    <span>{brand.website}</span>
                  </div>
                )}
              </div>

              {/* IG Action Buttons */}
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-900 dark:text-zinc-100 transition-colors whitespace-nowrap"
                >
                  Editar perfil
                </button>
                <button
                  type="button"
                  onClick={handleCopyHandle}
                  className="py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-900 dark:text-zinc-100 transition-colors inline-flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  {copiedHandle ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      Copiado
                    </>
                  ) : (
                    'Compartir perfil'
                  )}
                </button>
              </div>

              {/* IG Story Highlights */}
              {brand.highlights.length > 0 && (
                <div className="mt-3.5 flex items-center gap-3 overflow-x-auto no-scrollbar pb-0.5">
                  {brand.highlights.map((hl) => (
                    <button
                      key={hl.id}
                      type="button"
                      onClick={onEditProfile}
                      title="Editar historias destacadas"
                      className="flex flex-col items-center gap-1 shrink-0 w-13 group"
                    >
                      <div className="w-12 h-12 rounded-full p-[2px] border border-slate-300 dark:border-zinc-700 group-hover:border-indigo-500 transition-colors">
                        <div
                          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white/90 font-mono"
                          style={{ backgroundColor: hl.tint }}
                        >
                          {hl.imageUrl ? (
                            <img
                              src={hl.imageUrl}
                              alt={hl.label}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            hl.label.slice(0, 2).toUpperCase()
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-zinc-300 truncate max-w-full">
                        {hl.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* IG Profile Tabs */}
            <div className="grid grid-cols-3 border-t border-slate-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIgTab('all')}
                aria-label="Cuadrícula de publicaciones"
                className={`py-2.5 flex items-center justify-center border-b-2 transition-colors ${
                  igTab === 'all'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <Grid3X3 className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setIgTab('reels')}
                aria-label="Reels"
                className={`py-2.5 flex items-center justify-center border-b-2 transition-colors ${
                  igTab === 'reels'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <Clapperboard className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setIgTab('editorial')}
                aria-label="Carruseles y lanzamientos"
                className={`py-2.5 flex items-center justify-center border-b-2 transition-colors ${
                  igTab === 'editorial'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <Layers className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            </div>

            {/* IG Flush 3-Column 4:5 Grid */}
            {visiblePosts.length === 0 ? (
              <div className="py-14 px-6 text-center text-xs text-slate-400 dark:text-zinc-500">
                No hay publicaciones en esta pestaña.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[2px] bg-slate-200/70 dark:bg-zinc-900">
                {visiblePosts.map((post) => {
                  const globalIdx = orderedPosts.findIndex(
                    (p) => p.id === post.id
                  );
                  const isTarget =
                    dragOverId === post.id && dragId !== post.id;

                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(post.id);
                        e.dataTransfer.setData('text/plain', post.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverId !== post.id) setDragOverId(post.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverId(null);
                      }}
                      onDrop={(e) => handleDropOnPost(e, post.id)}
                      onClick={() => onSelectPost(post.id)}
                      className={`group relative aspect-[4/5] overflow-hidden bg-slate-100 dark:bg-zinc-900 cursor-grab active:cursor-grabbing ${
                        isTarget ? 'ring-2 ring-inset ring-indigo-500' : ''
                      }`}
                    >
                      {post.coverUrl ? (
                        <img
                          src={post.coverUrl}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full p-2 flex flex-col justify-between bg-slate-100 dark:bg-zinc-800">
                          <span className="text-[9px] font-medium text-slate-500 dark:text-zinc-400">
                            {post.contentType}
                          </span>
                          <p className="text-[10px] font-semibold line-clamp-3 text-slate-800 dark:text-zinc-200">
                            {post.title}
                          </p>
                        </div>
                      )}

                      {/* Authentic IG top-right media type icon */}
                      <div className="absolute top-1.5 right-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] pointer-events-none">
                        {post.contentType === 'Reel' && (
                          <Clapperboard className="w-3.5 h-3.5" strokeWidth={2.2} />
                        )}
                        {post.contentType === 'Carrusel' && (
                          <Layers className="w-3.5 h-3.5" strokeWidth={2.2} />
                        )}
                        {post.contentType === 'Lanzamiento de Producto' && (
                          <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.2} />
                        )}
                      </div>

                      {/* Hover / Touch Reorder Overlay */}
                      <div
                        className={`absolute inset-0 bg-black/65 transition-opacity duration-150 p-1.5 flex flex-col justify-between text-white ${
                          reorderMode
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={globalIdx <= 0}
                            onClick={(e) => swapAdjacent(e, post.id, -1)}
                            className="p-1.5 sm:p-0.5 rounded bg-white/25 hover:bg-white/40 disabled:opacity-25"
                            title="Mover antes"
                            aria-label="Mover antes"
                          >
                            <ChevronLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <span className="text-[10px] sm:text-[9px] font-mono tabular-nums opacity-90">
                            #{globalIdx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={globalIdx >= orderedPosts.length - 1}
                            onClick={(e) => swapAdjacent(e, post.id, 1)}
                            className="p-1.5 sm:p-0.5 rounded bg-white/25 hover:bg-white/40 disabled:opacity-25"
                            title="Mover después"
                            aria-label="Mover después"
                          >
                            <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] font-medium line-clamp-2 leading-tight">
                          {post.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* IG Bottom Bar */}
            <div className="flex items-center justify-around py-2.5 px-3 border-t border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#09090b] text-slate-700 dark:text-zinc-300">
              <Home className="w-[18px] h-[18px] opacity-60" strokeWidth={1.7} />
              <Search className="w-[18px] h-[18px] opacity-60" strokeWidth={1.7} />
              <button
                type="button"
                onClick={() => onQuickCreateForPlatform('Instagram')}
                aria-label="Nueva publicación de Instagram"
                title="Nueva publicación de Instagram"
                className="hover:opacity-75 transition-opacity"
              >
                <PlusSquare className="w-[19px] h-[19px]" strokeWidth={1.9} />
              </button>
              <button
                type="button"
                onClick={() => setIgTab((t) => (t === 'reels' ? 'all' : 'reels'))}
                aria-label="Filtrar Reels"
                title="Filtrar Reels"
                className={`transition-opacity ${
                  igTab === 'reels' ? 'opacity-100 text-slate-900 dark:text-white' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Film className="w-[18px] h-[18px]" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={onEditProfile}
                title="Editar perfil"
                className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold text-white ring-1.5 ring-slate-900 dark:ring-white font-mono"
                style={{ backgroundColor: brand.accent }}
              >
                {brand.avatarUrl ? (
                  <img
                    src={brand.avatarUrl}
                    alt={brand.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  brand.badge
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ==================== TIKTOK FEED VIEW ==================== */
          <div>
            {/* TikTok Top App Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-900">
              <UserPlus
                className="w-[18px] h-[18px] text-slate-700 dark:text-zinc-300 opacity-80 shrink-0"
                strokeWidth={1.8}
              />
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[14px] font-bold tracking-tight truncate">
                  {brand.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
              </div>
              <button
                type="button"
                onClick={onEditProfile}
                title="Editar perfil"
                aria-label="Editar perfil"
                className="text-slate-700 dark:text-zinc-300 hover:opacity-70 transition-opacity shrink-0"
              >
                <Menu className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            </div>

            {/* TikTok Centered Profile Header */}
            <div className="px-4 pt-4 pb-3.5 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative">
                <button
                  type="button"
                  onClick={onEditProfile}
                  title="Cambiar foto de perfil"
                  className="w-[74px] h-[74px] rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-base font-mono border-2 border-slate-200 dark:border-zinc-800 hover:scale-[1.03] transition-transform"
                  style={{ backgroundColor: brand.accent }}
                >
                  {brand.avatarUrl ? (
                    <img
                      src={brand.avatarUrl}
                      alt={brand.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    brand.badge
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onQuickCreateForPlatform('TikTok')}
                  aria-label="Crear video para TikTok"
                  title="Crear video para TikTok"
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#20D5EC] text-zinc-950 border-2 border-white dark:border-[#09090b] flex items-center justify-center hover:brightness-105 transition"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
                </button>
              </div>

              {/* @handle */}
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                <span>@{brand.handle}</span>
                {brand.verified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-[#20D5EC] shrink-0" />
                )}
              </div>

              {/* Centered Stats Row */}
              <div className="mt-3 flex items-center justify-center gap-5">
                <div>
                  <div className="text-[14px] font-bold font-mono tabular-nums leading-tight">
                    {brand.ttFollowing}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Siguiendo
                  </div>
                </div>
                <span className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
                <div>
                  <div className="text-[14px] font-bold font-mono tabular-nums leading-tight">
                    {brand.ttFollowers}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Seguidores
                  </div>
                </div>
                <span className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
                <div>
                  <div className="text-[14px] font-bold font-mono tabular-nums leading-tight">
                    {brand.ttLikes}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Me gusta
                  </div>
                </div>
              </div>

              {/* TikTok Action Buttons */}
              <div className="mt-3 flex items-center justify-center gap-1.5 w-full max-w-[260px]">
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="flex-1 py-2 px-4 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Editar perfil
                </button>
                <button
                  type="button"
                  onClick={handleCopyHandle}
                  className="py-2 px-3 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-900 dark:text-zinc-100 transition-colors whitespace-nowrap inline-flex items-center gap-1"
                >
                  {copiedHandle ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copiado
                    </>
                  ) : (
                    'Compartir'
                  )}
                </button>
              </div>

              {/* Centered Bio */}
              {brand.description && (
                <p className="mt-2.5 text-[11px] text-slate-600 dark:text-zinc-300 leading-snug max-w-[260px] whitespace-pre-line">
                  {brand.description}
                </p>
              )}
              {brand.website && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 dark:text-zinc-200">
                  <Link2 className="w-3 h-3" />
                  <span>{brand.website}</span>
                </div>
              )}
            </div>

            {/* TikTok Profile Tabs */}
            <div className="grid grid-cols-3 border-t border-slate-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTtTab('all')}
                aria-label="Todos los videos"
                className={`py-2.5 flex items-center justify-center border-b-2 transition-colors ${
                  ttTab === 'all'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <ListVideo className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setTtTab('clips')}
                aria-label="Reels y clips"
                className={`py-2.5 flex items-center justify-center border-b-2 transition-colors ${
                  ttTab === 'clips'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <Repeat2 className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setTtTab('live')}
                aria-label="Programados y publicados"
                className={`py-2.5 flex items-center justify-center border-b-2 transition-colors ${
                  ttTab === 'live'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <Bookmark className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            </div>

            {/* TikTok Flush 3-Column Vertical Video Grid */}
            {visiblePosts.length === 0 ? (
              <div className="py-14 px-6 text-center text-xs text-slate-400 dark:text-zinc-500">
                No hay videos en esta pestaña.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[2px] bg-slate-200/70 dark:bg-zinc-900">
                {visiblePosts.map((post, visibleIdx) => {
                  const globalIdx = orderedPosts.findIndex(
                    (p) => p.id === post.id
                  );
                  const isTarget =
                    dragOverId === post.id && dragId !== post.id;

                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(post.id);
                        e.dataTransfer.setData('text/plain', post.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverId !== post.id) setDragOverId(post.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverId(null);
                      }}
                      onDrop={(e) => handleDropOnPost(e, post.id)}
                      onClick={() => onSelectPost(post.id)}
                      className={`group relative ${
                        compact ? 'aspect-[9/14]' : 'aspect-[9/16]'
                      } overflow-hidden bg-zinc-900 cursor-grab active:cursor-grabbing ${
                        isTarget ? 'ring-2 ring-inset ring-[#FE2C55]' : ''
                      }`}
                    >
                      {post.coverUrl ? (
                        <img
                          src={post.coverUrl}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full p-2 flex flex-col justify-between bg-zinc-800 text-zinc-100">
                          <span className="text-[9px] text-zinc-400">
                            {post.contentType}
                          </span>
                          <p className="text-[10px] font-semibold line-clamp-3">
                            {post.title}
                          </p>
                        </div>
                      )}

                      {/* Top-left TikTok Pinned Label on first video */}
                      {visibleIdx === 0 &&
                        ttTab === 'all' &&
                        brand.ttShowPinned !== false && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#FE2C55] text-white text-[9px] font-semibold leading-none pointer-events-none">
                            Fijado
                          </span>
                        )}

                      {/* Bottom-left TikTok Play Icon + View Count / Status */}
                      <div className="absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 text-white text-[10px] font-semibold font-mono tabular-nums pointer-events-none">
                        <Play
                          className="w-3 h-3 shrink-0 fill-transparent"
                          strokeWidth={2.4}
                        />
                        <span className="truncate">
                          {getTikTokMetricLabel(post, visibleIdx)}
                        </span>
                      </div>

                      {/* Hover / Touch Reorder Overlay */}
                      <div
                        className={`absolute inset-0 bg-black/70 transition-opacity duration-150 p-1.5 flex flex-col justify-between text-white ${
                          reorderMode
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={globalIdx <= 0}
                            onClick={(e) => swapAdjacent(e, post.id, -1)}
                            className="p-1.5 sm:p-0.5 rounded bg-white/25 hover:bg-white/40 disabled:opacity-25"
                            title="Mover antes"
                            aria-label="Mover antes"
                          >
                            <ChevronLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <span className="text-[10px] sm:text-[9px] font-mono tabular-nums opacity-90">
                            #{globalIdx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={globalIdx >= orderedPosts.length - 1}
                            onClick={(e) => swapAdjacent(e, post.id, 1)}
                            className="p-1.5 sm:p-0.5 rounded bg-white/25 hover:bg-white/40 disabled:opacity-25"
                            title="Mover después"
                            aria-label="Mover después"
                          >
                            <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] font-medium line-clamp-2 leading-tight">
                          {post.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TikTok Bottom Navigation Bar */}
            <div className="flex items-center justify-around py-2 px-2 border-t border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#09090b] text-[9px] font-medium text-slate-500 dark:text-zinc-400">
              <div className="flex flex-col items-center gap-0.5 opacity-70">
                <Home className="w-4 h-4" strokeWidth={1.8} />
                <span>Inicio</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 opacity-70">
                <Users className="w-4 h-4" strokeWidth={1.8} />
                <span>Amigos</span>
              </div>

              {/* Iconic TikTok Create '+' Button */}
              <button
                type="button"
                onClick={() => onQuickCreateForPlatform('TikTok')}
                aria-label="Crear video de TikTok"
                title="Crear video de TikTok"
                className="relative flex items-center justify-center px-2.5 py-1 hover:scale-105 transition-transform"
              >
                <span className="absolute inset-0 -translate-x-[2.5px] rounded-md bg-[#25F4EE]" />
                <span className="absolute inset-0 translate-x-[2.5px] rounded-md bg-[#FE2C55]" />
                <span className="relative z-10 flex items-center justify-center rounded-md bg-slate-900 dark:bg-white text-white dark:text-zinc-950 px-2 py-0.5">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.6} />
                </span>
              </button>

              <div className="flex flex-col items-center gap-0.5 opacity-70">
                <MessageSquare className="w-4 h-4" strokeWidth={1.8} />
                <span>Bandeja</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 text-slate-900 dark:text-white font-semibold">
                <Heart className="w-4 h-4 fill-current" strokeWidth={1.8} />
                <span>Perfil</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
