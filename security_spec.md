# Security Specification — OmniContent Studio (Access Control, Admin PIN & Legacy Discovery)

## 1. Data Invariants

1. **Zero Self-Approval**: A regular user can only create or update their own `/accounts/{userId}` document into `unassigned`, `pending_trial`, or `pending_subscription`. Only an administrator (`isAdmin()`) may set `accessStatus` to `trial_active`, `subscription_active`, `permanent_active`, `rejected`, or `suspended`, modify `accessExpiresAt`, `hasUsedTrial`, `trialDaysGranted`, `approvedAt`, or `adminNote`, or delete user accounts.
2. **One-Time Trial Guard**: Once `hasUsedTrial == true`, a user cannot submit `accessStatus: 'pending_trial'` again; they may only request `pending_subscription`.
3. **Server-Enforced Expiration Gate**: Workspace reads (`get`) and writes (`create`, `update`, `delete`) on `/users/{userId}`, `/users/{userId}/brands/{brandId}`, and `/users/{userId}/posts/{postId}` require `hasActiveAccess(userId)`, which checks either `isAdmin()`, or `/accounts/{userId}` has `accessStatus == 'permanent_active'`, or `accessStatus in ['trial_active', 'subscription_active']` AND `accessExpiresAt > request.time`.
4. **Strict PII Isolation**: `/accounts/{userId}` contains `email`; `get` is strictly restricted to `isOwner(userId) || isAdmin()`, and `list` is strictly restricted to the verified bootstrap administrator.
5. **Admin-Only Configuration & PIN Security**:
   - `/appConfig/access` (including Binance and Pago Móvil payment details) is readable (`get`) for live lobby display and writable exclusively by `isAdmin()`.
   - `/adminSecurity/pin` stores ONLY the salted SHA-256 hash (`pinHash`, `pinSalt`, `pinLength` in `[4, 6]`, `updatedAt`) and is readable/writable **exclusively** by `isAdmin()` (never readable by regular or unauthenticated users).
6. **Bounded Payment Proof Uploads**: A user may attach `paymentMethod` (`none`, `binance`, `pago_movil`, `other`) and a compressed `paymentProofUrl` (`<= 250000` chars) ONLY on their own `/accounts/{userId}` document during a subscription or early-renewal request, without ever elevating their own `accessStatus` or `accessExpiresAt`. Payment proofs remain strictly private (`isOwner(userId) || isAdmin()`).
7. **Legacy Account Discovery & Verified Email Sync**: `/users/{userId}` (which contains no PII) allows `get` and `list` by `isBootstrapAdmin()` so previously registered workspaces appear in the Admin Dashboard. If an admin pre-registers a legacy account with placeholder email `pendiente@sincronizar.app`, the verified owner may sync only their own `request.auth.token.email` and `displayName` without touching any access status or expiration fields.
8. **Verified Identity & Immutability**: All authenticated operations require `request.auth.token.email_verified == true`. `uid`, `ownerId`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
9. **Referential Integrity**: Posts must reference an existing brand via `existsAfter` and an existing parent workspace via `exists`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)

1. **Self-Approved Trial on Create**: User creates `/accounts/{uid}` with `accessStatus: "trial_active"` and future `accessExpiresAt`.
2. **Self-Approved Subscription on Update**: User updates `/accounts/{uid}` setting `accessStatus: "subscription_active"`.
3. **Expiration Date Tampering**: Trial user updates `/accounts/{uid}` extending their own `accessExpiresAt`.
4. **Repeat Trial Abuse**: User with `hasUsedTrial: true` updates `/accounts/{uid}` to `accessStatus: "pending_trial"`.
5. **Shadow Ghost Field Injection**: User updates `/accounts/{uid}` including an extra `isAdmin: true` key.
6. **Expired Account Workspace Write**: User whose `accessExpiresAt < request.time` attempts to create a post in `/users/{uid}/posts/{postId}`.
7. **Pending Account Workspace Write**: User with `accessStatus: "pending_trial"` attempts to create `/users/{uid}`.
8. **Cross-User PII Read**: User A attempts `get` on `/accounts/{userB}` or `list` on `/accounts` or `/users`.
9. **Non-Admin Pricing & PIN Tampering**: Non-admin user attempts `get` or `update` on `/adminSecurity/pin` or `update` on `/appConfig/access`.
10. **Unverified Admin Email Spoof**: Request with `email: "exodovzl@gmail.com"` and `email_verified: false` attempts `list` on `/accounts`, `/users`, or `get` on `/adminSecurity/pin`.
11. **Admin Directory Self-Escalation**: Regular user attempts to create `/admins/{uid}`.
12. **Oversized ID / Invalid PIN Length Poisoning**: User creates a post with a 200-char ID or attempts to write `/adminSecurity/pin` with `pinLength: 8` or non-hex hash.
