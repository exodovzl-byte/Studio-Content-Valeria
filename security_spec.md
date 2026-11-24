# Security Specification — OmniContent Studio (Access Control & Admin RBAC)

## 1. Data Invariants

1. **Zero Self-Approval**: A regular user can only create or update their own `/accounts/{userId}` document into `unassigned`, `pending_trial`, or `pending_subscription`. Only an administrator (`isAdmin()`) may set `accessStatus` to `trial_active`, `subscription_active`, `rejected`, or `suspended`, or modify `accessExpiresAt`, `hasUsedTrial`, `trialDaysGranted`, `approvedAt`, or `adminNote`.
2. **One-Time Trial Guard**: Once `hasUsedTrial == true`, a user cannot submit `accessStatus: 'pending_trial'` again; they may only request `pending_subscription`.
3. **Server-Enforced Expiration Gate**: Workspace reads (`get`) and writes (`create`, `update`, `delete`) on `/users/{userId}`, `/users/{userId}/brands/{brandId}`, and `/users/{userId}/posts/{postId}` require `hasActiveAccess(userId)`, which checks either `isAdmin()` or that `/accounts/{userId}` has `accessStatus in ['trial_active', 'subscription_active']` AND `accessExpiresAt > request.time`.
4. **Strict PII Isolation**: `/accounts/{userId}` contains `email`; `get` is strictly restricted to `isOwner(userId) || isAdmin()`, and `list` is strictly restricted to the verified bootstrap administrator.
5. **Admin-Only Configuration**: `/appConfig/access` is readable by verified users (for live lobby display) and writable exclusively by `isAdmin()`.
6. **Verified Identity & Immutability**: All authenticated operations require `request.auth.token.email_verified == true`. `uid`, `email`, `ownerId`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
7. **Referential Integrity**: Posts must reference an existing brand via `existsAfter` and an existing parent workspace via `exists`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)

1. **Self-Approved Trial on Create**: User creates `/accounts/{uid}` with `accessStatus: "trial_active"` and future `accessExpiresAt`.
2. **Self-Approved Subscription on Update**: User updates `/accounts/{uid}` setting `accessStatus: "subscription_active"`.
3. **Expiration Date Tampering**: Trial user updates `/accounts/{uid}` extending their own `accessExpiresAt`.
4. **Repeat Trial Abuse**: User with `hasUsedTrial: true` updates `/accounts/{uid}` to `accessStatus: "pending_trial"`.
5. **Shadow Ghost Field Injection**: User updates `/accounts/{uid}` including an extra `isAdmin: true` key.
6. **Expired Account Workspace Write**: User whose `accessExpiresAt < request.time` attempts to create a post in `/users/{uid}/posts/{postId}`.
7. **Pending Account Workspace Write**: User with `accessStatus: "pending_trial"` attempts to create `/users/{uid}`.
8. **Cross-User PII Read**: User A attempts `get` on `/accounts/{userB}` or `list` on `/accounts`.
9. **Non-Admin Pricing Tampering**: Non-admin user attempts `update` on `/appConfig/access` setting `subscriptionPrice: "$0"`.
10. **Unverified Admin Email Spoof**: Request with `email: "exodovzl@gmail.com"` and `email_verified: false` attempts `list` on `/accounts`.
11. **Admin Directory Escalation**: Regular user attempts to create `/admins/{uid}`.
12. **Oversized ID / Payload Poisoning**: User creates a post with a 200-char ID or 5000-char caption exceeding schema bounds.
