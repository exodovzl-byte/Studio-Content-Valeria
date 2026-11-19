# Security Specification — OmniContent Studio (`studio-content-83854`)

## 1. Data Invariants & Relationship Mapping
- **Master Source of Truth**: `/users/{userId}` is the root workspace owned exclusively by the authenticated, email-verified user where `userId == request.auth.uid`.
- **Relational Subcollections**:
  - `/users/{userId}/brands/{brandId}`: Social brand profiles belong strictly to `/users/{userId}`. Cannot be created unless the parent `/users/{userId}` workspace exists.
  - `/users/{userId}/posts/{postId}`: Editorial content pieces belong strictly to `/users/{userId}`. Cannot be created unless the parent `/users/{userId}` workspace exists.
- **Zero PII Exposure**: No email, phone number, or private PII is stored inside readable shared collections; every collection is strictly owner-isolated (`userId == request.auth.uid` and `resource.data.ownerId == request.auth.uid`).
- **Temporal & Ownership Immutability**: `ownerId` and `createdAt` are immutable after creation; `createdAt == request.time` on create and `updatedAt == request.time` on create/update.
- **Strict Volumetric Bounds**: Every string and array has explicit upper bounds to prevent Denial-of-Wallet and document bloat.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Attempting to read `/users/u1/posts/p1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Attempting to create a post with `auth.token.email_verified == false` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Read (`get`)**: User `u2` reading `/users/u1/posts/p1` -> `PERMISSION_DENIED`.
4. **Cross-Tenant List (`list`)**: User `u2` listing `/users/u1/posts` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Create**: User `u1` creating `/users/u1/posts/p1` with `ownerId: "u2"` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection on Create**: Creating a brand with an unlisted ghost field `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection on Update**: Updating a post with an unlisted ghost field `role: "admin"` -> `PERMISSION_DENIED`.
8. **Immutable Field Tampering**: Updating `ownerId` or `createdAt` on an existing post -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating/updating a post with a backdated `createdAt` or `updatedAt != request.time` -> `PERMISSION_DENIED`.
10. **ID Poisoning Attack**: Writing to a document ID containing invalid characters or length > 128 -> `PERMISSION_DENIED`.
11. **Array Exhaustion Attack**: Writing a post with `checklist.size() > 30` or `highlights.size() > 12` -> `PERMISSION_DENIED`.
12. **Orphaned Subcollection Write**: Creating `/users/u1/posts/p1` before parent `/users/u1` workspace document exists -> `PERMISSION_DENIED`.
