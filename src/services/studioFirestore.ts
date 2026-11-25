import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { BRANDS, INITIAL_POSTS } from '../data/initialData';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { Brand, BrandHighlight, BrandId, ContentPost } from '../types/content';

const HEX_PATTERN = /^#[0-9a-fA-F]{3,8}$/;
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_POST_MEDIA_BYTES = 700_000;
const FIRESTORE_BATCH_CHUNK_SIZE = 400;

function isSafePersistableMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('blob:')) return false;
  return (
    value.startsWith('https://') ||
    value.startsWith('http://') ||
    value.startsWith('data:image/')
  );
}

async function commitInChunks<T>(
  items: T[],
  applyOp: (batch: ReturnType<typeof writeBatch>, item: T, index: number) => void
): Promise<void> {
  if (items.length === 0) return;
  for (let start = 0; start < items.length; start += FIRESTORE_BATCH_CHUNK_SIZE) {
    const slice = items.slice(start, start + FIRESTORE_BATCH_CHUNK_SIZE);
    const batch = writeBatch(db);
    slice.forEach((item, offset) => applyOp(batch, item, start + offset));
    await batch.commit();
  }
}

function sanitizeString(value: unknown, maxLength: number, fallback = ''): string {
  const str = typeof value === 'string' ? value : fallback;
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

function sanitizeNonEmptyString(
  value: unknown,
  maxLength: number,
  fallback: string
): string {
  const cleaned = sanitizeString(value, maxLength, fallback).trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value === 'string' && HEX_PATTERN.test(value)) {
    return value;
  }
  return fallback;
}

function sanitizeHighlights(highlights: BrandHighlight[] | undefined): BrandHighlight[] {
  if (!Array.isArray(highlights)) return [];
  return highlights.slice(0, 12).map((h, idx) => {
    const clean: BrandHighlight = {
      id:
        typeof h.id === 'string' && ID_PATTERN.test(h.id)
          ? h.id.slice(0, 64)
          : `hl-${idx}`,
      label: sanitizeString(h.label, 30, 'Destacada'),
      tint: sanitizeHex(h.tint, '#27272a'),
    };
    if (h.imageUrl && typeof h.imageUrl === 'string' && h.imageUrl.length <= 60000) {
      clean.imageUrl = h.imageUrl;
    }
    return clean;
  });
}

function buildBrandFirestorePayload(
  brand: Brand,
  ownerId: string,
  isCreate: boolean
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: brand.id,
    ownerId,
    name: sanitizeNonEmptyString(brand.name, 80, 'Marca'),
    badge: sanitizeNonEmptyString(brand.badge, 4, 'OM'),
    accent: sanitizeHex(brand.accent, '#18181b'),
    accentLight: sanitizeHex(brand.accentLight, '#f4f4f5'),
    description: sanitizeString(brand.description, 300),
    handle: sanitizeNonEmptyString(brand.handle, 60, 'usuario'),
    category: sanitizeString(brand.category, 60),
    website: sanitizeString(brand.website, 160),
    avatarUrl:
      typeof brand.avatarUrl === 'string' && brand.avatarUrl.length <= 250000
        ? brand.avatarUrl
        : '',
    verified: Boolean(brand.verified),
    igPostsOverride: sanitizeString(brand.igPostsOverride, 20),
    igFollowers: sanitizeString(brand.igFollowers, 20, '0'),
    igFollowing: sanitizeString(brand.igFollowing, 20, '0'),
    showStoryRing: brand.showStoryRing !== false,
    ttFollowing: sanitizeString(brand.ttFollowing, 20, '0'),
    ttFollowers: sanitizeString(brand.ttFollowers, 20, '0'),
    ttLikes: sanitizeString(brand.ttLikes, 20, '0'),
    ttShowPinned: brand.ttShowPinned !== false,
    highlights: sanitizeHighlights(brand.highlights),
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    payload.createdAt = serverTimestamp();
  }
  return payload;
}

