import { useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Image as ImageIcon,
  UserX,
  X,
} from 'lucide-react';
import {
  AccessConfig,
  LEGACY_PLACEHOLDER_EMAIL,
  UserAccount,
  formatDateShort,
  getPaymentMethodLabel,
} from '../types/access';

interface PaymentProofModalProps {
  account: UserAccount | null;
  config: AccessConfig;
  busy: boolean;
  onClose: () => void;
  onApprovePayment: (account: UserAccount, adminNote: string) => Promise<void>;
  onRejectPayment: (account: UserAccount, adminNote: string) => Promise<void>;
}

export function PaymentProofModal({
  account,
  config,
  busy,
  onClose,
  onApprovePayment,
  onRejectPayment,
}: PaymentProofModalProps) {
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    if (!account) return;
    setAdminNote(account.adminNote || '');
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [account, onClose]);

  if (!account) return null;

  const displayEmail =
    account.email === LEGACY_PLACEHOLDER_EMAIL
      ? 'Correo pendiente de sincronizar'
      : account.email;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verificar comprobante de pago"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[94dvh] rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="truncate">
                Verificar pago · {account.displayName || displayEmail}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
              {displayEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Payment Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 p-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                Método usado
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {getPaymentMethodLabel(account.paymentMethod)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                Referencia
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white break-all">
                {account.paymentReference || 'Sin número'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                Marca / Negocio
              </span>
              <span className="font-medium text-slate-800 dark:text-zinc-200 truncate block">
                {account.businessName || '—'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                Enviado el
              </span>
              <span className="font-mono tabular-nums text-slate-800 dark:text-zinc-200">
                {formatDateShort(account.requestedAtMs || account.updatedAtMs)}
              </span>
            </div>
          </div>

          {account.userNote && (
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 px-3.5 py-2.5 text-xs text-slate-700 dark:text-zinc-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                Mensaje del cliente:{' '}
              </span>
              {account.userNote}
            </div>
          )}

          {/* Full Screenshot Preview */}
          {account.paymentProofUrl ? (
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 p-2 flex items-center justify-center">
              <img
                src={account.paymentProofUrl}
                alt={`Comprobante de pago de ${displayEmail}`}
                className="max-h-[52dvh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 py-10 text-center text-xs text-slate-500 dark:text-zinc-400">
              Esta cuenta no adjuntó un capture de imagen.
            </div>
          )}

          {/* Optional Admin Note */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Nota del administrador (opcional, visible si rechazas el pago)
            </label>
            <input
              type="text"
              maxLength={400}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ej. Pago verificado por Pago Móvil / Capture ilegible, por favor reenviar..."
              className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {/* Footer Authorization Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/70 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => onRejectPayment(account, adminNote)}
            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
          >
            <UserX className="w-3.5 h-3.5" />
            Rechazar pago
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onApprovePayment(account, adminNote)}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <CreditCard className="w-3.5 h-3.5" />
              Autorizar acceso (+{config.subscriptionCycleDays} días)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
