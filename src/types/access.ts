export type AccessStatus =
  | 'unassigned'
  | 'pending_trial'
  | 'pending_subscription'
  | 'trial_active'
  | 'subscription_active'
  | 'rejected'
  | 'suspended';

export type RequestedPlan = 'none' | 'trial' | 'subscription';

export interface AccessConfig {
  lobbyTitle: string;
  lobbySubtitle: string;
  trialEnabled: boolean;
  trialDays: number;
  trialTitle: string;
  trialDescription: string;
  subscriptionTitle: string;
  subscriptionPrice: string;
  subscriptionCycleDays: number;
  subscriptionDescription: string;
  subscriptionFeatures: string[];
  paymentInstructions: string;
  supportContact: string;
  updatedAtMs?: number | null;
}

export interface AdminPinConfig {
  pinHash: string;
  pinSalt: string;
  pinLength: 4 | 6;
  updatedAtMs: number | null;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  businessName: string;
  accessStatus: AccessStatus;
  requestedPlan: RequestedPlan;
  hasUsedTrial: boolean;
  trialDaysGranted: number;
  accessExpiresAtMs: number | null;
  paymentReference: string;
  userNote: string;
  adminNote: string;
  requestedAtMs: number | null;
  approvedAtMs: number | null;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  /** True when discovered from legacy /users/{uid} before an /accounts/{uid} doc exists */
  isLegacyWorkspace?: boolean;
  /** True when this account belongs to the active administrator */
  isAdminAccount?: boolean;
}

export const BOOTSTRAP_ADMIN_EMAIL = 'exodovzl@gmail.com';
export const LEGACY_PLACEHOLDER_EMAIL = 'pendiente@sincronizar.app';

export const DEFAULT_ACCESS_CONFIG: AccessConfig = {
  lobbyTitle: 'OmniContent Studio',
  lobbySubtitle:
    'Organiza marcas, flujos Kanban, calendario editorial y vista previa real de Instagram y TikTok desde tu PC y teléfono.',
  trialEnabled: true,
  trialDays: 30,
  trialTitle: 'Modo Prueba',
  trialDescription:
    'Explora todas las funciones del estudio durante el periodo de prueba. Requiere validación del administrador para evitar duplicados.',
  subscriptionTitle: 'Suscripción Mensual',
  subscriptionPrice: '$15 / mes',
  subscriptionCycleDays: 30,
  subscriptionDescription:
    'Acceso completo y continuo con sincronización en la nube para gestionar todas tus marcas sin interrupciones.',
  subscriptionFeatures: [
    'Gestión multimarca ilimitada y perfiles editables',
    'Tablero Kanban, calendario editorial y feed visual IG/TikTok',
    'Sincronización en tiempo real entre PC y teléfono (App móvil)',
    'Renovación mensual flexible con soporte directo',
  ],
  paymentInstructions:
    'Realiza el pago mensual por el método acordado con el administrador y escribe tu número de referencia o nombre del titular abajo para activar tu cuenta.',
  supportContact: 'exodovzl@gmail.com',
  updatedAtMs: null,
};

export function isAccountAccessActive(
  account: UserAccount | null,
  nowMs: number = Date.now()
): boolean {
  if (!account) return false;
  if (
    account.accessStatus !== 'trial_active' &&
    account.accessStatus !== 'subscription_active'
  ) {
    return false;
  }
  return account.accessExpiresAtMs !== null && account.accessExpiresAtMs > nowMs;
}

export function isAccountExpired(
  account: UserAccount | null,
  nowMs: number = Date.now()
): boolean {
  if (!account) return false;
  if (
    account.accessStatus !== 'trial_active' &&
    account.accessStatus !== 'subscription_active'
  ) {
    return false;
  }
  return (
    account.accessExpiresAtMs === null || account.accessExpiresAtMs <= nowMs
  );
}

export function hasPendingEarlyRenewal(
  account: UserAccount | null,
  nowMs: number = Date.now()
): boolean {
  if (!isAccountAccessActive(account, nowMs) || !account) return false;
  if (account.requestedPlan !== 'subscription') return false;
  if (account.requestedAtMs === null) return false;
  return (
    account.approvedAtMs === null ||
    account.requestedAtMs > account.approvedAtMs
  );
}

export function getDaysRemaining(
  expiresAtMs: number | null,
  nowMs: number = Date.now()
): number {
  if (expiresAtMs === null) return 0;
  const diff = expiresAtMs - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

export function formatDateShort(ms: number | null): string {
  if (!ms) return 'Sin fecha';
  return new Date(ms).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toDateInputValue(ms: number | null): string {
  const date = ms ? new Date(ms) : new Date(Date.now() + 30 * 86_400_000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateInputToEndOfDay(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}