function buildPostFirestorePayload(
  post: ContentPost,
  ownerId: string,
  isCreate: boolean
): Record<string, unknown> {
  const safeCover =
    isSafePersistableMediaUrl(post.coverUrl) && post.coverUrl.length <= 250000
      ? post.coverUrl
      : '';

  let remainingMediaBudget = Math.max(0, MAX_POST_MEDIA_BYTES - safeCover.length);

  const safeMedia = Array.isArray(post.mediaItems)
    ? post.mediaItems.slice(0, 10).map((m, idx) => {
        const isVideo = m.type === 'video';
        let persistedUrl = '';
        if (
          !isVideo &&
          isSafePersistableMediaUrl(m.url) &&
          m.url.length <= 180000 &&
          m.url.length <= remainingMediaBudget
        ) {
          persistedUrl = m.url;
          remainingMediaBudget -= m.url.length;
        }

        let persistedThumb = '';
        if (
          isVideo &&
          isSafePersistableMediaUrl(m.thumbnailUrl) &&
          m.thumbnailUrl.length <= 180000 &&
          m.thumbnailUrl.length <= remainingMediaBudget
        ) {
          persistedThumb = m.thumbnailUrl;
          remainingMediaBudget -= m.thumbnailUrl.length;
        }

        const item: Record<string, unknown> = {
          id:
            typeof m.id === 'string' && ID_PATTERN.test(m.id)
              ? m.id.slice(0, 64)
              : `m-${idx}`,
          name: sanitizeString(m.name, 120, 'archivo'),
          type: isVideo ? 'video' : 'image',
          url: persistedUrl,
        };
        if (persistedThumb) {
          item.thumbnailUrl = persistedThumb;
        }
        if (
          typeof m.fileSizeMB === 'number' &&
          Number.isFinite(m.fileSizeMB) &&
          m.fileSizeMB >= 0 &&
          m.fileSizeMB <= 500
        ) {
          item.fileSizeMB = Math.round(m.fileSizeMB * 10) / 10;
        }
        return item;
      })
    : [];

  const safeChecklist = Array.isArray(post.checklist)
    ? post.checklist.slice(0, 30).map((c, idx) => ({
        id:
          typeof c.id === 'string' && ID_PATTERN.test(c.id)
            ? c.id.slice(0, 64)
            : `chk-${idx}`,
        text: sanitizeString(c.text, 200),
        done: Boolean(c.done),
      }))
    : [];

  const safeComments = Array.isArray(post.comments)
    ? post.comments.slice(0, 50).map((c, idx) => ({
        id:
          typeof c.id === 'string' && ID_PATTERN.test(c.id)
            ? c.id.slice(0, 64)
            : `cmt-${idx}`,
        author: c.author,
        text: sanitizeString(c.text, 600),
        time: sanitizeString(c.time, 40, 'Ahora'),
      }))
    : [];

  const safeFeedOrder =
    typeof post.feedOrder === 'number' && Number.isFinite(post.feedOrder)
      ? Math.max(0, Math.min(10000, Math.round(post.feedOrder)))
      : 0;

  const payload: Record<string, unknown> = {
    id: post.id,
    ownerId,
    brandId: post.brandId,
    title: sanitizeNonEmptyString(post.title, 160, 'Sin título'),
    status: post.status,
    platform: post.platform,
    contentType: post.contentType,
    date: sanitizeString(post.date, 16),
    time: sanitizeString(post.time, 10),
    assignee: post.assignee,
    coverUrl: safeCover,
    mediaType: post.mediaType === 'video' ? 'video' : 'image',
    mediaItems: safeMedia,
    caption: sanitizeString(post.caption, 3000),
    hashtags: sanitizeString(post.hashtags, 1000),
    cta: sanitizeString(post.cta, 500),
    internalNotes: sanitizeString(post.internalNotes, 2000),
    checklist: safeChecklist,
    comments: safeComments,
    feedOrder: safeFeedOrder,
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    payload.createdAt = serverTimestamp();
  }
  return payload;
}

export interface LocalWorkspaceSeed {
  brands: Brand[];
  posts: ContentPost[];
  hasLocalPostsOverride: boolean;
}

