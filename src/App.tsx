import { useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Calendar,
  Kanban,
  LayoutGrid,
  Moon,
  PanelRight,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { BrandSelector } from './components/BrandSelector';
import { CalendarView } from './components/CalendarView';
import { ClearContentModal } from './components/ClearContentModal';
import { ContentDetailModal } from './components/ContentDetailModal';
import {
  GridPreviewView,
  SocialPreviewNetwork,
} from './components/GridPreviewView';
import { KanbanBoard } from './components/KanbanBoard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PWAStatusBanner } from './components/PWAStatusBanner';
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
  deletePostsBatchInFirestore,
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

const DEMO_POST_IDS = new Set(INITIAL_POSTS.map((p) => p.id));

function loadInitialPosts(): ContentPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_POSTS_KEY);
    if (raw === null) return INITIAL_POSTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
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
  const [clearModalOpen, setClearModalOpen] = useState<boolean>(false);

  // Background cloud auth & sync state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  // Debounce timers and pending snapshots so edits flush immediately before closing page
  const postSyncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const brandSyncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const pendingPostSaves = useRef<Record<string, ContentPost>>({});
  const pendingBrandSaves = useRef<Record<string, Brand>>({});

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

    ensureWorkspaceAndSeed(user.uid, user.displayName || 'Usuario')
      .then(() => {
        if (cancelled) return;
        unsubBrands = subscribeToBrands(
          user.uid,
          (remoteBrands) => setBrands(remoteBrands),
          (err) => console.error('Cloud brand sync error:', err)
        );
        unsubPosts = subscribeToPosts(
          user.uid,
          (remotePosts) => setPosts(remotePosts),
          (err) => console.error('Cloud post sync error:', err)
        );
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Cloud workspace init error:', err);
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

  // Cross-tab live updates for localStorage edits
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_POSTS_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setPosts(parsed);
        } catch {
          // Ignore malformed storage data
        }
      }
      if (e.key === STORAGE_BRANDS_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) setBrands(parsed);
        } catch {
          // Ignore malformed storage data
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Flush any pending Firestore updates when leaving or backgrounding the app
  useEffect(() => {
    if (!user) return;
    const flushPending = () => {
      Object.entries(pendingPostSaves.current).forEach(([postId, snapshot]) => {
        if (postSyncTimers.current[postId]) {
          clearTimeout(postSyncTimers.current[postId]);
          delete postSyncTimers.current[postId];
        }
        delete pendingPostSaves.current[postId];
        updatePostInFirestore(user.uid, snapshot).catch(() => {});
      });
      Object.entries(pendingBrandSaves.current).forEach(
        ([brandId, snapshot]) => {
          if (brandSyncTimers.current[brandId]) {
            clearTimeout(brandSyncTimers.current[brandId]);
            delete brandSyncTimers.current[brandId];
          }
          delete pendingBrandSaves.current[brandId];
          saveBrandToFirestore(user.uid, snapshot).catch(() => {});
        }
      );
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    window.addEventListener('pagehide', flushPending);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  const handleSignIn = async () => {
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user')) {
        console.error('Sign-in error:', err);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
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

  const demoPostsCount = useMemo(
    () => posts.filter((p) => DEMO_POST_IDS.has(p.id)).length,
    [posts]
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
        console.error('Cloud create error:', err)
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
      pendingPostSaves.current[postId] = snapshotToSave;
      if (postSyncTimers.current[postId]) {
        clearTimeout(postSyncTimers.current[postId]);
      }
      postSyncTimers.current[postId] = setTimeout(() => {
        delete pendingPostSaves.current[postId];
        updatePostInFirestore(user.uid, snapshotToSave).catch((err) =>
          console.error('Cloud update error:', err)
        );
      }, 250);
    }
  };

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedPostId === postId) setSelectedPostId(null);

    if (user) {
      if (postSyncTimers.current[postId]) {
        clearTimeout(postSyncTimers.current[postId]);
      }
      delete pendingPostSaves.current[postId];
      deletePostInFirestore(user.uid, postId).catch((err) =>
        console.error('Cloud delete error:', err)
      );
    }
  };

  const clearDemoOnly = () => {
    const idsToDelete = posts
      .filter((p) => DEMO_POST_IDS.has(p.id))
      .map((p) => p.id);
    if (idsToDelete.length === 0) return;

    setPosts((prev) => prev.filter((p) => !DEMO_POST_IDS.has(p.id)));
    if (selectedPostId && DEMO_POST_IDS.has(selectedPostId)) {
      setSelectedPostId(null);
    }

    if (user) {
      idsToDelete.forEach((id) => {
        if (postSyncTimers.current[id]) clearTimeout(postSyncTimers.current[id]);
        delete pendingPostSaves.current[id];
      });
      deletePostsBatchInFirestore(user.uid, idsToDelete).catch((err) =>
        console.error('Cloud batch delete error:', err)
      );
    }
  };

  const clearCurrentBrandPosts = () => {
    const idsToDelete = posts
      .filter((p) => p.brandId === selectedBrandId)
      .map((p) => p.id);
    if (idsToDelete.length === 0) return;
    const idSet = new Set(idsToDelete);

    setPosts((prev) => prev.filter((p) => p.brandId !== selectedBrandId));
    if (selectedPostId && idSet.has(selectedPostId)) {
      setSelectedPostId(null);
    }

    if (user) {
      idsToDelete.forEach((id) => {
        if (postSyncTimers.current[id]) clearTimeout(postSyncTimers.current[id]);
        delete pendingPostSaves.current[id];
      });
      deletePostsBatchInFirestore(user.uid, idsToDelete).catch((err) =>
        console.error('Cloud brand clear error:', err)
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
        console.error('Cloud reorder error:', err)
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
      pendingBrandSaves.current[brandId] = snapshotToSave;
      if (brandSyncTimers.current[brandId]) {
        clearTimeout(brandSyncTimers.current[brandId]);
      }
      brandSyncTimers.current[brandId] = setTimeout(() => {
        delete pendingBrandSaves.current[brandId];
        saveBrandToFirestore(user.uid, snapshotToSave).catch((err) =>
          console.error('Cloud brand save error:', err)
        );
      }, 250);
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
        console.error('Cloud brand reset error:', err)
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
        console.error('Cloud reset error:', err)
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
              onOpenClearModal={() => setClearModalOpen(true)}
              accountUser={
                user
                  ? {
                      displayName: user.displayName,
                      email: user.email,
                      photoURL: user.photoURL,
                    }
                  : null
              }
              authReady={authReady}
              authBusy={authBusy}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
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

            {(demoPostsCount > 0 || allCurrentBrandPosts.length > 0) && (
              <button
                type="button"
                onClick={() => setClearModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 whitespace-nowrap shrink-0 transition-colors"
                title="Borrar contenido de prueba o vaciar marca"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar prueba</span>
              </button>
            )}

            <PWAInstallButton />

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

      {/* Clear Demo / Brand Content Modal */}
      <ClearContentModal
        open={clearModalOpen}
        demoCount={demoPostsCount}
        currentBrandName={currentBrand.name}
        currentBrandCount={allCurrentBrandPosts.length}
        onClose={() => setClearModalOpen(false)}
        onClearDemoOnly={clearDemoOnly}
        onClearCurrentBrand={clearCurrentBrandPosts}
      />

      {/* PWA Auto-Update & Offline Status */}
      <PWAStatusBanner />
    </div>
  );
}
