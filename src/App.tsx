import { useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Calendar,
  CreditCard,
  Kanban,
  LayoutGrid,
  LogOut,
  Moon,
  PanelRight,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { AccessLobby } from './components/AccessLobby';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminPinModal } from './components/AdminPinModal';
import { BrandManagerModal } from './components/BrandManagerModal';
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
import { RenewalModal } from './components/RenewalModal';
import {
  BRANDS,
  INITIAL_POSTS,
  PLATFORMS,
  TODAY_KEY,
} from './data/initialData';
import { auth, googleProvider } from './firebase';
import {
  adminApproveSubscription,
  adminApproveTrial,
  adminDenyAccount,
  adminUpdateAccount,
  checkIsAdmin,
  ensureUserAccount,
  refreshUserAccountFromServer,
  saveAccessConfig,
  saveAdminPin,
  submitSubscriptionRequest,
  submitTrialRequest,
  subscribeToAccessConfig,
  subscribeToAdminPinConfig,
  subscribeToAllAccounts,
  subscribeToUserAccount,
  verifyAdminPin,
} from './services/accessFirestore';
import {
  createBrandInFirestore,
  createPostInFirestore,
  deleteBrandAndPostsInFirestore,
  deletePostInFirestore,
  deletePostsBatchInFirestore,
  ensureWorkspaceAndSeed,
  refreshWorkspaceFromServer,
  reorderFeedInFirestore,
  resetDemoInFirestore,
  saveBrandToFirestore,
  subscribeToBrands,
  subscribeToPosts,
  updatePostInFirestore,
} from './services/studioFirestore';
import {
  AccessConfig,
  AdminPinConfig,
  DEFAULT_ACCESS_CONFIG,
  UserAccount,
  formatDateShort,
  getDaysRemaining,
  hasPendingEarlyRenewal,
  isAccountAccessActive,
} from './types/access';
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
    return parsed
      .filter(
        (item): item is Brand =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.name === 'string'
      )
      .map((item) => {
        const defaultMatch = BRANDS.find((b) => b.id === item.id);
        return defaultMatch ? { ...defaultMatch, ...item } : item;
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
  const [brands, setBrands] = useState<Brand[]>(loadInitialBrands);
  const [selectedBrandId, setSelectedBrandId] = useState<BrandId>(
    () => loadInitialBrands()[0]?.id || 'exodo'
  );
  const [activeView, setActiveView] = useState<ActiveView>('kanban');
  const [showSideFeed, setShowSideFeed] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<'Todas' | Platform>(
    'Todas'
  );
  const [previewNetwork, setPreviewNetwork] =
    useState<SocialPreviewNetwork>('Instagram');
  const [posts, setPosts] = useState<ContentPost[]>(loadInitialPosts);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState<boolean>(false);
  const [brandManagerOpen, setBrandManagerOpen] = useState<boolean>(false);
  const [clearModalOpen, setClearModalOpen] = useState<boolean>(false);

  // Background cloud auth, access control & admin state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [cloudLoaded, setCloudLoaded] = useState<boolean>(false);
  const [authHint, setAuthHint] = useState<string | null>(null);

  const [accessConfig, setAccessConfig] = useState<AccessConfig>(
    DEFAULT_ACCESS_CONFIG
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [accessChecked, setAccessChecked] = useState<boolean>(false);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [allAccounts, setAllAccounts] = useState<UserAccount[]>([]);
  const [adminPinConfig, setAdminPinConfig] = useState<AdminPinConfig | null>(
    null
  );
  const [adminPinLoaded, setAdminPinLoaded] = useState<boolean>(false);
  const [adminPinUnlocked, setAdminPinUnlocked] = useState<boolean>(false);
  const [adminPinModalOpen, setAdminPinModalOpen] = useState<boolean>(false);
  const [adminModeOpen, setAdminModeOpen] = useState<boolean>(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState<boolean>(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Synchronous refs so React 19 batched state updaters never lose cloud writes
  const postsRef = useRef<ContentPost[]>(posts);
  const brandsRef = useRef<Brand[]>(brands);
  const userRef = useRef<User | null>(user);

  postsRef.current = posts;
  brandsRef.current = brands;
  userRef.current = user;

  // Debounce timers and pending snapshots so edits flush immediately before closing page
  const postSyncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const brandSyncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const pendingPostSaves = useRef<Record<string, ContentPost>>({});
  const pendingBrandSaves = useRef<Record<string, Brand>>({});

  // Subscribe to public Lobby / Trial / Monthly Subscription config in real time
  useEffect(() => {
    const unsub = subscribeToAccessConfig(
      (cfg) => setAccessConfig(cfg),
      () => {
        // Keep default config if temporarily offline
      }
    );
    return () => unsub();
  }, []);

  // Re-evaluate expiration timestamps periodically and on tab focus
  useEffect(() => {
    const tick = () => setNowTick(Date.now());
    const interval = setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      userRef.current = nextUser;
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setAuthHint(null);
      } else {
        setIsAdmin(false);
        setUserAccount(null);
        setAllAccounts([]);
        setAdminPinConfig(null);
        setAdminPinLoaded(false);
        setAdminPinUnlocked(false);
        setAdminPinModalOpen(false);
        setAdminModeOpen(false);
        setAccessChecked(true);
        setCloudLoaded(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // Verify admin role or subscribe to user's access/subscription status
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setIsAdmin(false);
      setUserAccount(null);
      setAllAccounts([]);
      setAdminPinConfig(null);
      setAdminPinLoaded(false);
      setAdminPinUnlocked(false);
      setAdminPinModalOpen(false);
      setAccessChecked(true);
      return;
    }

    let cancelled = false;
    let unsubAccount: (() => void) | null = null;
    let unsubAllAccounts: (() => void) | null = null;
    let unsubAdminPin: (() => void) | null = null;

    setAccessChecked(false);

    checkIsAdmin(user.uid, user.email, Boolean(user.emailVerified))
      .then(async (adminFlag) => {
        if (cancelled) return;
        setIsAdmin(adminFlag);

        if (adminFlag) {
          setUserAccount(null);
          setAccessChecked(true);
          unsubAllAccounts = subscribeToAllAccounts(
            user.uid,
            user.email || '',
            (accountsList) => {
              if (!cancelled) setAllAccounts(accountsList);
            },
            (err) => console.error('Admin accounts listener error:', err)
          );
          unsubAdminPin = subscribeToAdminPinConfig(
            (pinCfg) => {
              if (!cancelled) {
                setAdminPinConfig(pinCfg);
                setAdminPinLoaded(true);
              }
            },
            (err) => {
              console.error('Admin PIN config listener error:', err);
              if (!cancelled) setAdminPinLoaded(true);
            }
          );
          return;
        }

        // Regular user: ensure registration record exists so Admin can monitor them immediately
        try {
          const ensured = await ensureUserAccount(
            user.uid,
            user.email || '',
            user.displayName || ''
          );
          if (!cancelled) {
            setUserAccount(ensured);
          }
        } catch (err) {
          console.error('Ensure account error:', err);
        }

        if (cancelled) return;
        unsubAccount = subscribeToUserAccount(
          user.uid,
          (acc) => {
            if (!cancelled) {
              setUserAccount(acc);
              setAccessChecked(true);
            }
          },
          (err) => {
            console.error('Account sync error:', err);
            if (!cancelled) setAccessChecked(true);
          }
        );
      })
      .catch((err) => {
        console.error('Admin check error:', err);
        if (!cancelled) {
          setIsAdmin(false);
          setAccessChecked(true);
        }
      });

    return () => {
      cancelled = true;
      unsubAccount?.();
      unsubAllAccounts?.();
      unsubAdminPin?.();
    };
  }, [authReady, user]);

  const hasActiveStudioAccess = useMemo(() => {
    if (!user || !accessChecked) return false;
    if (isAdmin) return true;
    return isAccountAccessActive(userAccount, nowTick);
  }, [user, accessChecked, isAdmin, userAccount, nowTick]);

  const pendingAdminCount = useMemo(() => {
    if (!isAdmin) return 0;
    return allAccounts.filter(
      (acc) =>
        acc.accessStatus === 'pending_trial' ||
        acc.accessStatus === 'pending_subscription' ||
        hasPendingEarlyRenewal(acc, nowTick)
    ).length;
  }, [isAdmin, allAccounts, nowTick]);

  // Only load/sync workspace data when the user has verified active access or is admin
  useEffect(() => {
    if (!authReady || !user || !hasActiveStudioAccess) {
      setCloudLoaded(false);
      return;
    }

    let cancelled = false;
    let unsubBrands: (() => void) | null = null;
    let unsubPosts: (() => void) | null = null;
    let brandsReady = false;
    let postsReady = false;
    const markReadyIfBoth = () => {
      if (brandsReady && postsReady && !cancelled) {
        setCloudLoaded(true);
      }
    };

    setCloudLoaded(false);

    let hasLocalPostsOverride = false;
    try {
      hasLocalPostsOverride = localStorage.getItem(STORAGE_POSTS_KEY) !== null;
    } catch {
      hasLocalPostsOverride = false;
    }

    ensureWorkspaceAndSeed(user.uid, user.displayName || 'Usuario', {
      brands: brandsRef.current,
      posts: postsRef.current,
      hasLocalPostsOverride,
    })
      .then(() => {
        if (cancelled) return;
        unsubBrands = subscribeToBrands(
          user.uid,
          (remoteBrands) => {
            const merged = remoteBrands.map(
              (b) => pendingBrandSaves.current[b.id] || b
            );
            brandsRef.current = merged;
            setBrands(merged);
            brandsReady = true;
            markReadyIfBoth();
          },
          (err) => {
            console.error('Cloud brand sync error:', err);
            brandsReady = true;
            markReadyIfBoth();
          }
        );
        unsubPosts = subscribeToPosts(
          user.uid,
          (remotePosts) => {
            const merged = remotePosts.map(
              (p) => pendingPostSaves.current[p.id] || p
            );
            postsRef.current = merged;
            setPosts(merged);
            postsReady = true;
            markReadyIfBoth();
          },
          (err) => {
            console.error('Cloud post sync error:', err);
            postsReady = true;
            markReadyIfBoth();
          }
        );
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Cloud workspace init error:', err);
          setAuthHint(
            'No se pudo sincronizar el espacio con la nube. Verifica tu conexión e intenta recargar.'
          );
          setCloudLoaded(true);
        }
      });

    // Pull latest server state whenever the user returns to the app or switches tabs
    const handleForegroundRefresh = () => {
      if (document.visibilityState === 'hidden' || cancelled) return;
      if (
        Object.keys(pendingPostSaves.current).length > 0 ||
        Object.keys(pendingBrandSaves.current).length > 0
      ) {
        return;
      }
      refreshWorkspaceFromServer(user.uid)
        .then(({ brands: serverBrands, posts: serverPosts }) => {
          if (cancelled) return;
          if (serverBrands.length > 0) {
            brandsRef.current = serverBrands;
            setBrands(serverBrands);
          }
          postsRef.current = serverPosts;
          setPosts(serverPosts);
        })
        .catch(() => {
          // Ignore transient offline refresh failures
        });
    };

    window.addEventListener('focus', handleForegroundRefresh);
    document.addEventListener('visibilitychange', handleForegroundRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleForegroundRefresh);
      document.removeEventListener('visibilitychange', handleForegroundRefresh);
      unsubBrands?.();
      unsubPosts?.();
    };
  }, [authReady, user, hasActiveStudioAccess]);

  // Keep selectedBrandId valid whenever brands change (locally or remotely)
  useEffect(() => {
    if (brands.length > 0 && !brands.some((b) => b.id === selectedBrandId)) {
      setSelectedBrandId(brands[0].id);
      setSelectedPostId(null);
    }
  }, [brands, selectedBrandId]);

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
          if (Array.isArray(parsed)) {
            postsRef.current = parsed;
            setPosts(parsed);
          }
        } catch {
          // Ignore malformed storage data
        }
      }
      if (e.key === STORAGE_BRANDS_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            brandsRef.current = parsed;
            setBrands(parsed);
          }
        } catch {
          // Ignore malformed storage data
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Flush any pending cloud updates immediately when leaving or backgrounding the app
  useEffect(() => {
    const flushPending = () => {
      const activeUser = userRef.current;
      if (!activeUser) return;
      Object.entries(pendingPostSaves.current).forEach(([postId, snapshot]) => {
        if (postSyncTimers.current[postId]) {
          clearTimeout(postSyncTimers.current[postId]);
          delete postSyncTimers.current[postId];
        }
        delete pendingPostSaves.current[postId];
        updatePostInFirestore(activeUser.uid, snapshot).catch(() => {});
      });
      Object.entries(pendingBrandSaves.current).forEach(
        ([brandId, snapshot]) => {
          if (brandSyncTimers.current[brandId]) {
            clearTimeout(brandSyncTimers.current[brandId]);
            delete brandSyncTimers.current[brandId];
          }
          delete pendingBrandSaves.current[brandId];
          saveBrandToFirestore(activeUser.uid, snapshot).catch(() => {});
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
  }, []);

  const handleSignIn = async () => {
    setAuthBusy(true);
    setAuthHint(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('unauthorized-domain')) {
        setAuthHint(
          `El dominio "${window.location.hostname}" debe agregarse en los dominios autorizados de tu consola de autenticación para iniciar sesión.`
        );
      } else if (msg.includes('popup-blocked')) {
        setAuthHint(
          'Tu navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes e intenta de nuevo.'
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        console.error('Sign-in error:', err);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRequestOpenAdmin = () => {
    if (!isAdmin) return;
    if (adminPinUnlocked) {
      setAdminModeOpen(true);
    } else {
      setAdminPinModalOpen(true);
    }
  };

  const handleLockAdmin = () => {
    setAdminPinUnlocked(false);
    setAdminModeOpen(false);
  };

  const handleReauthenticateForPinReset = async (): Promise<boolean> => {
    const activeUser = auth.currentUser;
    if (!activeUser) return false;
    try {
      await reauthenticateWithPopup(activeUser, googleProvider);
      return true;
    } catch {
      return false;
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      // Flush any pending cloud saves before signing out
      const activeUser = userRef.current;
      if (activeUser) {
        const flushes: Promise<unknown>[] = [];
        Object.entries(pendingPostSaves.current).forEach(([postId, snapshot]) => {
          if (postSyncTimers.current[postId]) {
            clearTimeout(postSyncTimers.current[postId]);
            delete postSyncTimers.current[postId];
          }
          delete pendingPostSaves.current[postId];
          flushes.push(
            updatePostInFirestore(activeUser.uid, snapshot).catch(() => {})
          );
        });
        Object.entries(pendingBrandSaves.current).forEach(
          ([brandId, snapshot]) => {
            if (brandSyncTimers.current[brandId]) {
              clearTimeout(brandSyncTimers.current[brandId]);
              delete brandSyncTimers.current[brandId];
            }
            delete pendingBrandSaves.current[brandId];
            flushes.push(
              saveBrandToFirestore(activeUser.uid, snapshot).catch(() => {})
            );
          }
        );
        if (flushes.length > 0) {
          await Promise.allSettled(flushes);
        }
      }

      // Clear local workspace cache so switching to another email starts cleanly in the Lobby
      try {
        localStorage.removeItem(STORAGE_POSTS_KEY);
        localStorage.removeItem(STORAGE_BRANDS_KEY);
      } catch {
        // Ignore storage errors
      }

      setAdminModeOpen(false);
      setAdminPinUnlocked(false);
      setAdminPinModalOpen(false);
      setSelectedPostId(null);
      setRenewalModalOpen(false);
      postsRef.current = INITIAL_POSTS;
      brandsRef.current = BRANDS;
      setPosts(INITIAL_POSTS);
      setBrands(BRANDS);
      setSelectedBrandId(BRANDS[0].id);

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
    const counts: Record<string, number> = {};
    brands.forEach((b) => {
      counts[b.id] = 0;
    });
    posts.forEach((p) => {
      counts[p.brandId] = (counts[p.brandId] ?? 0) + 1;
    });
    return counts;
  }, [brands, posts]);

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
    const brandItems = postsRef.current.filter(
      (p) => p.brandId === selectedBrandId
    );
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

    const nextPosts = [created, ...postsRef.current];
    postsRef.current = nextPosts;
    setPosts(nextPosts);
    setSelectedPostId(newId);

    if (userRef.current) {
      createPostInFirestore(userRef.current.uid, created).catch((err) =>
        console.error('Cloud create error:', err)
      );
    }
  };

  const updatePost = (postId: string, patch: Partial<ContentPost>) => {
    const existing = postsRef.current.find((p) => p.id === postId);
    if (!existing) return;

    const nextFull: ContentPost = { ...existing, ...patch };
    const nextPosts = postsRef.current.map((p) =>
      p.id === postId ? nextFull : p
    );
    postsRef.current = nextPosts;
    setPosts(nextPosts);

    const activeUser = userRef.current;
    if (activeUser) {
      pendingPostSaves.current[postId] = nextFull;
      if (postSyncTimers.current[postId]) {
        clearTimeout(postSyncTimers.current[postId]);
      }
      postSyncTimers.current[postId] = setTimeout(() => {
        delete postSyncTimers.current[postId];
        updatePostInFirestore(activeUser.uid, nextFull)
          .catch((err) => console.error('Cloud update error:', err))
          .finally(() => {
            if (pendingPostSaves.current[postId] === nextFull) {
              delete pendingPostSaves.current[postId];
            }
          });
      }, 220);
    }
  };

  const deletePost = (postId: string) => {
    const nextPosts = postsRef.current.filter((p) => p.id !== postId);
    postsRef.current = nextPosts;
    setPosts(nextPosts);
    if (selectedPostId === postId) setSelectedPostId(null);

    if (postSyncTimers.current[postId]) {
      clearTimeout(postSyncTimers.current[postId]);
      delete postSyncTimers.current[postId];
    }
    delete pendingPostSaves.current[postId];

    if (userRef.current) {
      deletePostInFirestore(userRef.current.uid, postId).catch((err) =>
        console.error('Cloud delete error:', err)
      );
    }
  };

  const clearDemoOnly = () => {
    const idsToDelete = postsRef.current
      .filter((p) => DEMO_POST_IDS.has(p.id))
      .map((p) => p.id);
    if (idsToDelete.length === 0) return;

    const nextPosts = postsRef.current.filter((p) => !DEMO_POST_IDS.has(p.id));
    postsRef.current = nextPosts;
    setPosts(nextPosts);
    if (selectedPostId && DEMO_POST_IDS.has(selectedPostId)) {
      setSelectedPostId(null);
    }

    idsToDelete.forEach((id) => {
      if (postSyncTimers.current[id]) {
        clearTimeout(postSyncTimers.current[id]);
        delete postSyncTimers.current[id];
      }
      delete pendingPostSaves.current[id];
    });

    if (userRef.current) {
      deletePostsBatchInFirestore(userRef.current.uid, idsToDelete).catch(
        (err) => console.error('Cloud batch delete error:', err)
      );
    }
  };

  const clearCurrentBrandPosts = () => {
    const idsToDelete = postsRef.current
      .filter((p) => p.brandId === selectedBrandId)
      .map((p) => p.id);
    if (idsToDelete.length === 0) return;
    const idSet = new Set(idsToDelete);

    const nextPosts = postsRef.current.filter(
      (p) => p.brandId !== selectedBrandId
    );
    postsRef.current = nextPosts;
    setPosts(nextPosts);
    if (selectedPostId && idSet.has(selectedPostId)) {
      setSelectedPostId(null);
    }

    idsToDelete.forEach((id) => {
      if (postSyncTimers.current[id]) {
        clearTimeout(postSyncTimers.current[id]);
        delete postSyncTimers.current[id];
      }
      delete pendingPostSaves.current[id];
    });

    if (userRef.current) {
      deletePostsBatchInFirestore(userRef.current.uid, idsToDelete).catch(
        (err) => console.error('Cloud brand clear error:', err)
      );
    }
  };

  const reorderFeed = (orderedIds: string[]) => {
    const nextPosts = postsRef.current.map((p) => {
      const idx = orderedIds.indexOf(p.id);
      return idx !== -1 ? { ...p, feedOrder: idx } : p;
    });
    postsRef.current = nextPosts;
    setPosts(nextPosts);

    if (userRef.current) {
      reorderFeedInFirestore(userRef.current.uid, orderedIds).catch((err) =>
        console.error('Cloud reorder error:', err)
      );
    }
  };

  const createBrand = (newBrand: Brand) => {
    const nextBrands = [...brandsRef.current, newBrand];
    brandsRef.current = nextBrands;
    setBrands(nextBrands);
    setSelectedBrandId(newBrand.id);
    setSelectedPostId(null);

    if (userRef.current) {
      createBrandInFirestore(userRef.current.uid, newBrand).catch((err) =>
        console.error('Cloud brand create error:', err)
      );
    }
  };

  const updateBrand = (brandId: BrandId, patch: Partial<Brand>) => {
    const existing = brandsRef.current.find((b) => b.id === brandId);
    if (!existing) return;

    const nextFull: Brand = { ...existing, ...patch };
    const nextBrands = brandsRef.current.map((b) =>
      b.id === brandId ? nextFull : b
    );
    brandsRef.current = nextBrands;
    setBrands(nextBrands);

    const activeUser = userRef.current;
    if (activeUser) {
      pendingBrandSaves.current[brandId] = nextFull;
      if (brandSyncTimers.current[brandId]) {
        clearTimeout(brandSyncTimers.current[brandId]);
      }
      brandSyncTimers.current[brandId] = setTimeout(() => {
        delete brandSyncTimers.current[brandId];
        saveBrandToFirestore(activeUser.uid, nextFull)
          .catch((err) => console.error('Cloud brand save error:', err))
          .finally(() => {
            if (pendingBrandSaves.current[brandId] === nextFull) {
              delete pendingBrandSaves.current[brandId];
            }
          });
      }, 220);
    }
  };

  const deleteBrand = (brandId: BrandId) => {
    if (brandsRef.current.length <= 1) return;

    const nextBrands = brandsRef.current.filter((b) => b.id !== brandId);
    const postIdsToDelete = postsRef.current
      .filter((p) => p.brandId === brandId)
      .map((p) => p.id);
    const postIdSet = new Set(postIdsToDelete);
    const nextPosts = postsRef.current.filter((p) => p.brandId !== brandId);

    brandsRef.current = nextBrands;
    postsRef.current = nextPosts;
    setBrands(nextBrands);
    setPosts(nextPosts);

    if (selectedBrandId === brandId && nextBrands[0]) {
      setSelectedBrandId(nextBrands[0].id);
    }
    if (selectedPostId && postIdSet.has(selectedPostId)) {
      setSelectedPostId(null);
    }

    if (brandSyncTimers.current[brandId]) {
      clearTimeout(brandSyncTimers.current[brandId]);
      delete brandSyncTimers.current[brandId];
    }
    delete pendingBrandSaves.current[brandId];
    postIdsToDelete.forEach((id) => {
      if (postSyncTimers.current[id]) {
        clearTimeout(postSyncTimers.current[id]);
        delete postSyncTimers.current[id];
      }
      delete pendingPostSaves.current[id];
    });

    if (userRef.current) {
      deleteBrandAndPostsInFirestore(
        userRef.current.uid,
        brandId,
        postIdsToDelete
      ).catch((err) => console.error('Cloud brand delete error:', err));
    }
  };

  const resetBrand = (brandId: BrandId) => {
    const defaultBrand = BRANDS.find((b) => b.id === brandId);
    const existing = brandsRef.current.find((b) => b.id === brandId);
    if (!existing) return;

    const nextBrand: Brand = defaultBrand
      ? defaultBrand
      : {
          ...existing,
          description: '',
          category: 'Marca',
          website: '',
          avatarUrl: '',
          verified: false,
          igPostsOverride: '',
          igFollowers: '0',
          igFollowing: '0',
          showStoryRing: true,
          ttFollowing: '0',
          ttFollowers: '0',
          ttLikes: '0',
          ttShowPinned: true,
          highlights: [],
        };

    const nextBrands = brandsRef.current.map((b) =>
      b.id === brandId ? nextBrand : b
    );
    brandsRef.current = nextBrands;
    setBrands(nextBrands);

    if (userRef.current) {
      saveBrandToFirestore(userRef.current.uid, nextBrand).catch((err) =>
        console.error('Cloud brand reset error:', err)
      );
    }
  };

  const resetDemo = () => {
    const existingBrandIds = brandsRef.current.map((b) => b.id);
    const existingPostIds = postsRef.current.map((p) => p.id);
    postsRef.current = INITIAL_POSTS;
    brandsRef.current = BRANDS;
    setPosts(INITIAL_POSTS);
    setBrands(BRANDS);
    setSelectedBrandId(BRANDS[0].id);
    setSearchQuery('');
    setPlatformFilter('Todas');
    setSelectedPostId(null);

    if (userRef.current) {
      resetDemoInFirestore(
        userRef.current.uid,
        existingBrandIds,
        existingPostIds
      ).catch((err) => console.error('Cloud reset error:', err));
    }
  };

  if (
    !authReady ||
    (user && !accessChecked) ||
    (user && hasActiveStudioAccess && !cloudLoaded)
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 p-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs font-mono">
            O
          </span>
          <span className="font-semibold text-sm tracking-tight">
            {accessConfig.lobbyTitle}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {user && !accessChecked
            ? 'Verificando tu acceso...'
            : 'Cargando tu espacio de trabajo...'}
        </p>
      </div>
    );
  }

  // Public Lobby & Access Gate (Not signed in, pending approval, expired, or suspended)
  if (!user || !hasActiveStudioAccess) {
    return (
      <AccessLobby
        user={
          user
            ? {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
              }
            : null
        }
        account={userAccount}
        config={accessConfig}
        darkMode={darkMode}
        authBusy={authBusy}
        authHint={authHint}
        onToggleTheme={() => setDarkMode((d) => !d)}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSubmitTrial={async (data) => {
          if (!user) return;
          await submitTrialRequest(user.uid, data);
        }}
        onSubmitSubscription={async (data) => {
          if (!user) return;
          await submitSubscriptionRequest(user.uid, userAccount, data);
        }}
        onRefreshStatus={async () => {
          if (!user) return;
          const fresh = await refreshUserAccountFromServer(user.uid);
          setUserAccount(fresh);
          setNowTick(Date.now());
        }}
      />
    );
  }

  const userDaysLeft =
    !isAdmin && userAccount
      ? getDaysRemaining(userAccount.accessExpiresAtMs, nowTick)
      : null;

  const userPlanSummary =
    !isAdmin && userAccount
      ? `${
          userAccount.accessStatus === 'trial_active' ? 'Prueba' : 'Suscripción'
        } · ${userDaysLeft}d (vence ${formatDateShort(userAccount.accessExpiresAtMs)})`
      : null;

  const showExpiringSoonBanner =
    !isAdmin &&
    userAccount !== null &&
    userDaysLeft !== null &&
    userDaysLeft <= 5;

  if (isAdmin && adminModeOpen && adminPinUnlocked) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="sticky top-0 z-30 pt-safe border-b border-slate-200 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                O
              </span>
              <span className="font-semibold text-sm tracking-tight truncate whitespace-nowrap">
                {accessConfig.lobbyTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                aria-label={
                  darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
                }
                className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full px-4 sm:px-6 py-6 pb-safe">
          <AdminDashboard
            accounts={allAccounts}
            config={accessConfig}
            adminEmail={user.email || ''}
            pinConfig={adminPinConfig}
            onBackToStudio={() => setAdminModeOpen(false)}
            onLockAdmin={handleLockAdmin}
            onSignOut={handleSignOut}
            onSaveConfig={saveAccessConfig}
            onVerifyCurrentPin={async (pin) => {
              if (!adminPinConfig) return true;
              return verifyAdminPin(pin, adminPinConfig);
            }}
            onChangeAdminPin={async (newPin) => {
              const saved = await saveAdminPin(newPin);
              setAdminPinConfig(saved);
            }}
            onApproveTrial={adminApproveTrial}
            onApproveSubscription={adminApproveSubscription}
            onUpdateAccount={adminUpdateAccount}
            onDenyAccount={adminDenyAccount}
          />
        </main>
        <PWAStatusBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 pt-safe border-b border-slate-200 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
          {/* Zone 1: Wordmark + Active Brand + Desktop Manage Brands */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 md:flex-initial">
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs font-mono">
                O
              </span>
              <span className="font-semibold text-sm tracking-tight whitespace-nowrap hidden xl:inline">
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
              onOpenBrandManager={() => setBrandManagerOpen(true)}
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
              isAdmin={isAdmin}
              pendingAdminCount={pendingAdminCount}
              onOpenAdmin={handleRequestOpenAdmin}
              planSummary={userPlanSummary}
              onOpenRenewal={() => setRenewalModalOpen(true)}
            />

            <button
              type="button"
              onClick={() => setBrandManagerOpen(true)}
              title="Agregar, cambiar nombre o quitar marcas"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              <span>Marcas</span>
            </button>
          </div>

          {/* Zone 2: Primary View Switcher (Desktop md+) */}
          <nav
            aria-label="Vistas del estudio"
            className="hidden md:flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 shrink-0"
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
              <span>Kanban</span>
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
              <span>Calendario</span>
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
              <span>Feed Visual</span>
            </button>
          </nav>

          {/* Zone 3: Desktop Primary Action, Admin Access, Sign Out & Mobile Utilities */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={handleRequestOpenAdmin}
                title="Abrir Panel de Administrador (requiere PIN)"
                aria-label="Abrir Panel de Administrador"
                className="inline-flex items-center justify-center gap-1.5 min-w-[38px] min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 transition-colors whitespace-nowrap shrink-0"
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Admin</span>
                {pendingAdminCount > 0 && (
                  <span className="font-mono tabular-nums text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    ({pendingAdminCount})
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setBrandManagerOpen(true)}
              title="Administrar marcas"
              aria-label="Administrar marcas"
              className="md:hidden inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={
                darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
              }
              className="md:hidden inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              disabled={authBusy}
              onClick={handleSignOut}
              title="Cerrar sesión y volver al Lobby"
              aria-label="Cerrar sesión y volver al Lobby"
              className="inline-flex items-center justify-center gap-1.5 min-w-[38px] min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>

            <button
              type="button"
              onClick={() => createPost({ status: 'estrategia' })}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Pieza</span>
            </button>
          </div>
        </div>
      </header>

      {/* Renewal Reminder Banner when trial or monthly subscription is expiring soon */}
      {showExpiringSoonBanner && (
        <div className="border-b border-amber-500/25 bg-amber-500/10">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-amber-900 dark:text-amber-200">
              {userAccount.accessStatus === 'trial_active'
                ? 'Tu modo de prueba'
                : 'Tu suscripción mensual'}{' '}
              vence en{' '}
              <strong className="font-mono tabular-nums">
                {userDaysLeft} {userDaysLeft === 1 ? 'día' : 'días'}
              </strong>{' '}
              ({formatDateShort(userAccount.accessExpiresAtMs)}).
            </p>
            <button
              type="button"
              onClick={() => setRenewalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Renovar suscripción
            </button>
          </div>
        </div>
      )}

      {authHint && (
        <div className="border-b border-amber-500/25 bg-amber-500/10">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
            <span>{authHint}</span>
            <button
              type="button"
              onClick={() => setAuthHint(null)}
              aria-label="Cerrar mensaje"
              className="p-1 rounded hover:bg-amber-500/20 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Workspace Control Strip */}
      <div className="border-b border-slate-200/80 dark:border-zinc-800/70 bg-white/50 dark:bg-zinc-950/60">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col md:flex-row md:flex-wrap md:items-center justify-between gap-2 sm:gap-3">
          {/* Left: Search & Platform Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pieza, copy o responsable..."
                aria-label="Buscar piezas de contenido"
                className="w-full min-h-[38px] sm:min-h-0 pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(['Todas', ...PLATFORMS] as const).map((pl) => {
                const active = platformFilter === pl;
                return (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => handleSelectPlatformFilter(pl)}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
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

          {/* Right: Summary + Workspace Utilities */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 transition-colors"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Oscuro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-3 sm:py-4 pb-24 md:pb-6">
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

          {/* Sticky Side Visual Feed Preview (Desktop lg+ only; mobile uses dedicated Feed tab) */}
          {activeView !== 'grid' && showSideFeed && (
            <aside className="hidden lg:block w-full lg:w-[340px] xl:w-[370px] shrink-0 lg:sticky lg:top-18">
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

      {/* Fixed Mobile Bottom Navigation Bar (< md) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-4 h-16 px-1.5 items-center">
          <button
            type="button"
            onClick={() => setActiveView('kanban')}
            className={`flex flex-col items-center justify-center gap-1 h-12 rounded-xl text-[11px] font-medium transition-colors ${
              activeView === 'kanban'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            <Kanban className="w-5 h-5" />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('calendar')}
            className={`flex flex-col items-center justify-center gap-1 h-12 rounded-xl text-[11px] font-medium transition-colors ${
              activeView === 'calendar'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Calendario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('grid')}
            className={`flex flex-col items-center justify-center gap-1 h-12 rounded-xl text-[11px] font-medium transition-colors ${
              activeView === 'grid'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Feed</span>
          </button>

          <button
            type="button"
            onClick={() => createPost({ status: 'estrategia' })}
            className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl text-[11px] font-semibold text-white bg-indigo-600 active:bg-indigo-500 mx-1 shadow-xs transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva</span>
          </button>
        </div>
      </nav>

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

      {/* Brand Manager Modal (Create, Rename, Delete) */}
      <BrandManagerModal
        open={brandManagerOpen}
        brands={brands}
        selectedBrandId={selectedBrandId}
        countsByBrand={countsByBrand}
        onClose={() => setBrandManagerOpen(false)}
        onSelectBrand={(brandId) => {
          setSelectedBrandId(brandId);
          setSelectedPostId(null);
        }}
        onCreateBrand={createBrand}
        onRenameBrand={updateBrand}
        onDeleteBrand={deleteBrand}
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

      {/* Early Monthly Renewal Modal for Active Users */}
      <RenewalModal
        open={renewalModalOpen}
        config={accessConfig}
        account={userAccount}
        onClose={() => setRenewalModalOpen(false)}
        onSubmitRenewal={async (data) => {
          if (!user) return;
          await submitSubscriptionRequest(user.uid, userAccount, data);
        }}
      />

      {/* Admin 4/6-Digit PIN Gate Modal */}
      {isAdmin && (
        <AdminPinModal
          open={adminPinModalOpen}
          pinConfig={adminPinConfig}
          pinConfigLoaded={adminPinLoaded}
          adminEmail={user.email || ''}
          onClose={() => setAdminPinModalOpen(false)}
          onVerifyPin={async (pin) => {
            if (!adminPinConfig) return false;
            return verifyAdminPin(pin, adminPinConfig);
          }}
          onSaveNewPin={async (newPin) => {
            const saved = await saveAdminPin(newPin);
            setAdminPinConfig(saved);
          }}
          onReauthenticateForReset={handleReauthenticateForPinReset}
          onUnlocked={() => {
            setAdminPinUnlocked(true);
            setAdminPinModalOpen(false);
            setAdminModeOpen(true);
          }}
        />
      )}

      {/* PWA Auto-Update & Offline Status */}
      <PWAStatusBanner />
    </div>
  );
}