export async function ensureWorkspaceAndSeed(
  uid: string,
  displayName: string,
  localSeed?: LocalWorkspaceSeed
): Promise<void> {
  let isNewWorkspace = false;
  const userPath = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      isNewWorkspace = true;
      await setDoc(userRef, {
        ownerId: uid,
        displayName: sanitizeString(displayName, 120, 'Usuario'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  const brandsToSeed =
    localSeed && localSeed.brands.length > 0 ? localSeed.brands : BRANDS;
  const seededBrandIds = new Set(brandsToSeed.map((b) => b.id));

  const brandsPath = `users/${uid}/brands`;
  try {
    const brandsQuery = query(
      collection(db, 'users', uid, 'brands'),
      where('ownerId', '==', uid)
    );
    const brandSnap = await getDocs(brandsQuery);
    if (brandSnap.empty) {
      const batch = writeBatch(db);
      brandsToSeed.forEach((b) => {
        const ref = doc(db, 'users', uid, 'brands', b.id);
        batch.set(ref, buildBrandFirestorePayload(b, uid, true));
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, brandsPath);
  }

  // Only seed posts when the cloud workspace is created for the very first time
  if (!isNewWorkspace) return;

  const postsToSeed =
    localSeed && localSeed.hasLocalPostsOverride
      ? localSeed.posts.filter((p) => seededBrandIds.has(p.brandId))
      : INITIAL_POSTS.filter((p) => seededBrandIds.has(p.brandId));

  if (postsToSeed.length === 0) return;

  const postsPath = `users/${uid}/posts`;
  try {
    const postsQuery = query(
      collection(db, 'users', uid, 'posts'),
      where('ownerId', '==', uid)
    );
    const postSnap = await getDocs(postsQuery);
    if (postSnap.empty) {
      await commitInChunks(postsToSeed, (batch, p) => {
        const ref = doc(db, 'users', uid, 'posts', p.id);
        batch.set(ref, buildPostFirestorePayload(p, uid, true));
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, postsPath);
  }
}

function mapBrandDocs(
  docs: { id: string; data: () => Record<string, unknown> }[]
): Brand[] {
  const items = docs.map((d) => {
    const raw = d.data() as unknown as Brand & { createdAt?: unknown };
    const defaultMatch = BRANDS.find((b) => b.id === d.id);
    const merged: Brand = defaultMatch
      ? { ...defaultMatch, ...raw, id: d.id }
      : {
          id: d.id,
          name: raw.name || 'Marca',
          badge: raw.badge || 'MC',
          accent: raw.accent || '#4f46e5',
          accentLight: raw.accentLight || '#eef2ff',
          description: raw.description || '',
          handle: raw.handle || 'marca',
          category: raw.category || '',
          website: raw.website || '',
          avatarUrl: raw.avatarUrl || '',
          verified: Boolean(raw.verified),
          igPostsOverride: raw.igPostsOverride || '',
          igFollowers: raw.igFollowers || '0',
          igFollowing: raw.igFollowing || '0',
          showStoryRing: raw.showStoryRing !== false,
          ttFollowing: raw.ttFollowing || '0',
          ttFollowers: raw.ttFollowers || '0',
          ttLikes: raw.ttLikes || '0',
          ttShowPinned: raw.ttShowPinned !== false,
          highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
        };
    return {
      brand: merged,
      defaultIdx: DEFAULT_BRAND_ORDER.get(d.id) ?? 999,
      createdMs: getTimestampMillis(raw.createdAt),
    };
  });

  items.sort((a, b) => {
    if (a.defaultIdx !== b.defaultIdx) return a.defaultIdx - b.defaultIdx;
    if (a.createdMs !== b.createdMs) return a.createdMs - b.createdMs;
    return a.brand.name.localeCompare(b.brand.name);
  });

  return items.map((item) => item.brand);
}

export async function refreshWorkspaceFromServer(
  uid: string
): Promise<{ brands: Brand[]; posts: ContentPost[] }> {
  const brandsQuery = query(
    collection(db, 'users', uid, 'brands'),
    where('ownerId', '==', uid)
  );
  const postsQuery = query(
    collection(db, 'users', uid, 'posts'),
    where('ownerId', '==', uid)
  );

  const [brandSnap, postSnap] = await Promise.all([
    getDocsFromServer(brandsQuery),
    getDocsFromServer(postsQuery),
  ]);

  const brands = mapBrandDocs(brandSnap.docs);
  const posts: ContentPost[] = postSnap.docs
    .map((d) => ({ ...(d.data() as ContentPost), id: d.id }))
    .sort((a, b) => (a.feedOrder ?? 999) - (b.feedOrder ?? 999));

  return { brands, posts };
}

const DEFAULT_BRAND_ORDER = new Map(BRANDS.map((b, idx) => [b.id, idx]));

function getTimestampMillis(value: unknown): number {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Number.MAX_SAFE_INTEGER;
}

export function subscribeToBrands(
  uid: string,
  onData: (brands: Brand[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/brands`;
  const q = query(
    collection(db, 'users', uid, 'brands'),
    where('ownerId', '==', uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const mapped = mapBrandDocs(snapshot.docs);
      if (mapped.length > 0) {
        onData(mapped);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeToPosts(
  uid: string,
  onData: (posts: ContentPost[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/posts`;
  const q = query(
    collection(db, 'users', uid, 'posts'),
    where('ownerId', '==', uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ContentPost[] = snapshot.docs.map((d) => {
        const raw = d.data() as ContentPost;
        return { ...raw, id: d.id };
      });
      items.sort((a, b) => (a.feedOrder ?? 999) - (b.feedOrder ?? 999));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message) : '';
  return code === 'not-found' || message.includes('No document to update');
}

export async function createBrandInFirestore(
  uid: string,
  brand: Brand
): Promise<void> {
  const path = `users/${uid}/brands/${brand.id}`;
  try {
    const ref = doc(db, 'users', uid, 'brands', brand.id);
    await setDoc(ref, buildBrandFirestorePayload(brand, uid, true));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveBrandToFirestore(
  uid: string,
  brand: Brand
): Promise<void> {
  const path = `users/${uid}/brands/${brand.id}`;
  const ref = doc(db, 'users', uid, 'brands', brand.id);
  try {
    const payload = buildBrandFirestorePayload(brand, uid, false);
    delete payload.id;
    delete payload.ownerId;
    await updateDoc(ref, payload);
  } catch (error) {
    if (isNotFoundError(error)) {
      try {
        await setDoc(ref, buildBrandFirestorePayload(brand, uid, true));
        return;
      } catch (createErr) {
        handleFirestoreError(createErr, OperationType.CREATE, path);
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBrandAndPostsInFirestore(
  uid: string,
  brandId: string,
  postIds: string[]
): Promise<void> {
  const path = `users/${uid}/brands/${brandId}`;
  try {
    await commitInChunks(postIds, (batch, postId) => {
      batch.delete(doc(db, 'users', uid, 'posts', postId));
    });
    await deleteDoc(doc(db, 'users', uid, 'brands', brandId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createPostInFirestore(
  uid: string,
  post: ContentPost
): Promise<void> {
  const path = `users/${uid}/posts/${post.id}`;
  try {
    const ref = doc(db, 'users', uid, 'posts', post.id);
    await setDoc(ref, buildPostFirestorePayload(post, uid, true));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePostInFirestore(
  uid: string,
  post: ContentPost
): Promise<void> {
  const path = `users/${uid}/posts/${post.id}`;
  const ref = doc(db, 'users', uid, 'posts', post.id);
  try {
    const payload = buildPostFirestorePayload(post, uid, false);
    delete payload.id;
    delete payload.ownerId;
    await updateDoc(ref, payload);
  } catch (error) {
    if (isNotFoundError(error)) {
      try {
        await setDoc(ref, buildPostFirestorePayload(post, uid, true));
        return;
      } catch (createErr) {
        handleFirestoreError(createErr, OperationType.CREATE, path);
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePostInFirestore(
  uid: string,
  postId: string
): Promise<void> {
  const path = `users/${uid}/posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deletePostsBatchInFirestore(
  uid: string,
  postIds: string[]
): Promise<void> {
  if (postIds.length === 0) return;
  const path = `users/${uid}/posts`;
  try {
    await commitInChunks(postIds, (batch, postId) => {
      batch.delete(doc(db, 'users', uid, 'posts', postId));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reorderFeedInFirestore(
  uid: string,
  orderedIds: string[]
): Promise<void> {
  const path = `users/${uid}/posts`;
  try {
    await commitInChunks(orderedIds, (batch, postId, idx) => {
      const ref = doc(db, 'users', uid, 'posts', postId);
      batch.update(ref, {
        feedOrder: idx,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resetDemoInFirestore(
  uid: string,
  existingBrandIds: string[],
  existingPostIds: string[]
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const existingBrandSet = new Set(existingBrandIds);
    const defaultBrandIds = new Set(BRANDS.map((b) => b.id));

    const brandBatch = writeBatch(db);
    existingBrandIds.forEach((brandId) => {
      if (!defaultBrandIds.has(brandId)) {
        brandBatch.delete(doc(db, 'users', uid, 'brands', brandId));
      }
    });
    BRANDS.forEach((b) => {
      const ref = doc(db, 'users', uid, 'brands', b.id);
      if (existingBrandSet.has(b.id)) {
        const payload = buildBrandFirestorePayload(b, uid, false);
        delete payload.id;
        delete payload.ownerId;
        brandBatch.update(ref, payload);
      } else {
        brandBatch.set(ref, buildBrandFirestorePayload(b, uid, true));
      }
    });
    await brandBatch.commit();

    await commitInChunks(existingPostIds, (batch, postId) => {
      batch.delete(doc(db, 'users', uid, 'posts', postId));
    });
    await commitInChunks(INITIAL_POSTS, (batch, p) => {
      const ref = doc(db, 'users', uid, 'posts', p.id);
      batch.set(ref, buildPostFirestorePayload(p, uid, true));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
