import {
  Timestamp,
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  AccessConfig,
  AccessStatus,
  AdminPinConfig,
  BOOTSTRAP_ADMIN_EMAIL,
  DEFAULT_ACCESS_CONFIG,
  LEGACY_PLACEHOLDER_EMAIL,
  PaymentMethod,
  UserAccount,
  isAccountAccessActive,
  normalizeSafeHttpUrl,
} from '../types/access';

function sanitizeString(
  value: unknown,
  maxLength: number,
  fallback = ''
): string {
  const str = typeof value === 'string' ? value : fallback;
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

function sanitizeNonEmpty(
  value: unknown,
  maxLength: number,
  fallback: string
): string {
  const cleaned = sanitizeString(value, maxLength, fallback).trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function timestampToMs(value: unknown): number | null {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

// ==================== ADMIN PIN CRYPTO HELPERS (SHA-256 + SALT) ====================

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Pure JS SHA-256 fallback in case SubtleCrypto is unavailable on non-HTTPS local preview.
 */
function sha256FallbackHex(message: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLen = data.length * 8;
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
      const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((n) => n.toString(16).padStart(8, '0')).join('');
}

function generatePinSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(bytes);
}

export async function hashAdminPin(pin: string, salt: string): Promise<string> {
  const input = `${salt}:omnicontent-admin-pin:${pin}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return bytesToHex(new Uint8Array(digest));
  }
  return sha256FallbackHex(input);
}

export async function verifyAdminPin(
  pin: string,
  config: AdminPinConfig
): Promise<boolean> {
  if (!/^\d{4}$|^\d{6}$/.test(pin)) return false;
  if (pin.length !== config.pinLength) return false;
  const computed = await hashAdminPin(pin, config.pinSalt);
  if (computed.length !== config.pinHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ config.pinHash.charCodeAt(i);
  }
  return diff === 0;
}

export function subscribeToAdminPinConfig(
  onData: (config: AdminPinConfig | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'adminSecurity/pin';
  return onSnapshot(
    doc(db, 'adminSecurity', 'pin'),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const raw = snap.data() as Record<string, unknown>;
      const pinLength = raw.pinLength === 6 ? 6 : 4;
      const pinHash = typeof raw.pinHash === 'string' ? raw.pinHash : '';
      const pinSalt = typeof raw.pinSalt === 'string' ? raw.pinSalt : '';
      if (pinHash.length === 64 && pinSalt.length >= 16) {
        onData({
          pinHash,
          pinSalt,
          pinLength,
          updatedAtMs: timestampToMs(raw.updatedAt),
        });
      } else {
        onData(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function saveAdminPin(pin: string): Promise<AdminPinConfig> {
  if (!/^\d{4}$|^\d{6}$/.test(pin)) {
    throw new Error('El PIN debe tener exactamente 4 o 6 dígitos numéricos.');
  }
  const path = 'adminSecurity/pin';
  const ref = doc(db, 'adminSecurity', 'pin');
  const pinSalt = generatePinSalt();
  const pinHash = await hashAdminPin(pin, pinSalt);
  const pinLength: 4 | 6 = pin.length === 6 ? 6 : 4;

  const payload = {
    pinHash,
    pinSalt,
    pinLength,
    updatedAt: serverTimestamp(),
  };

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
    return {
      pinHash,
      pinSalt,
      pinLength,
      updatedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==================== ACCESS CONFIG & USER ACCOUNTS ====================

function mapAccessConfig(raw: Record<string, unknown> | undefined): AccessConfig {
  if (!raw) return DEFAULT_ACCESS_CONFIG;
  const features = Array.isArray(raw.subscriptionFeatures)
    ? raw.subscriptionFeatures
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 10)
    : DEFAULT_ACCESS_CONFIG.subscriptionFeatures;

  return {
    lobbyTitle: sanitizeNonEmpty(
      raw.lobbyTitle,
      100,
      DEFAULT_ACCESS_CONFIG.lobbyTitle
    ),
    lobbySubtitle: sanitizeString(
      raw.lobbySubtitle,
      300,
      DEFAULT_ACCESS_CONFIG.lobbySubtitle
    ),
    trialEnabled:
      typeof raw.trialEnabled === 'boolean'
        ? raw.trialEnabled
        : DEFAULT_ACCESS_CONFIG.trialEnabled,
    trialDays: clampNumber(
      raw.trialDays,
      1,
      365,
      DEFAULT_ACCESS_CONFIG.trialDays
    ),
    trialTitle: sanitizeNonEmpty(
      raw.trialTitle,
      80,
      DEFAULT_ACCESS_CONFIG.trialTitle
    ),
    trialDescription: sanitizeString(
      raw.trialDescription,
      300,
      DEFAULT_ACCESS_CONFIG.trialDescription
    ),
    subscriptionTitle: sanitizeNonEmpty(
      raw.subscriptionTitle,
      80,
      DEFAULT_ACCESS_CONFIG.subscriptionTitle
    ),
    subscriptionPrice: sanitizeNonEmpty(
      raw.subscriptionPrice,
      40,
      DEFAULT_ACCESS_CONFIG.subscriptionPrice
    ),
    subscriptionCycleDays: clampNumber(
      raw.subscriptionCycleDays,
      1,
      365,
      DEFAULT_ACCESS_CONFIG.subscriptionCycleDays
    ),
    subscriptionDescription: sanitizeString(
      raw.subscriptionDescription,
      300,
      DEFAULT_ACCESS_CONFIG.subscriptionDescription
    ),
    subscriptionFeatures: features,
    paymentInstructions: sanitizeString(
      raw.paymentInstructions,
      1000,
      DEFAULT_ACCESS_CONFIG.paymentInstructions
    ),
    supportContact: sanitizeString(
      raw.supportContact,
      160,
      DEFAULT_ACCESS_CONFIG.supportContact
    ),
    binanceEnabled:
      typeof raw.binanceEnabled === 'boolean'
        ? raw.binanceEnabled
        : DEFAULT_ACCESS_CONFIG.binanceEnabled,
    binancePayId: sanitizeString(
      raw.binancePayId,
      100,
      DEFAULT_ACCESS_CONFIG.binancePayId
    ),
    binanceEmail: sanitizeString(
      raw.binanceEmail,
      180,
      DEFAULT_ACCESS_CONFIG.binanceEmail
    ),
    binanceHolder: sanitizeString(
      raw.binanceHolder,
      120,
      DEFAULT_ACCESS_CONFIG.binanceHolder
    ),
    binanceWalletAddress: sanitizeString(
      raw.binanceWalletAddress,
      200,
      DEFAULT_ACCESS_CONFIG.binanceWalletAddress
    ),
    binancePaymentLink: normalizeSafeHttpUrl(
      sanitizeString(
        raw.binancePaymentLink,
        500,
        DEFAULT_ACCESS_CONFIG.binancePaymentLink
      )
    ),
    binanceNote: sanitizeString(
      raw.binanceNote,
      300,
      DEFAULT_ACCESS_CONFIG.binanceNote
    ),
    pagoMovilEnabled:
      typeof raw.pagoMovilEnabled === 'boolean'
        ? raw.pagoMovilEnabled
        : DEFAULT_ACCESS_CONFIG.pagoMovilEnabled,
    pagoMovilBank: sanitizeString(
      raw.pagoMovilBank,
      100,
      DEFAULT_ACCESS_CONFIG.pagoMovilBank
    ),
    pagoMovilPhone: sanitizeString(
      raw.pagoMovilPhone,
      40,
      DEFAULT_ACCESS_CONFIG.pagoMovilPhone
    ),
    pagoMovilId: sanitizeString(
      raw.pagoMovilId,
      40,
      DEFAULT_ACCESS_CONFIG.pagoMovilId
    ),
    pagoMovilHolder: sanitizeString(
      raw.pagoMovilHolder,
      120,
      DEFAULT_ACCESS_CONFIG.pagoMovilHolder
    ),
    pagoMovilNote: sanitizeString(
      raw.pagoMovilNote,
      300,
      DEFAULT_ACCESS_CONFIG.pagoMovilNote
    ),
    updatedAtMs: timestampToMs(raw.updatedAt),
  };
}

function sanitizePaymentMethod(value: unknown): PaymentMethod {
  if (
    value === 'binance' ||
    value === 'pago_movil' ||
    value === 'other' ||
    value === 'none'
  ) {
    return value;
  }
  return 'none';
}

function mapUserAccount(
  id: string,
  raw: Record<string, unknown>
): UserAccount {
  return {
    uid: typeof raw.uid === 'string' ? raw.uid : id,
    email: typeof raw.email === 'string' ? raw.email : '',
    displayName: typeof raw.displayName === 'string' ? raw.displayName : '',
    businessName: typeof raw.businessName === 'string' ? raw.businessName : '',
    accessStatus:
      typeof raw.accessStatus === 'string'
        ? (raw.accessStatus as AccessStatus)
        : 'unassigned',
    requestedPlan:
      raw.requestedPlan === 'trial' || raw.requestedPlan === 'subscription'
        ? raw.requestedPlan
        : 'none',
    hasUsedTrial: Boolean(raw.hasUsedTrial),
    trialDaysGranted: clampNumber(raw.trialDaysGranted, 0, 365, 0),
    accessExpiresAtMs: timestampToMs(raw.accessExpiresAt),
    paymentReference:
      typeof raw.paymentReference === 'string' ? raw.paymentReference : '',
    paymentMethod: sanitizePaymentMethod(raw.paymentMethod),
    paymentProofUrl:
      typeof raw.paymentProofUrl === 'string' ? raw.paymentProofUrl : '',
    userNote: typeof raw.userNote === 'string' ? raw.userNote : '',
    adminNote: typeof raw.adminNote === 'string' ? raw.adminNote : '',
    requestedAtMs: timestampToMs(raw.requestedAt),
    approvedAtMs: timestampToMs(raw.approvedAt),
    createdAtMs: timestampToMs(raw.createdAt),
    updatedAtMs: timestampToMs(raw.updatedAt),
  };
}

export async function checkIsAdmin(
  uid: string,
  email: string | null | undefined,
  emailVerified: boolean
): Promise<boolean> {
  if (!emailVerified) return false;
  if (email && email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export function subscribeToAccessConfig(
  onData: (config: AccessConfig) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'appConfig/access';
  return onSnapshot(
    doc(db, 'appConfig', 'access'),
    (snap) => {
      if (snap.exists()) {
        onData(mapAccessConfig(snap.data() as Record<string, unknown>));
      } else {
        onData(DEFAULT_ACCESS_CONFIG);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function saveAccessConfig(config: AccessConfig): Promise<void> {
  const path = 'appConfig/access';
  const ref = doc(db, 'appConfig', 'access');
  const cleanFeatures = (config.subscriptionFeatures || [])
    .map((f) => sanitizeString(f, 120).trim())
    .filter(Boolean)
    .slice(0, 10);

  const payload = {
    lobbyTitle: sanitizeNonEmpty(
      config.lobbyTitle,
      100,
      DEFAULT_ACCESS_CONFIG.lobbyTitle
    ),
    lobbySubtitle: sanitizeString(config.lobbySubtitle, 300),
    trialEnabled: Boolean(config.trialEnabled),
    trialDays: clampNumber(config.trialDays, 1, 365, 30),
    trialTitle: sanitizeNonEmpty(config.trialTitle, 80, 'Modo Prueba'),
    trialDescription: sanitizeString(config.trialDescription, 300),
    subscriptionTitle: sanitizeNonEmpty(
      config.subscriptionTitle,
      80,
      'Suscripción Mensual'
    ),
    subscriptionPrice: sanitizeNonEmpty(
      config.subscriptionPrice,
      40,
      '$15 / mes'
    ),
    subscriptionCycleDays: clampNumber(config.subscriptionCycleDays, 1, 365, 30),
    subscriptionDescription: sanitizeString(
      config.subscriptionDescription,
      300
    ),
    subscriptionFeatures: cleanFeatures,
    paymentInstructions: sanitizeString(config.paymentInstructions, 1000),
    supportContact: sanitizeString(config.supportContact, 160),
    binanceEnabled: Boolean(config.binanceEnabled),
    binancePayId: sanitizeString(config.binancePayId, 100).trim(),
    binanceEmail: sanitizeString(config.binanceEmail, 180).trim(),
    binanceHolder: sanitizeString(config.binanceHolder, 120).trim(),
    binanceWalletAddress: sanitizeString(config.binanceWalletAddress, 200).trim(),
    binancePaymentLink: normalizeSafeHttpUrl(
      sanitizeString(config.binancePaymentLink, 500)
    ),
    binanceNote: sanitizeString(config.binanceNote, 300).trim(),
    pagoMovilEnabled: Boolean(config.pagoMovilEnabled),
    pagoMovilBank: sanitizeString(config.pagoMovilBank, 100).trim(),
    pagoMovilPhone: sanitizeString(config.pagoMovilPhone, 40).trim(),
    pagoMovilId: sanitizeString(config.pagoMovilId, 40).trim(),
    pagoMovilHolder: sanitizeString(config.pagoMovilHolder, 120).trim(),
    pagoMovilNote: sanitizeString(config.pagoMovilNote, 300).trim(),
    updatedAt: serverTimestamp(),
  };

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function ensureUserAccount(
  uid: string,
  email: string,
  displayName: string
): Promise<UserAccount> {
  const path = `accounts/${uid}`;
  const ref = doc(db, 'accounts', uid);
  const safeEmail = sanitizeNonEmpty(email, 180, 'usuario@correo.com');
  const safeName = sanitizeString(displayName, 120);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const mapped = mapUserAccount(
        snap.id,
        snap.data() as Record<string, unknown>
      );
      // If admin pre-registered this legacy workspace before the user returned, sync their real Google email
      if (
        mapped.email === LEGACY_PLACEHOLDER_EMAIL &&
        safeEmail &&
        safeEmail !== LEGACY_PLACEHOLDER_EMAIL
      ) {
        try {
          await updateDoc(ref, {
            email: safeEmail,
            displayName: safeName || mapped.displayName,
            updatedAt: serverTimestamp(),
          });
          return {
            ...mapped,
            email: safeEmail,
            displayName: safeName || mapped.displayName,
          };
        } catch {
          // Return existing mapped record if sync fails
        }
      }
      return mapped;
    }

    await setDoc(ref, {
      uid,
      email: safeEmail,
      displayName: safeName,
      businessName: '',
      accessStatus: 'unassigned',
      requestedPlan: 'none',
      hasUsedTrial: false,
      trialDaysGranted: 0,
      accessExpiresAt: null,
      paymentReference: '',
      paymentMethod: 'none',
      paymentProofUrl: '',
      userNote: '',
      adminNote: '',
      requestedAt: null,
      approvedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const createdSnap = await getDoc(ref);
    if (createdSnap.exists()) {
      return mapUserAccount(
        createdSnap.id,
        createdSnap.data() as Record<string, unknown>
      );
    }

    return {
      uid,
      email: safeEmail,
      displayName: safeName,
      businessName: '',
      accessStatus: 'unassigned',
      requestedPlan: 'none',
      hasUsedTrial: false,
      trialDaysGranted: 0,
      accessExpiresAtMs: null,
      paymentReference: '',
      paymentMethod: 'none',
      paymentProofUrl: '',
      userNote: '',
      adminNote: '',
      requestedAtMs: null,
      approvedAtMs: null,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserAccount(
  uid: string,
  onData: (account: UserAccount | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `accounts/${uid}`;
  return onSnapshot(
    doc(db, 'accounts', uid),
    (snap) => {
      if (snap.exists()) {
        onData(mapUserAccount(snap.id, snap.data() as Record<string, unknown>));
      } else {
        onData(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function refreshUserAccountFromServer(
  uid: string
): Promise<UserAccount | null> {
  const path = `accounts/${uid}`;
  try {
    const snap = await getDocFromServer(doc(db, 'accounts', uid));
    if (!snap.exists()) return null;
    return mapUserAccount(snap.id, snap.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function submitTrialRequest(
  uid: string,
  data: {
    displayName: string;
    businessName: string;
    userNote: string;
  }
): Promise<void> {
  const path = `accounts/${uid}`;
  try {
    await updateDoc(doc(db, 'accounts', uid), {
      displayName: sanitizeString(data.displayName, 120).trim(),
      businessName: sanitizeString(data.businessName, 120).trim(),
      accessStatus: 'pending_trial',
      requestedPlan: 'trial',
      userNote: sanitizeString(data.userNote, 400).trim(),
      requestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submitSubscriptionRequest(
  uid: string,
  currentAccount: UserAccount | null,
  data: {
    displayName: string;
    businessName: string;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    paymentProofUrl: string;
    userNote: string;
  }
): Promise<void> {
  const path = `accounts/${uid}`;
  const isCurrentlyActive = isAccountAccessActive(currentAccount);
  const safeMethod = sanitizePaymentMethod(data.paymentMethod);
  const safeProof = sanitizeString(data.paymentProofUrl, 250000);

  try {
    if (isCurrentlyActive) {
      await updateDoc(doc(db, 'accounts', uid), {
        displayName: sanitizeString(data.displayName, 120).trim(),
        businessName: sanitizeString(data.businessName, 120).trim(),
        requestedPlan: 'subscription',
        paymentMethod: safeMethod,
        paymentReference: sanitizeString(data.paymentReference, 200).trim(),
        paymentProofUrl: safeProof,
        userNote: sanitizeString(data.userNote, 400).trim(),
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'accounts', uid), {
        displayName: sanitizeString(data.displayName, 120).trim(),
        businessName: sanitizeString(data.businessName, 120).trim(),
        accessStatus: 'pending_subscription',
        requestedPlan: 'subscription',
        paymentMethod: safeMethod,
        paymentReference: sanitizeString(data.paymentReference, 200).trim(),
        paymentProofUrl: safeProof,
        userNote: sanitizeString(data.userNote, 400).trim(),
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Subscribes to BOTH /accounts and legacy /users workspaces so the admin
 * immediately sees all previously registered accounts as well as new Lobby accounts.
 */
export function subscribeToAllAccounts(
  adminUid: string,
  adminEmail: string,
  onData: (accounts: UserAccount[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let accountMap = new Map<string, UserAccount>();
  let legacyWorkspaceMap = new Map<
    string,
    { displayName: string; createdAtMs: number | null; updatedAtMs: number | null }
  >();

  const emitMerged = () => {
    const merged: UserAccount[] = [];
    const seen = new Set<string>();

    accountMap.forEach((acc, uid) => {
      seen.add(uid);
      const isAdminAcc =
        uid === adminUid ||
        acc.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      merged.push({
        ...acc,
        isLegacyWorkspace: false,
        isAdminAccount: isAdminAcc,
      });
    });

    legacyWorkspaceMap.forEach((ws, uid) => {
      if (seen.has(uid)) return;
      const isAdminAcc = uid === adminUid;
      merged.push({
        uid,
        email: isAdminAcc
          ? adminEmail || BOOTSTRAP_ADMIN_EMAIL
          : LEGACY_PLACEHOLDER_EMAIL,
        displayName: ws.displayName || (isAdminAcc ? 'Administrador' : 'Usuario registrado'),
        businessName: '',
        accessStatus: 'unassigned',
        requestedPlan: 'none',
        hasUsedTrial: false,
        trialDaysGranted: 0,
        accessExpiresAtMs: null,
        paymentReference: '',
        paymentMethod: 'none',
        paymentProofUrl: '',
        userNote: '',
        adminNote: '',
        requestedAtMs: null,
        approvedAtMs: null,
        createdAtMs: ws.createdAtMs,
        updatedAtMs: ws.updatedAtMs,
        isLegacyWorkspace: !isAdminAcc,
        isAdminAccount: isAdminAcc,
      });
    });

    merged.sort((a, b) => {
      // Admin account at bottom so client accounts come first
      if (Boolean(a.isAdminAccount) !== Boolean(b.isAdminAccount)) {
        return a.isAdminAccount ? 1 : -1;
      }
      const aPending =
        a.accessStatus === 'pending_trial' ||
        a.accessStatus === 'pending_subscription'
          ? 0
          : 1;
      const bPending =
        b.accessStatus === 'pending_trial' ||
        b.accessStatus === 'pending_subscription'
          ? 0
          : 1;
      if (aPending !== bPending) return aPending - bPending;
      return (
        (b.updatedAtMs || b.createdAtMs || 0) -
        (a.updatedAtMs || a.createdAtMs || 0)
      );
    });

    onData(merged);
  };

  const unsubAccounts = onSnapshot(
    collection(db, 'accounts'),
    (snap) => {
      const next = new Map<string, UserAccount>();
      snap.docs.forEach((d) => {
        next.set(d.id, mapUserAccount(d.id, d.data() as Record<string, unknown>));
      });
      accountMap = next;
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'accounts');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );

  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const next = new Map<
        string,
        { displayName: string; createdAtMs: number | null; updatedAtMs: number | null }
      >();
      snap.docs.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        next.set(d.id, {
          displayName: typeof raw.displayName === 'string' ? raw.displayName : '',
          createdAtMs: timestampToMs(raw.createdAt),
          updatedAtMs: timestampToMs(raw.updatedAt),
        });
      });
      legacyWorkspaceMap = next;
      emitMerged();
    },
    (error) => {
      // Non-fatal if secondary listener fails; surface via console
      console.error('Legacy users listener error:', error);
    }
  );

  return () => {
    unsubAccounts();
    unsubUsers();
  };
}

function buildAdminCreatePayload(
  account: UserAccount,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  return {
    uid: account.uid,
    email: sanitizeNonEmpty(
      overrides.email ?? account.email,
      180,
      LEGACY_PLACEHOLDER_EMAIL
    ),
    displayName: sanitizeString(account.displayName, 120),
    businessName: sanitizeString(account.businessName, 120),
    accessStatus: account.accessStatus,
    requestedPlan: account.requestedPlan,
    hasUsedTrial: Boolean(account.hasUsedTrial),
    trialDaysGranted: clampNumber(account.trialDaysGranted, 0, 365, 0),
    accessExpiresAt: account.accessExpiresAtMs
      ? Timestamp.fromMillis(account.accessExpiresAtMs)
      : null,
    paymentReference: sanitizeString(account.paymentReference, 200),
    paymentMethod: sanitizePaymentMethod(account.paymentMethod),
    paymentProofUrl: sanitizeString(account.paymentProofUrl, 250000),
    userNote: sanitizeString(account.userNote, 400),
    adminNote: sanitizeString(account.adminNote, 400),
    requestedAt: account.requestedAtMs
      ? Timestamp.fromMillis(account.requestedAtMs)
      : null,
    approvedAt: account.approvedAtMs
      ? Timestamp.fromMillis(account.approvedAtMs)
      : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

async function upsertAccountAsAdmin(
  account: UserAccount,
  patch: Record<string, unknown>
): Promise<void> {
  const path = `accounts/${account.uid}`;
  const ref = doc(db, 'accounts', account.uid);
  try {
    if (account.isLegacyWorkspace) {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, buildAdminCreatePayload(account, patch));
        return;
      }
    }
    await updateDoc(ref, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminApproveTrial(
  account: UserAccount,
  trialDays: number,
  customExpiresDate?: Date,
  adminNote?: string
): Promise<void> {
  const safeDays = clampNumber(trialDays, 1, 365, 30);
  const expiresDate =
    customExpiresDate || new Date(Date.now() + safeDays * 86_400_000);

  await upsertAccountAsAdmin(account, {
    accessStatus: 'trial_active',
    requestedPlan: 'none',
    hasUsedTrial: true,
    trialDaysGranted: safeDays,
    accessExpiresAt: Timestamp.fromDate(expiresDate),
    adminNote: sanitizeString(
      adminNote !== undefined ? adminNote : account.adminNote,
      400
    ),
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function adminApproveSubscription(
  account: UserAccount,
  cycleDays: number,
  customExpiresDate?: Date,
  adminNote?: string
): Promise<void> {
  const safeDays = clampNumber(cycleDays, 1, 365, 30);
  const baseMs =
    account.accessExpiresAtMs && account.accessExpiresAtMs > Date.now()
      ? account.accessExpiresAtMs
      : Date.now();
  const expiresDate =
    customExpiresDate || new Date(baseMs + safeDays * 86_400_000);

  await upsertAccountAsAdmin(account, {
    accessStatus: 'subscription_active',
    requestedPlan: 'none',
    accessExpiresAt: Timestamp.fromDate(expiresDate),
    adminNote: sanitizeString(
      adminNote !== undefined ? adminNote : account.adminNote,
      400
    ),
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function adminGrantPermanent(
  account: UserAccount,
  adminNote?: string
): Promise<void> {
  await upsertAccountAsAdmin(account, {
    accessStatus: 'permanent_active',
    requestedPlan: 'none',
    accessExpiresAt: null,
    adminNote: sanitizeString(
      adminNote !== undefined ? adminNote : account.adminNote,
      400
    ),
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function adminUpdateAccount(
  account: UserAccount,
  updates: {
    email?: string;
    accessStatus: AccessStatus;
    accessExpiresAt: Date | null;
    hasUsedTrial: boolean;
    trialDaysGranted: number;
    adminNote: string;
  }
): Promise<void> {
  const isGrantingActive =
    updates.accessStatus === 'trial_active' ||
    updates.accessStatus === 'subscription_active' ||
    updates.accessStatus === 'permanent_active';

  const patch: Record<string, unknown> = {
    accessStatus: updates.accessStatus,
    requestedPlan: isGrantingActive ? 'none' : account.requestedPlan,
    hasUsedTrial: Boolean(updates.hasUsedTrial),
    trialDaysGranted: clampNumber(updates.trialDaysGranted, 0, 365, 0),
    accessExpiresAt:
      updates.accessStatus === 'permanent_active'
        ? null
        : updates.accessExpiresAt
          ? Timestamp.fromDate(updates.accessExpiresAt)
          : null,
    adminNote: sanitizeString(updates.adminNote, 400).trim(),
    approvedAt: isGrantingActive
      ? serverTimestamp()
      : account.approvedAtMs
        ? Timestamp.fromMillis(account.approvedAtMs)
        : null,
    updatedAt: serverTimestamp(),
  };

  if (typeof updates.email === 'string' && updates.email.trim().length >= 3) {
    patch.email = sanitizeString(updates.email.trim(), 180);
  }

  await upsertAccountAsAdmin(account, patch);
}

export async function adminDenyAccount(
  account: UserAccount,
  status: 'rejected' | 'suspended',
  adminNote?: string
): Promise<void> {
  await upsertAccountAsAdmin(account, {
    accessStatus: status,
    requestedPlan: 'none',
    adminNote: sanitizeString(
      adminNote !== undefined ? adminNote : account.adminNote,
      400
    ),
    updatedAt: serverTimestamp(),
  });
}

export async function adminDeleteAccount(account: UserAccount): Promise<void> {
  if (account.isAdminAccount) return;
  const accountPath = `accounts/${account.uid}`;
  try {
    await deleteDoc(doc(db, 'accounts', account.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, accountPath);
  }

  // Also remove root workspace doc if present so legacy users do not reappear
  try {
    await deleteDoc(doc(db, 'users', account.uid));
  } catch {
    // Ignore if workspace doc does not exist
  }
}
