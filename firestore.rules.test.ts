/**
 * Security rules test suite covering the Dirty Dozen adversarial payloads
 * for OmniContent Studio (/users/{userId}, /brands/{brandId}, /posts/{postId}).
 *
 * Run against Firebase Local Emulator Suite when available:
 * firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Read',
    operation: 'get',
    path: '/users/user-1/posts/post-1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/users/user-1/posts/post-1',
    auth: { uid: 'user-1', email_verified: false },
    payload: { id: 'post-1', ownerId: 'user-1', title: 'Unverified' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-Tenant Get',
    operation: 'get',
    path: '/users/user-1/posts/post-1',
    auth: { uid: 'user-2', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-Tenant List',
    operation: 'list',
    path: '/users/user-1/posts',
    auth: { uid: 'user-2', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Create',
    operation: 'create',
    path: '/users/user-1/posts/post-99',
    auth: { uid: 'user-1', email_verified: true },
    payload: { id: 'post-99', ownerId: 'user-2', title: 'Spoofed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection on Brand Create',
    operation: 'create',
    path: '/users/user-1/brands/exodo',
    auth: { uid: 'user-1', email_verified: true },
    payload: { id: 'exodo', ownerId: 'user-1', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Shadow Field Injection on Post Update',
    operation: 'update',
    path: '/users/user-1/posts/post-1',
    auth: { uid: 'user-1', email_verified: true },
    payload: { role: 'superadmin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable ownerId Tampering on Update',
    operation: 'update',
    path: '/users/user-1/posts/post-1',
    auth: { uid: 'user-1', email_verified: true },
    payload: { ownerId: 'user-2' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    operation: 'update',
    path: '/users/user-1/posts/post-1',
    auth: { uid: 'user-1', email_verified: true },
    payload: { updatedAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning with Invalid Characters',
    operation: 'create',
    path: '/users/user-1/posts/bad$id/..',
    auth: { uid: 'user-1', email_verified: true },
    payload: { id: 'bad$id', ownerId: 'user-1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Array Exhaustion (> 30 checklist items)',
    operation: 'update',
    path: '/users/user-1/posts/post-1',
    auth: { uid: 'user-1', email_verified: true },
    payload: {
      checklist: Array.from({ length: 35 }, (_, i) => ({
        id: `c-${i}`,
        text: 'spam',
        done: false,
      })),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned Subcollection Write without Parent Workspace',
    operation: 'create',
    path: '/users/user-no-workspace/posts/post-1',
    auth: { uid: 'user-no-workspace', email_verified: true },
    payload: { id: 'post-1', ownerId: 'user-no-workspace' },
    expected: 'PERMISSION_DENIED',
  },
];
