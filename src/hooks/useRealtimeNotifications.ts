import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LEGACY_PLACEHOLDER_EMAIL,
  UserAccount,
  formatDateShort,
  getDaysRemaining,
  getPaymentMethodLabel,
  hasPendingEarlyRenewal,
  isAccountAccessActive,
} from '../types/access';

export type NotificationTone = 'info' | 'warning' | 'success';
export type BrowserNotificationStatus =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  tone: NotificationTone;
  actionLabel?: string;
  onAction?: () => void;
  createdAtMs: number;
}

interface UseRealtimeNotificationsOptions {
  userUid: string | null;
  isAdmin: boolean;
  allAccounts: UserAccount[];
  userAccount: UserAccount | null;
  nowTick: number;
  onOpenAdminFromNotification: () => void;
  onOpenRenewalFromNotification: () => void;
}

interface AccountSnapshotSignature {
  accessStatus: UserAccount['accessStatus'];
  requestedAtMs: number | null;
  paymentProofUrl: string;
  paymentReference: string;
}

const EXPIRATION_WARN_DAYS = 5;
const EXPIRATION_STORAGE_PREFIX = 'omnicontent_expiry_alert_v1_';

function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function playNotificationChime(tone: NotificationTone) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const startFreq = tone === 'warning' ? 587.33 : tone === 'success' ? 659.25 : 523.25;
    const endFreq = tone === 'warning' ? 440 : 880;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 400);
  } catch {
    // Ignore autoplay restriction or unsupported audio errors
  }
}

async function sendBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `omnicontent-${Date.now()}`,
        });
        return;
      }
    }
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
    });
  } catch {
    // Ignore restricted iframe / OS notification errors
  }
}

function getAccountDisplayLabel(acc: UserAccount): string {
  if (acc.displayName && acc.displayName.trim()) return acc.displayName.trim();
  if (acc.email && acc.email !== LEGACY_PLACEHOLDER_EMAIL) return acc.email;
  return 'Nueva cuenta';
}

