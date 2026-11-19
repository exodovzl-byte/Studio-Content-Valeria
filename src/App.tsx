import { useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Calendar,
  Cloud,
  Kanban,
  LayoutGrid,
  LogOut,
  Moon,
  PanelRight,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { BrandSelector } from './components/BrandSelector';
import { CalendarView } from './components/CalendarView';
import { ContentDetailModal } from './components/ContentDetailModal';
import {
  GridPreviewView,
  SocialPreviewNetwork,
} from './components/GridPreviewView';
import { KanbanBoard } from './components/KanbanBoard';
import { ProfileEditorModal } from './components/ProfileEditorModal';
import {
  BRANDS,
  INITIAL_POSTS,
  PLATFORMS,
  TODAY_KEY,
} from './data/initialData';
import { auth, googleProvider } from './firebase';
import {
  createPostInFirestore,
  deletePostInFirestore,
  ensureWorkspaceAndSeed,
  reorderFeedInFirestore,
  resetDemoInFirestore,
  saveBrandToFirestore,
  subscribeToBrands,
  subscribeToPosts,
  updatePostInFirestore,
} from './services/studioFirestore';
import {
  ActiveView,
  Brand,
  BrandId,
  ContentPost,
  KanbanStatus,
  Platform,
} from './types/content';

const STORAGE_POSTS_KEY = 'omnicontent_studio_posts_v1';
const STORAGE_BRANDS_KEY = 'omnicontent_studio_brands_v1';
const STORAGE_THEME_KEY = 'omnicontent_studio_theme_v1';

function loadInitialBrands(): Brand[] {
  try {
    const raw = localStorage.getItem(STORAGE_BRANDS_KEY);
    if (!raw) return BRANDS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return BRANDS;
    return BRANDS.map((defaultBrand) => {
      const saved = parsed.find((b: Brand) => b.id === defaultBrand.id);
      return saved ? { ...defaultBrand, ...saved } : defaultBrand;
    });
  } catch {
    return BRANDS;
  }
}

function loadInitialPosts(): ContentPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_POSTS_KEY);
    if (!raw) return INITIAL_POSTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_POSTS;
  } catch {
    return INITIAL_POSTS;
  }
}

