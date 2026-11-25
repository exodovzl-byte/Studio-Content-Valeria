import { AlertTriangle, Bell, BellOff, BellRing, CheckCircle2, Info, X } from 'lucide-react';
import {
  AppNotification,
  BrowserNotificationStatus,
} from '../hooks/useRealtimeNotifications';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationCenter({
  notifications,
  onDismiss,
}: NotificationCenterProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notificaciones en tiempo real"
      className="fixed z-[70] top-16 right-3 left-3 sm:left-auto sm:right-5 sm:w-[360px] flex flex-col gap-2 pointer-events-none"
    >
      {notifications.slice(0, 3).map((notif) => {
        const toneClasses =
          notif.tone === 'warning'
            ? 'border-amber-500/45 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100'
            : notif.tone === 'success'
              ? 'border-emerald-500/45 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100'
              : 'border-indigo-500/45 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100';

        const iconWrapClasses =
          notif.tone === 'warning'
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : notif.tone === 'success'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400';

        return (
          <div
            key={notif.id}
            role="status"
            className={`pointer-events-auto rounded-xl border shadow-xl p-3.5 flex items-start gap-3 backdrop-blur-md ${toneClasses}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconWrapClasses}`}
            >
              {notif.tone === 'warning' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : notif.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs font-semibold leading-snug">
                {notif.title}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                {notif.body}
              </p>
              {notif.actionLabel && notif.onAction && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      notif.onAction?.();
                      onDismiss(notif.id);
                    }}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    {notif.actionLabel}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(notif.id)}
              aria-label="Cerrar notificación"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface NotificationPermissionButtonProps {
  status: BrowserNotificationStatus;
  onRequest: () => void;
  compact?: boolean;
}

export function NotificationPermissionButton({
  status,
  onRequest,
  compact = false,
}: NotificationPermissionButtonProps) {
  if (status === 'unsupported') return null;

  if (status === 'granted') {
    return (
      <span
        title="Notificaciones del navegador activas"
        className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0"
      >
        <BellRing className="w-3.5 h-3.5 shrink-0" />
        {!compact && <span className="hidden sm:inline">Alertas activas</span>}
      </span>
    );
  }

  if (status === 'denied') {
    return (
      <span
        title="Notificaciones bloqueadas en la configuración del navegador"
        className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 whitespace-nowrap shrink-0"
      >
        <BellOff className="w-3.5 h-3.5 shrink-0" />
        {!compact && (
          <span className="hidden sm:inline">Alertas bloqueadas</span>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequest}
      title="Activar notificaciones en tiempo real en este dispositivo"
      className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 transition-colors whitespace-nowrap shrink-0"
    >
      <Bell className="w-3.5 h-3.5 shrink-0" />
      {!compact && <span className="hidden sm:inline">Activar alertas</span>}
    </button>
  );
}
