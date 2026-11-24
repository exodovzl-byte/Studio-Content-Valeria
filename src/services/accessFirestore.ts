import {
  Timestamp,
  Unsubscribe,
  collection,
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
  BOOTSTRAP_ADMIN_EMAIL,
  DEFAULT_ACCESS_CONFIG,
  UserAccount,
  isAccountAccessActive,
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
    updatedAtMs: timestampToMs(raw.updatedAt),
  };
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
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return mapUserAccount(snap.id, snap.data() as Record<string, unknown>);
    }

    await setDoc(ref, {
      uid,
      email: sanitizeNonEmpty(email, 180, 'usuario@correo.com'),
      displayName: sanitizeString(displayName, 120),
      businessName: '',
      accessStatus: 'unassigned',
      requestedPlan: 'none',
      hasUsedTrial: false,
      trialDaysGranted: 0,
      accessExpiresAt: null,
      paymentReference: '',
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
      email,
      displayName,
      businessName: '',
      accessStatus: 'unassigned',
      requestedPlan: 'none',
      hasUsedTrial: false,
      trialDaysGranted: 0,
      accessExpiresAtMs: null,
      paymentReference: '',
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
    paymentReference: string;
    userNote: string;
  }
): Promise<void> {
  const path = `accounts/${uid}`;
  const isCurrentlyActive = isAccountAccessActive(currentAccount);

  try {
    if (isCurrentlyActive) {
      // Early renewal: keep existing active access status untouched while notifying admin
      await updateDoc(doc(db, 'accounts', uid), {
        displayName: sanitizeString(data.displayName, 120).trim(),
        businessName: sanitizeString(data.businessName, 120).trim(),
        requestedPlan: 'subscription',
        paymentReference: sanitizeString(data.paymentReference, 200).trim(),
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
        paymentReference: sanitizeString(data.paymentReference, 200).trim(),
        userNote: sanitizeString(data.userNote, 400).trim(),
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToAllAccounts(
  onData: (accounts: UserAccount[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'accounts';
  return onSnapshot(
    collection(db, 'accounts'),
    (snap) => {
      const list = snap.docs.map((d) =>
        mapUserAccount(d.id, d.data() as Record<string, unknown>)
      );
      list.sort((a, b) => {
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
        return (b.updatedAtMs || b.createdAtMs || 0) - (a.updatedAtMs || a.createdAtMs || 0);
      });
      onData(list);
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

export async function adminApproveTrial(
  account: UserAccount,
  trialDays: number,
  customExpiresDate?: Date,
  adminNote?: string
): Promise<void> {
  const path = `accounts/${account.uid}`;
  const safeDays = clampNumber(trialDays, 1, 365, 30);
  const expiresDate =
    customExpiresDate || new Date(Date.now() + safeDays * 86_400_000);

  try {
    await updateDoc(doc(db, 'accounts', account.uid), {
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
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminApproveSubscription(
  account: UserAccount,
  cycleDays: number,
  customExpiresDate?: Date,
  adminNote?: string
): Promise<void> {
  const path = `accounts/${account.uid}`;
  const safeDays = clampNumber(cycleDays, 1, 365, 30);
  const baseMs =
    account.accessExpiresAtMs && account.accessExpiresAtMs > Date.now()
      ? account.accessExpiresAtMs
      : Date.now();
  const expiresDate =
    customExpiresDate || new Date(baseMs + safeDays * 86_400_000);

  try {
    await updateDoc(doc(db, 'accounts', account.uid), {
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
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateAccount(
  account: UserAccount,
  updates: {
    accessStatus: AccessStatus;
    accessExpiresAt: Date | null;
    hasUsedTrial: boolean;
    trialDaysGranted: number;
    adminNote: string;
  }
): Promise<void> {
  const path = `accounts/${account.uid}`;
  const isGrantingActive =
    updates.accessStatus === 'trial_active' ||
    updates.accessStatus === 'subscription_active';

  try {
    await updateDoc(doc(db, 'accounts', account.uid), {
      accessStatus: updates.accessStatus,
      requestedPlan: isGrantingActive ? 'none' : account.requestedPlan,
      hasUsedTrial: Boolean(updates.hasUsedTrial),
      trialDaysGranted: clampNumber(updates.trialDaysGranted, 0, 365, 0),
      accessExpiresAt: updates.accessExpiresAt
        ? Timestamp.fromDate(updates.accessExpiresAt)
        : null,
      adminNote: sanitizeString(updates.adminNote, 400).trim(),
      approvedAt: isGrantingActive
        ? serverTimestamp()
        : account.approvedAtMs
          ? Timestamp.fromMillis(account.approvedAtMs)
          : null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminDenyAccount(
  account: UserAccount,
  status: 'rejected' | 'suspended',
  adminNote?: string
): Promise<void> {
  const path = `accounts/${account.uid}`;
  try {
    await updateDoc(doc(db, 'accounts', account.uid), {
      accessStatus: status,
      requestedPlan: 'none',
      adminNote: sanitizeString(
        adminNote !== undefined ? adminNote : account.adminNote,
        400
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