function loadInitialTheme(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_THEME_KEY);
    if (raw === 'light') return false;
    if (raw === 'dark') return true;
    return true;
  } catch {
    return true;
  }
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(loadInitialTheme);
  const [selectedBrandId, setSelectedBrandId] = useState<BrandId>('exodo');
  const [activeView, setActiveView] = useState<ActiveView>('kanban');
  const [showSideFeed, setShowSideFeed] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<'Todas' | Platform>(
    'Todas'
  );
  const [previewNetwork, setPreviewNetwork] =
    useState<SocialPreviewNetwork>('Instagram');
  const [brands, setBrands] = useState<Brand[]>(loadInitialBrands);
  const [posts, setPosts] = useState<ContentPost[]>(loadInitialPosts);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState<boolean>(false);

  // Firebase Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Debounce timers for high-frequency typing sync to Firestore
  const postSyncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const brandSyncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;
    let unsubBrands: (() => void) | null = null;
    let unsubPosts: (() => void) | null = null;

    setSyncError(null);
    ensureWorkspaceAndSeed(user.uid, user.displayName || 'Usuario')
      .then(() => {
        if (cancelled) return;
        unsubBrands = subscribeToBrands(
          user.uid,
          (remoteBrands) => setBrands(remoteBrands),
          (err) => setSyncError(err.message)
        );
        unsubPosts = subscribeToPosts(
          user.uid,
          (remotePosts) => setPosts(remotePosts),
          (err) => setSyncError(err.message)
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setSyncError(
            err instanceof Error
              ? err.message
              : 'No se pudo conectar con Firestore.'
          );
        }
      });

    return () => {
      cancelled = true;
      unsubBrands?.();
      unsubPosts?.();
    };
  }, [authReady, user]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(STORAGE_THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage quota errors
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
    } catch {
      // Ignore storage quota errors when large media is attached
    }
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BRANDS_KEY, JSON.stringify(brands));
    } catch {
      // Ignore storage quota errors when large avatar images are attached
    }
  }, [brands]);

  const handleSignIn = async () => {
    setAuthBusy(true);
    setSyncError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al iniciar sesión.';
      if (!msg.includes('popup-closed-by-user')) {
        setSyncError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
      setSyncError(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSelectPlatformFilter = (pl: 'Todas' | Platform) => {
    setPlatformFilter(pl);
    if (pl === 'Instagram' || pl === 'TikTok') {
      setPreviewNetwork(pl);
    }
  };

  const handleChangePreviewNetwork = (nextNetwork: SocialPreviewNetwork) => {
    setPreviewNetwork(nextNetwork);
    if (platformFilter === 'Instagram' || platformFilter === 'TikTok') {
      setPlatformFilter(nextNetwork);
    }
  };

  const currentBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) || brands[0],
    [brands, selectedBrandId]
  );

  const countsByBrand = useMemo(() => {
    const counts: Record<BrandId, number> = {
      exodo: 0,
      agape: 0,
      personal: 0,
    };
    posts.forEach((p) => {
      if (counts[p.brandId] !== undefined) {
        counts[p.brandId] += 1;
      }
    });
    return counts;
  }, [posts]);

  const brandPosts = useMemo(() => {
    return posts.filter((p) => {
      if (p.brandId !== selectedBrandId) return false;
      if (platformFilter !== 'Todas' && p.platform !== platformFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.caption || '').toLowerCase().includes(q) ||
        (p.assignee || '').toLowerCase().includes(q) ||
        (p.contentType || '').toLowerCase().includes(q) ||
        (p.platform || '').toLowerCase().includes(q)
      );
    });
  }, [posts, selectedBrandId, platformFilter, searchQuery]);

  const allCurrentBrandPosts = useMemo(
    () => posts.filter((p) => p.brandId === selectedBrandId),
    [posts, selectedBrandId]
  );

  const feedPreviewPosts = useMemo(() => {
    if (platformFilter === 'Web/Lanzamientos') {
      return brandPosts;
    }
    return brandPosts.filter((p) => p.platform === previewNetwork);
  }, [brandPosts, platformFilter, previewNetwork]);

  const scheduledCount = useMemo(
    () => allCurrentBrandPosts.filter((p) => p.status === 'programado').length,
    [allCurrentBrandPosts]
  );

  const publishedCount = useMemo(
    () => allCurrentBrandPosts.filter((p) => p.status === 'publicado').length,
    [allCurrentBrandPosts]
  );

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  const createPost = ({
    status = 'estrategia',
    date = TODAY_KEY,
    platform,
  }: {
    status?: KanbanStatus;
    date?: string;
    platform?: Platform;
  } = {}) => {
    const brandItems = posts.filter((p) => p.brandId === selectedBrandId);
    const newId = `post-${Date.now()}`;
    const resolvedPlatform: Platform =
      platform ?? (platformFilter === 'Todas' ? 'Instagram' : platformFilter);
    const created: ContentPost = {
      id: newId,
      brandId: selectedBrandId,
      title:
        resolvedPlatform === 'TikTok'
          ? 'Nuevo video para TikTok'
          : 'Nueva pieza de contenido',
      status,
      platform: resolvedPlatform,
      contentType: resolvedPlatform === 'TikTok' ? 'Reel' : 'Carrusel',
      date,
      time: '18:00',
      assignee: 'Andrés',
      coverUrl: '',
      mediaType: 'image',
      mediaItems: [],
      caption: '',
      hashtags: '',
      cta: '',
      internalNotes: '',
      checklist: [
        {
          id: `chk-${Date.now()}-1`,
          text: 'Definir guion y enfoque visual',
          done: false,
        },
        {
          id: `chk-${Date.now()}-2`,
          text: 'Aprobar pieza final',
          done: false,
        },
      ],
      comments: [],
      feedOrder: brandItems.length,
    };
    setPosts((prev) => [created, ...prev]);
    setSelectedPostId(newId);

    if (user) {
      createPostInFirestore(user.uid, created).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  const updatePost = (postId: string, patch: Partial<ContentPost>) => {
    let nextFull: ContentPost | null = null;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        nextFull = { ...p, ...patch };
        return nextFull;
      })
    );

    if (user && nextFull) {
      const snapshotToSave = nextFull;
      if (postSyncTimers.current[postId]) {
        clearTimeout(postSyncTimers.current[postId]);
      }
      postSyncTimers.current[postId] = setTimeout(() => {
        updatePostInFirestore(user.uid, snapshotToSave).catch((err) =>
          setSyncError(err instanceof Error ? err.message : String(err))
        );
      }, 350);
    }
  };

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedPostId === postId) setSelectedPostId(null);

    if (user) {
      if (postSyncTimers.current[postId]) {
        clearTimeout(postSyncTimers.current[postId]);
      }
      deletePostInFirestore(user.uid, postId).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  const reorderFeed = (orderedIds: string[]) => {
    setPosts((prev) =>
      prev.map((p) => {
        const idx = orderedIds.indexOf(p.id);
        return idx !== -1 ? { ...p, feedOrder: idx } : p;
      })
    );

    if (user) {
      reorderFeedInFirestore(user.uid, orderedIds).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  const updateBrand = (brandId: BrandId, patch: Partial<Brand>) => {
    let nextFull: Brand | null = null;
    setBrands((prev) =>
      prev.map((b) => {
        if (b.id !== brandId) return b;
        nextFull = { ...b, ...patch };
        return nextFull;
      })
    );

    if (user && nextFull) {
      const snapshotToSave = nextFull;
      if (brandSyncTimers.current[brandId]) {
        clearTimeout(brandSyncTimers.current[brandId]);
      }
      brandSyncTimers.current[brandId] = setTimeout(() => {
        saveBrandToFirestore(user.uid, snapshotToSave).catch((err) =>
          setSyncError(err instanceof Error ? err.message : String(err))
        );
      }, 350);
    }
  };

  const resetBrand = (brandId: BrandId) => {
    const defaultBrand = BRANDS.find((b) => b.id === brandId);
    if (!defaultBrand) return;
    setBrands((prev) =>
      prev.map((b) => (b.id === brandId ? defaultBrand : b))
    );

    if (user) {
      saveBrandToFirestore(user.uid, defaultBrand).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  const resetDemo = () => {
    const existingIds = posts.map((p) => p.id);
    setPosts(INITIAL_POSTS);
    setBrands(BRANDS);
    setSearchQuery('');
    setPlatformFilter('Todas');
    setSelectedPostId(null);

    if (user) {
      resetDemoInFirestore(user.uid, existingIds).catch((err) =>
        setSyncError(err instanceof Error ? err.message : String(err))
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-zinc-800/90 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Zone 1: Wordmark + Active Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs font-mono">
                O
              </span>
              <span className="font-semibold text-sm tracking-tight whitespace-nowrap hidden md:inline">
                OmniContent Studio
              </span>
            </div>

            <span
              aria-hidden="true"
              className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:inline shrink-0"
            />

            <BrandSelector
              brands={brands}
              selectedBrandId={selectedBrandId}
              countsByBrand={countsByBrand}
              onSelectBrand={(brandId) => {
                setSelectedBrandId(brandId);
                setSelectedPostId(null);
              }}
              onResetDemo={resetDemo}
            />
          </div>

          {/* Zone 2: Primary View Switcher */}
          <nav
            aria-label="Vistas del estudio"
            className="flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 shrink-0"
          >
            <button
              type="button"
              onClick={() => setActiveView('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeView === 'kanban'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeView === 'calendar'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendario</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeView === 'grid'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Feed Visual</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => createPost({ status: 'estrategia' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Pieza</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Control Strip */}
      <div className="border-b border-slate-200/80 dark:border-zinc-800/70 bg-white/50 dark:bg-zinc-950/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search & Platform Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pieza, copy o responsable..."
                aria-label="Buscar piezas de contenido"
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {(['Todas', ...PLATFORMS] as const).map((pl) => {
                const active = platformFilter === pl;
                return (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => handleSelectPlatformFilter(pl)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800/80'
                    }`}
                  >
                    {pl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Summary + Auth + Workspace Utilities */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden 2xl:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums mr-1">
              <span>{allCurrentBrandPosts.length} piezas</span>
              <span aria-hidden="true">·</span>
              <span>{scheduledCount} programadas</span>
              <span aria-hidden="true">·</span>
              <span>{publishedCount} publicadas</span>
            </div>

            {user ? (
              <div className="inline-flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Cuenta'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span className="max-w-[110px] truncate font-medium text-slate-700 dark:text-zinc-200 hidden sm:inline">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleSignOut}
                  title="Cerrar sesión de Firebase"
                  aria-label="Cerrar sesión de Firebase"
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={authBusy || !authReady}
                onClick={handleSignIn}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                title="Inicia sesión con Google para sincronizar tus datos en Firebase"
              >
                <Cloud className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sincronizar Firebase</span>
              </button>
            )}

            {activeView !== 'grid' && (
              <button
                type="button"
                onClick={() => setShowSideFeed((s) => !s)}
                className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
                  showSideFeed
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
                title="Alternar simulador de feed lateral"
              >
                <PanelRight className="w-3.5 h-3.5" />
                Feed lateral
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 transition-colors"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Oscuro</span>
                </>
              )}
            </button>
          </div>
        </div>

        {syncError && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-2.5">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
              <span className="truncate">
                Error de sincronización con Firebase: {syncError}
              </span>
              <button
                type="button"
                onClick={() => setSyncError(null)}
                className="shrink-0 hover:opacity-75"
                aria-label="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Primary Workspace View */}
          <div className="flex-1 min-w-0 w-full">
            {activeView === 'kanban' && (
              <KanbanBoard
                posts={brandPosts}
                onMovePost={(postId, nextStatus) =>
                  updatePost(postId, { status: nextStatus })
                }
                onSelectPost={(postId) => setSelectedPostId(postId)}
                onQuickCreateInColumn={(colId) =>
                  createPost({ status: colId })
                }
              />
            )}

            {activeView === 'calendar' && (
              <CalendarView
                posts={brandPosts}
                onSelectPost={(postId) => setSelectedPostId(postId)}
                onQuickCreate={(dateStr) =>
                  createPost({ status: 'programado', date: dateStr })
                }
              />
            )}

            {activeView === 'grid' && (
              <GridPreviewView
                posts={feedPreviewPosts}
                brand={currentBrand}
                network={previewNetwork}
                onChangeNetwork={handleChangePreviewNetwork}
                onReorderFeed={reorderFeed}
                onSelectPost={(postId) => setSelectedPostId(postId)}
                onQuickCreateForPlatform={(platform) =>
                  createPost({ status: 'estrategia', platform })
                }
                onEditProfile={() => setProfileEditorOpen(true)}
              />
            )}
          </div>

          {/* Sticky Side Visual Feed Preview */}
          {activeView !== 'grid' && showSideFeed && (
            <aside className="w-full lg:w-[340px] xl:w-[370px] shrink-0 lg:sticky lg:top-18">
              <GridPreviewView
                posts={feedPreviewPosts}
                brand={currentBrand}
                network={previewNetwork}
                onChangeNetwork={handleChangePreviewNetwork}
                onReorderFeed={reorderFeed}
                onSelectPost={(postId) => setSelectedPostId(postId)}
                onQuickCreateForPlatform={(platform) =>
                  createPost({ status: 'estrategia', platform })
                }
                onEditProfile={() => setProfileEditorOpen(true)}
                compact
              />
            </aside>
          )}
        </div>
      </main>

      {/* Content Detail Modal */}
      <ContentDetailModal
        post={selectedPost}
        onClose={() => setSelectedPostId(null)}
        onUpdatePost={updatePost}
        onDeletePost={deletePost}
      />

      {/* Social Feed Profile Editor Modal */}
      <ProfileEditorModal
        open={profileEditorOpen}
        brand={currentBrand}
        initialNetwork={previewNetwork}
        onClose={() => setProfileEditorOpen(false)}
        onUpdateBrand={updateBrand}
        onResetBrand={resetBrand}
      />
    </div>
  );
}