export function useRealtimeNotifications({
  userUid,
  isAdmin,
  allAccounts,
  userAccount,
  nowTick,
  onOpenAdminFromNotification,
  onOpenRenewalFromNotification,
}: UseRealtimeNotificationsOptions) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permissionStatus, setPermissionStatus] =
    useState<BrowserNotificationStatus>(getBrowserNotificationStatus);

  const adminInitializedRef = useRef<boolean>(false);
  const prevAccountsMapRef = useRef<Map<string, AccountSnapshotSignature>>(
    new Map()
  );
  const prevClientStatusRef = useRef<UserAccount['accessStatus'] | null>(null);
  const clientInitializedRef = useRef<boolean>(false);
  const dismissalTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  // Sync callback refs so effects don't re-trigger unnecessarily
  const onOpenAdminRef = useRef(onOpenAdminFromNotification);
  const onOpenRenewalRef = useRef(onOpenRenewalFromNotification);
  onOpenAdminRef.current = onOpenAdminFromNotification;
  onOpenRenewalRef.current = onOpenRenewalFromNotification;

  const dismissNotification = useCallback((id: string) => {
    if (dismissalTimersRef.current[id]) {
      clearTimeout(dismissalTimersRef.current[id]);
      delete dismissalTimersRef.current[id];
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const pushNotification = useCallback(
    (
      item: Omit<AppNotification, 'id' | 'createdAtMs'>,
      autoDismissMs = 9000
    ) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const entry: AppNotification = {
        ...item,
        id,
        createdAtMs: Date.now(),
      };
      setNotifications((prev) => [entry, ...prev].slice(0, 4));
      playNotificationChime(item.tone);
      sendBrowserNotification(item.title, item.body);

      if (autoDismissMs > 0) {
        dismissalTimersRef.current[id] = setTimeout(() => {
          dismissNotification(id);
        }, autoDismissMs);
      }
    },
    [dismissNotification]
  );

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionStatus('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      if (result === 'granted') {
        pushNotification(
          {
            title: 'Alertas en tiempo real activadas',
            body: isAdmin
              ? 'Recibirás avisos al instante cuando alguien se registre, solicite prueba o envíe un pago.'
              : 'Recibirás avisos cuando falten pocos días para vencer tu prueba o suscripción.',
            tone: 'success',
          },
          5500
        );
      }
    } catch {
      setPermissionStatus(getBrowserNotificationStatus());
    }
  }, [isAdmin, pushNotification]);

  // Reset tracking state when user changes or signs out
  useEffect(() => {
    adminInitializedRef.current = false;
    prevAccountsMapRef.current = new Map();
    clientInitializedRef.current = false;
    prevClientStatusRef.current = null;
    Object.values(dismissalTimersRef.current).forEach(clearTimeout);
    dismissalTimersRef.current = {};
    setNotifications([]);
  }, [userUid, isAdmin]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(dismissalTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // 1. REAL-TIME ADMIN WATCHER: new registrations, trial requests, subscription/renewal payments
  useEffect(() => {
    if (!userUid || !isAdmin) return;
    if (allAccounts.length === 0) return;

    const currentMap = new Map<string, AccountSnapshotSignature>();
    allAccounts.forEach((acc) => {
      currentMap.set(acc.uid, {
        accessStatus: acc.accessStatus,
        requestedAtMs: acc.requestedAtMs,
        paymentProofUrl: acc.paymentProofUrl,
        paymentReference: acc.paymentReference,
      });
    });

    // Skip initial hydration snapshot so opening the app doesn't spam historic accounts
    if (!adminInitializedRef.current) {
      prevAccountsMapRef.current = currentMap;
      adminInitializedRef.current = true;
      return;
    }

    const prevMap = prevAccountsMapRef.current;

    allAccounts.forEach((acc) => {
      if (acc.isAdminAccount) return;
      const prev = prevMap.get(acc.uid);
      const label = getAccountDisplayLabel(acc);
      const emailPart =
        acc.email && acc.email !== LEGACY_PLACEHOLDER_EMAIL && acc.email !== label
          ? ` (${acc.email})`
          : '';

      if (!prev) {
        if (acc.accessStatus === 'pending_trial') {
          pushNotification({
            title: 'Nueva solicitud de Modo Prueba',
            body: `${label}${emailPart} solicitó activar el plan gratis de prueba.`,
            tone: 'info',
            actionLabel: 'Revisar',
            onAction: () => onOpenAdminRef.current(),
          });
        } else if (acc.accessStatus === 'pending_subscription') {
          const method = getPaymentMethodLabel(acc.paymentMethod);
          pushNotification({
            title: 'Nuevo pago de suscripción reportado',
            body: `${label}${emailPart} envió comprobante (${method}) para aprobación.`,
            tone: 'success',
            actionLabel: 'Verificar pago',
            onAction: () => onOpenAdminRef.current(),
          });
        } else {
          pushNotification({
            title: 'Nuevo usuario registrado',
            body: `${label}${emailPart} ingresó al Lobby.`,
            tone: 'info',
            actionLabel: 'Ver cuentas',
            onAction: () => onOpenAdminRef.current(),
          });
        }
        return;
      }

      // Existing account transitioned into pending_trial
      if (
        prev.accessStatus !== 'pending_trial' &&
        acc.accessStatus === 'pending_trial'
      ) {
        pushNotification({
          title: 'Solicitud de Modo Prueba',
          body: `${label}${emailPart} solicitó probar la aplicación gratis.`,
          tone: 'info',
          actionLabel: 'Aprobar',
          onAction: () => onOpenAdminRef.current(),
        });
        return;
      }

      // Existing account transitioned into pending_subscription OR submitted a fresh capture/early renewal
      const statusBecamePendingSub =
        prev.accessStatus !== 'pending_subscription' &&
        acc.accessStatus === 'pending_subscription';
      const newRequestTimestamp =
        acc.requestedAtMs !== null && acc.requestedAtMs !== prev.requestedAtMs;
      const newProofUploaded =
        Boolean(acc.paymentProofUrl) &&
        acc.paymentProofUrl !== prev.paymentProofUrl;
      const isEarlyRenewal =
        hasPendingEarlyRenewal(acc) && (newRequestTimestamp || newProofUploaded);

      if (
        statusBecamePendingSub ||
        isEarlyRenewal ||
        (acc.accessStatus === 'pending_subscription' &&
          (newRequestTimestamp || newProofUploaded))
      ) {
        const method = getPaymentMethodLabel(acc.paymentMethod);
        pushNotification({
          title: isEarlyRenewal
            ? 'Renovación mensual reportada'
            : 'Pago de suscripción recibido',
          body: `${label}${emailPart} subió comprobante por ${method}.`,
          tone: 'success',
          actionLabel: 'Verificar capture',
          onAction: () => onOpenAdminRef.current(),
        });
      }
    });

    prevAccountsMapRef.current = currentMap;
  }, [userUid, isAdmin, allAccounts, pushNotification]);

  // 2. REAL-TIME CLIENT WATCHER: plan approval/changes + low days remaining warning
  useEffect(() => {
    if (!userUid || isAdmin || !userAccount) return;

    const status = userAccount.accessStatus;
    if (!clientInitializedRef.current) {
      prevClientStatusRef.current = status;
      clientInitializedRef.current = true;
    } else if (prevClientStatusRef.current !== status) {
      const prevStatus = prevClientStatusRef.current;
      prevClientStatusRef.current = status;

      if (
        (prevStatus === 'pending_trial' ||
          prevStatus === 'unassigned' ||
          prevStatus === 'rejected') &&
        status === 'trial_active'
      ) {
        pushNotification({
          title: 'Modo de prueba aprobado',
          body: `Ya tienes acceso hasta el ${formatDateShort(userAccount.accessExpiresAtMs)}.`,
          tone: 'success',
        });
      } else if (
        status === 'subscription_active' &&
        prevStatus !== 'subscription_active'
      ) {
        pushNotification({
          title: 'Suscripción mensual activada',
          body: `Tu pago fue verificado. Acceso vigente hasta el ${formatDateShort(userAccount.accessExpiresAtMs)}.`,
          tone: 'success',
        });
      } else if (
        status === 'permanent_active' &&
        prevStatus !== 'permanent_active'
      ) {
        pushNotification({
          title: 'Suscripción permanente activada',
          body: 'El administrador te otorgó acceso permanente sin fecha de vencimiento.',
          tone: 'success',
        });
      } else if (status === 'rejected' || status === 'suspended') {
        pushNotification({
          title:
            status === 'suspended'
              ? 'Acceso suspendido'
              : 'Solicitud no aprobada',
          body:
            userAccount.adminNote ||
            'Revisa el estado de tu cuenta o comunícate con el administrador.',
          tone: 'warning',
        });
      }
    }

    // Check low-days expiration reminder (trial_active or subscription_active, <= 5 days left)
    if (
      status !== 'permanent_active' &&
      isAccountAccessActive(userAccount, nowTick) &&
      userAccount.accessExpiresAtMs
    ) {
      const daysLeft = getDaysRemaining(userAccount.accessExpiresAtMs, nowTick);
      if (daysLeft <= EXPIRATION_WARN_DAYS) {
        const todayStr = new Date(nowTick).toISOString().slice(0, 10);
        const dedupeKey = `${EXPIRATION_STORAGE_PREFIX}${userUid}_${todayStr}_${daysLeft}`;
        let alreadySentToday = false;
        try {
          alreadySentToday = localStorage.getItem(dedupeKey) === '1';
        } catch {
          alreadySentToday = false;
        }

        if (!alreadySentToday) {
          try {
            localStorage.setItem(dedupeKey, '1');
          } catch {
            // Ignore storage quota errors
          }

          const planLabel =
            status === 'trial_active'
              ? 'tu modo de prueba'
              : 'tu suscripción mensual';
          const dayWord = daysLeft === 1 ? 'día' : 'días';
          const urgency =
            daysLeft <= 1
              ? `¡Último día de ${planLabel}!`
              : `Quedan ${daysLeft} ${dayWord} de ${planLabel}`;

          pushNotification(
            {
              title: urgency,
              body: `Vence el ${formatDateShort(userAccount.accessExpiresAtMs)}. Renueva antes de esa fecha para no perder acceso.`,
              tone: 'warning',
              actionLabel: 'Renovar ahora',
              onAction: () => onOpenRenewalRef.current(),
            },
            14000
          );
        }
      }
    }
  }, [userUid, isAdmin, userAccount, nowTick, pushNotification]);

  return {
    notifications,
    permissionStatus,
    requestBrowserPermission,
    dismissNotification,
  };
}
