import { FormEvent, useEffect, useState } from 'react';
import { Check, CreditCard, X } from 'lucide-react';
import {
  AccessConfig,
  UserAccount,
  formatDateShort,
  getDaysRemaining,
  hasPendingEarlyRenewal,
} from '../types/access';

interface RenewalModalProps {
  open: boolean;
  config: AccessConfig;
  account: UserAccount | null;
  onClose: () => void;
  onSubmitRenewal: (data: {
    displayName: string;
    businessName: string;
    paymentReference: string;
    userNote: string;
  }) => Promise<void>;
}

export function RenewalModal({
  open,
  config,
  account,
  onClose,
  onSubmitRenewal,
}: RenewalModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [userNote, setUserNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !account) return;
    setBusinessName(account.businessName || '');
    setPaymentReference(account.paymentReference || '');
    setUserNote(account.userNote || '');
    setSubmitted(false);
    setErrorMsg(null);
  }, [open, account]);

  if (!open || !account) return null;

  const daysLeft = getDaysRemaining(account.accessExpiresAtMs);
  const alreadyPending = hasPendingEarlyRenewal(account);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!paymentReference.trim()) {
      setErrorMsg(
        'Ingresa tu número de referencia o detalle del pago para que el administrador lo verifique.'
      );
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmitRenewal({
        displayName: account.displayName || account.email,
        businessName: businessName.trim(),
        paymentReference: paymentReference.trim(),
        userNote: userNote.trim(),
      });
      setSubmitted(true);
    } catch {
      setErrorMsg('No se pudo enviar el reporte de pago. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Renovar o activar suscripción mensual"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92dvh] rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              {config.subscriptionTitle} · {config.subscriptionPrice}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono tabular-nums">
              {account.accessStatus === 'trial_active'
                ? 'Modo prueba'
                : 'Suscripción activa'}{' '}
              · Vence {formatDateShort(account.accessExpiresAtMs)} ({daysLeft}{' '}
              {daysLeft === 1 ? 'día' : 'días'})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {submitted ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                Reporte de pago enviado
              </h4>
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed max-w-sm mx-auto">
                El administrador revisará tu referencia y extenderá tu acceso por{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {config.subscriptionCycleDays} días
                </span>
                . Puedes seguir usando la app sin interrupciones mientras se aprueba.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Volver al estudio
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {alreadyPending && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  Ya enviaste una solicitud de renovación (ref:{' '}
                  <span className="font-mono font-semibold">
                    {account.paymentReference || 'sin referencia'}
                  </span>
                  ). Puedes actualizarla abajo si realizaste un nuevo pago.
                </div>
              )}

              {config.paymentInstructions && (
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 p-3.5 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Instrucciones de pago mensual
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                    {config.paymentInstructions}
                  </p>
                  {config.supportContact && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                      Contacto: <span className="font-medium">{config.supportContact}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Marca o negocio
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ej. Estudio Valeria / Éxodo"
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Referencia o comprobante de pago
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ej. Pago Móvil #8492 · Zelle Juan P. · Binance ID"
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Nota adicional (opcional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Fecha del pago, banco o comentario para el administrador..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {submitting ? 'Enviando...' : 'Reportar pago mensual'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
