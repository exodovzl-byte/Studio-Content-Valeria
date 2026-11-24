/**
 * Phase 0 Security TDD Test Specification for OmniContent Studio Firestore Rules.
 * Verifies all 12 "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actor: 'regularUser' | 'expiredUser' | 'usedTrialUser' | 'unverifiedAdminSpoof';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Approved Trial on Create',
    actor: 'regularUser',
    operation: 'create',
    path: 'accounts/user_a',
    payload: {
      uid: 'user_a',
      email: 'usera@example.com',
      displayName: 'User A',
      businessName: 'Studio A',
      accessStatus: 'trial_active',
      requestedPlan: 'trial',
      hasUsedTrial: false,
      trialDaysGranted: 30,
      accessExpiresAt: '2027-01-01T00:00:00Z',
      paymentReference: '',
      userNote: '',
      adminNote: '',
      requestedAt: 'SERVER_TIME',
      approvedAt: 'SERVER_TIME',
      createdAt: 'SERVER_TIME',
      updatedAt: 'SERVER_TIME',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Approved Subscription on Update',
    actor: 'regularUser',
    operation: 'update',
    path: 'accounts/user_a',
    payload: { accessStatus: 'subscription_active' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Expiration Date Tampering by Owner',
    actor: 'regularUser',
    operation: 'update',
    path: 'accounts/user_a',
    payload: { accessExpiresAt: '2030-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Repeat Trial Abuse after hasUsedTrial=true',
    actor: 'usedTrialUser',
    operation: 'update',
    path: 'accounts/user_used',
    payload: { accessStatus: 'pending_trial', requestedPlan: 'trial' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Ghost Field Injection',
    actor: 'regularUser',
    operation: 'update',
    path: 'accounts/user_a',
    payload: { accessStatus: 'pending_subscription', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Expired Account Workspace Write',
    actor: 'expiredUser',
    operation: 'create',
    path: 'users/user_exp/posts/post_1',
    payload: { id: 'post_1', ownerId: 'user_exp', brandId: 'exodo', title: 'Bypass' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Pending Account Workspace Create',
    actor: 'regularUser',
    operation: 'create',
    path: 'users/user_a',
    payload: { ownerId: 'user_a', displayName: 'User A' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-User PII Account List',
    actor: 'regularUser',
    operation: 'list',
    path: 'accounts',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Non-Admin Pricing Config Tampering',
    actor: 'regularUser',
    operation: 'update',
    path: 'appConfig/access',
    payload: { subscriptionPrice: '$0 / mes' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unverified Admin Email Spoofing',
    actor: 'unverifiedAdminSpoof',
    operation: 'list',
    path: 'accounts',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Admin Directory Self-Escalation',
    actor: 'regularUser',
    operation: 'create',
    path: 'admins/user_a',
    payload: { uid: 'user_a', email: 'usera@example.com' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Oversized Document ID Poisoning',
    actor: 'regularUser',
    operation: 'create',
    path: `users/user_a/posts/${'a'.repeat(160)}`,
    payload: { id: 'a'.repeat(160), ownerId: 'user_a', brandId: 'exodo', title: 'Spam' },
    expected: 'PERMISSION_DENIED',
  },
];
