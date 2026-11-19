import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  const safeMedia = Array.isArray(post.mediaItems)
    ? post.mediaItems.slice(0, 10).map((m, idx) => ({
        id:
          typeof m.id === 'string' && ID_PATTERN.test(m.id)
            ? m.id.slice(0, 64)
            : `m-${idx}`,
        name: sanitizeString(m.name, 120, 'archivo'),
        type: m.type === 'video' ? 'video' : 'image',
        // Avoid saving ephemeral blob URLs or oversized strings to Firestore
        url:
          typeof m.url === 'string' &&
          !m.url.startsWith('blob:') &&
          m.url.length <= 180000
            ? m.url
            : '',
      }))
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

  const safeCover =
    typeof post.coverUrl === 'string' &&
    !post.coverUrl.startsWith('blob:') &&
    post.coverUrl.length <= 250000
      ? post.coverUrl
      : '';

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

export async function ensureWorkspaceAndSeed(
  uid: string,
  displayName: string
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

  const brandsPath = `users/${uid}/brands`;
  try {
    const brandsQuery = query(
      collection(db, 'users', uid, 'brands'),
      where('ownerId', '==', uid)
    );
    const brandSnap = await getDocs(brandsQuery);
    if (brandSnap.empty) {
      const batch = writeBatch(db);
      BRANDS.forEach((b) => {
        const ref = doc(db, 'users', uid, 'brands', b.id);
        batch.set(ref, buildBrandFirestorePayload(b, uid, true));
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, brandsPath);
  }

  // Only seed demo posts when the user workspace is created for the first time
  if (!isNewWorkspace) return;

  const postsPath = `users/${uid}/posts`;
  try {
    const postsQuery = query(
      collection(db, 'users', uid, 'posts'),
      where('ownerId', '==', uid)
    );
    const postSnap = await getDocs(postsQuery);
    if (postSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_POSTS.forEach((p) => {
        const ref = doc(db, 'users', uid, 'posts', p.id);
        batch.set(ref, buildPostFirestorePayload(p, uid, true));
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, postsPath);
  }
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
      const map = new Map<string, Brand>();
      snapshot.docs.forEach((d) => {
        const raw = d.data() as Brand;
        map.set(d.id, { ...raw, id: d.id as BrandId });
      });
      const ordered = BRANDS.map((def) =>
        map.has(def.id) ? { ...def, ...map.get(def.id)! } : def
      );
      onData(ordered);
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

export async function saveBrandToFirestore(
  uid: string,
  brand: Brand
): Promise<void> {
  const path = `users/${uid}/brands/${brand.id}`;
  try {
    const ref = doc(db, 'users', uid, 'brands', brand.id);
    const payload = buildBrandFirestorePayload(brand, uid, false);
    delete payload.id;
    delete payload.ownerId;
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
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
  try {
    const ref = doc(db, 'users', uid, 'posts', post.id);
    const payload = buildPostFirestorePayload(post, uid, false);
    delete payload.id;
    delete payload.ownerId;
    await updateDoc(ref, payload);
  } catch (error) {
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
    const batch = writeBatch(db);
    postIds.forEach((postId) => {
      batch.delete(doc(db, 'users', uid, 'posts', postId));
    });
    await batch.commit();
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
    const batch = writeBatch(db);
    orderedIds.forEach((postId, idx) => {
      const ref = doc(db, 'users', uid, 'posts', postId);
      batch.update(ref, {
        feedOrder: idx,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resetDemoInFirestore(
  uid: string,
  existingPostIds: string[]
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const batch = writeBatch(db);
    existingPostIds.forEach((postId) => {
      batch.delete(doc(db, 'users', uid, 'posts', postId));
    });
    BRANDS.forEach((b) => {
      const ref = doc(db, 'users', uid, 'brands', b.id);
      const payload = buildBrandFirestorePayload(b, uid, false);
      delete payload.id;
      delete payload.ownerId;
      batch.update(ref, payload);
    });
    INITIAL_POSTS.forEach((p) => {
      const ref = doc(db, 'users', uid, 'posts', p.id);
      batch.set(ref, buildPostFirestorePayload(p, uid, true));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
