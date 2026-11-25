import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Kanban,
  LayoutGrid,
  Lock,
  LogIn,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import {
  AccessConfig,
  PaymentMethod,
  UserAccount,
  formatDateShort,
  getPaymentMethodLabel,
  hasBinanceDetails,
  hasPagoMovilDetails,
  isAccountExpired,
} from '../types/access';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { PWAInstallButton } from './PWAInstallButton';
import { PWAStatusBanner } from './PWAStatusBanner';

interface AccessLobbyProps {
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  account: UserAccount | null;
  config: AccessConfig;
  darkMode: boolean;
  authBusy: boolean;
  authHint: string | null;
  isAdmin: boolean;
  pendingAdminCount: number;
  notificationControl?: ReactNode;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onAdminEntry: () => void;
  onEnterStudioAsAdmin: () => void;
  onSubmitTrial: (data: {
    displayName: string;
    businessName: string;
    userNote: string;
  }) => Promise<void>;
  onSubmitSubscription: (data: {
    displayName: string;
    businessName: string;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    paymentProofUrl: string;
    userNote: string;
  }) => Promise<void>;
  onRefreshStatus: () => Promise<void>;
}

export function AccessLobby({
  user,
  account,
  config,
  darkMode,
  authBusy,
  authHint,
  isAdmin,
  pendingAdminCount,
  notificationControl,
  onToggleTheme,
  onSignIn,
  onSignOut,
  onAdminEntry,
  onEnterStudioAsAdmin,
  onSubmitTrial,
  onSubmitSubscription,
  onRefreshStatus,
}: AccessLobbyProps) {
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'subscription'>(
    'trial'
  );
  const [editingPending, setEditingPending] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pago_movil');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [userNote, setUserNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const expired = isAccountExpired(account);
  const canRequestTrial =
    config.trialEnabled &&
    (!account || (!account.hasUsedTrial && account.accessStatus !== 'suspended'));

  useEffect(() => {
    if (!user) return;
    setDisplayName(account?.displayName || user.displayName || '');
    setBusinessName(account?.businessName || '');
    setPaymentMethod(
      account?.paymentMethod && account.paymentMethod !== 'none'
        ? account.paymentMethod
        : hasPagoMovilDetails(config)
          ? 'pago_movil'
          : hasBinanceDetails(config)
            ? 'binance'
            : 'other'
    );
    setPaymentReference(account?.paymentReference || '');
    setPaymentProofUrl(account?.paymentProofUrl || '');
    setUserNote(account?.userNote || '');
  }, [user, account, config]);

  useEffect(() => {
    if (!canRequestTrial) {
      setSelectedPlan('subscription');
    }
  }, [canRequestTrial]);

  const isPending =
    account &&
    (account.accessStatus === 'pending_trial' ||
      account.accessStatus === 'pending_subscription') &&
    !editingPending;

  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    if (selectedPlan === 'trial') {
      if (!canRequestTrial) {
        setErrorMsg(
          'El modo prueba no está disponible para esta cuenta. Selecciona la suscripción mensual.'
        );
        return;
      }
      setSubmitting(true);
      try {
        await onSubmitTrial({
          displayName: displayName.trim() || user?.displayName || '',
          businessName: businessName.trim(),
          userNote: userNote.trim(),
        });
        setEditingPending(false);
        setFeedback('Solicitud de prueba enviada para aprobación del administrador.');
      } catch {
        setErrorMsg('No se pudo enviar tu solicitud de prueba. Intenta de nuevo.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!paymentProofUrl) {
      setErrorMsg(
        'Sube el capture de tu comprobante de pago para que el administrador pueda verificarlo y autorizar tu acceso.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitSubscription({
        displayName: displayName.trim() || user?.displayName || '',
        businessName: businessName.trim(),
        paymentMethod,
        paymentReference: paymentReference.trim(),
        paymentProofUrl,
        userNote: userNote.trim(),
      });
      setEditingPending(false);
      setFeedback(
        'Comprobante enviado. El administrador verificará tu capture y aprobará tu acceso a la brevedad.'
      );
    } catch {
      setErrorMsg('No se pudo registrar tu solicitud de suscripción. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualCheck = async () => {
    setCheckingStatus(true);
    setFeedback(null);
    try {
      await onRefreshStatus();
      setFeedback('Estado actualizado desde el servidor.');
    } catch {
      setErrorMsg('No se pudo verificar tu estado en este momento.');
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Clean 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 pt-safe border-b border-slate-200 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs font-mono shrink-0">
              O
            </span>
            <span className="font-semibold text-sm tracking-tight truncate whitespace-nowrap">
              {config.lobbyTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && notificationControl}
            <PWAInstallButton />

            <button
              type="button"
              disabled={authBusy}
              onClick={onAdminEntry}
              title="Acceso exclusivo para administrador (requiere PIN)"
              className="inline-flex items-center justify-center gap-1.5 min-w-[38px] min-h-[38px] px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Administrador</span>
              {isAdmin && pendingAdminCount > 0 && (
                <span className="font-mono tabular-nums text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  ({pendingAdminCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={
                darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
              }
              className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {user ? (
              <button
                type="button"
                disabled={authBusy}
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={authBusy}
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acceder</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Lobby Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-safe">
        {user && isAdmin ? (
          /* ==================== ADMIN LOBBY LAUNCHER ==================== */
          <div className="max-w-xl mx-auto space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/85 p-6 sm:p-7 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Bienvenido al Lobby, Administrador
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Sesión iniciada como{' '}
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {user.email}
                    </span>
                    . Elige si deseas abrir el Panel de Administrador con tu PIN o entrar directamente al estudio.
                  </p>
                </div>
              </div>

              {authHint && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  {authHint}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={onAdminEntry}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Panel de Administrador</span>
                  {pendingAdminCount > 0 && (
                    <span className="font-mono tabular-nums text-[11px] bg-white/20 px-1.5 py-0.5 rounded">
                      {pendingAdminCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onEnterStudioAsAdmin}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 bg-slate-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 transition-opacity"
                >
                  <span>Entrar al Estudio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                <span>El acceso al panel solo está disponible desde este Lobby.</span>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  Cambiar correo
                </button>
              </div>
            </div>
          </div>
        ) : !user ? (
          /* ==================== STATE 1: PUBLIC WELCOME & EMAIL ENTRY ==================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Value Proposition & Google Email Registration */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Estudio editorial multimarca · Acceso controlado
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] text-balance">
                  {config.lobbyTitle}
                </h1>
                <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600 dark:text-zinc-300 max-w-xl">
                  {config.lobbySubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                  <Kanban className="w-4 h-4 text-indigo-500 mb-2" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    Flujo Kanban
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                    De estrategia hasta publicado por marca.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                  <Calendar className="w-4 h-4 text-indigo-500 mb-2" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    Calendario
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                    Fechas, formatos y responsables claros.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                  <LayoutGrid className="w-4 h-4 text-indigo-500 mb-2" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    Feed IG & TikTok
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                    Vista previa real sincronizada PC y móvil.
                  </p>
                </div>
              </div>

              {/* Primary Sign-In / Registration Box */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Regístrate o inicia sesión con tu correo
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Usa tu correo de Google para solicitar acceso al modo prueba o
                    activar tu suscripción mensual. Si eres administrador, accede
                    con tu correo autorizado.
                  </p>
                </div>

                {authHint && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                    {authHint}
                  </div>
                )}

                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignIn}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {authBusy
                    ? 'Conectando con Google...'
                    : 'Continuar con mi correo de Google'}
                </button>

                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    Aprobación manual anti-duplicados
                  </span>
                  {config.supportContact && (
                    <span className="truncate">Soporte: {config.supportContact}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Admin-Configured Plans Preview */}
            <div className="lg:col-span-6 space-y-4">
              {config.trialEnabled && (
                <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 p-5 sm:p-6 space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {config.trialTitle}
                    </h3>
                    <span className="text-sm font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
                      {config.trialDays} días gratis
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {config.trialDescription}
                  </p>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2">
                    <span>Acceso sujeto a aprobación del administrador</span>
                    <span aria-hidden="true">·</span>
                    <span>1 prueba por cuenta</span>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-indigo-500/40 bg-white dark:bg-zinc-900/90 p-5 sm:p-6 space-y-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {config.subscriptionTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono tabular-nums">
                      Renovación cada {config.subscriptionCycleDays} días
                    </p>
                  </div>
                  <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                    {config.subscriptionPrice}
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {config.subscriptionDescription}
                </p>

                {config.subscriptionFeatures.length > 0 && (
                  <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    {config.subscriptionFeatures.map((feat, idx) => (
                      <li
                        key={`${feat}-${idx}`}
                        className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-200"
                      >
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {(hasPagoMovilDetails(config) || hasBinanceDetails(config)) && (
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center gap-1.5">
                    <span>Métodos disponibles:</span>
                    {hasPagoMovilDetails(config) && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Pago Móvil
                      </span>
                    )}
                    {hasPagoMovilDetails(config) && hasBinanceDetails(config) && (
                      <span aria-hidden="true">·</span>
                    )}
                    {hasBinanceDetails(config) && (
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        Binance Pay
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignIn}
                  className="w-full min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 bg-slate-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 transition-opacity"
                >
                  Ingresar con mi correo para elegir plan
                </button>
              </section>
            </div>
          </div>
        ) : isPending ? (
          /* ==================== STATE 2: PENDING ADMIN APPROVAL ==================== */
          <div className="max-w-xl mx-auto space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/85 p-6 sm:p-7 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Solicitud pendiente de aprobación
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    El administrador está revisando tu solicitud para habilitar tu
                    acceso. Esta pantalla se desbloqueará automáticamente en cuanto
                    sea aprobada.
                  </p>
                </div>
              </div>

              {authHint && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  {authHint}
                </div>
              )}

              <div className="divide-y divide-slate-100 dark:divide-zinc-800 border-y border-slate-200 dark:border-zinc-800 text-xs">
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-zinc-400">
                    Correo registrado
                  </span>
                  <span className="font-medium text-slate-900 dark:text-zinc-100 truncate">
                    {account.email}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-zinc-400">
                    Plan solicitado
                  </span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {account.accessStatus === 'pending_trial'
                      ? `${config.trialTitle} (${config.trialDays} días)`
                      : `${config.subscriptionTitle} (${config.subscriptionPrice})`}
                  </span>
                </div>
                {account.businessName && (
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Marca / Negocio
                    </span>
                    <span className="font-medium text-slate-900 dark:text-zinc-100 truncate">
                      {account.businessName}
                    </span>
                  </div>
                )}
                {account.paymentMethod && account.paymentMethod !== 'none' && (
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Método de pago
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">
                      {getPaymentMethodLabel(account.paymentMethod)}
                    </span>
                  </div>
                )}
                {account.paymentReference && (
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Referencia de pago
                    </span>
                    <span className="font-mono text-slate-900 dark:text-zinc-100 truncate">
                      {account.paymentReference}
                    </span>
                  </div>
                )}
                {account.requestedAtMs && (
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Fecha de solicitud
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 dark:text-zinc-300">
                      {formatDateShort(account.requestedAtMs)}
                    </span>
                  </div>
                )}
              </div>

              {account.paymentProofUrl && (
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 p-3 flex items-center gap-3">
                  <img
                    src={account.paymentProofUrl}
                    alt="Capture de comprobante enviado"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Capture de pago adjuntado
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      El administrador revisará este comprobante para habilitar tu acceso.
                    </p>
                  </div>
                </div>
              )}

              {feedback && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {feedback}
                </p>
              )}
              {errorMsg && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errorMsg}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={handleManualCheck}
                  className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`}
                  />
                  {checkingStatus ? 'Verificando...' : 'Verificar estado'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan('subscription');
                    setEditingPending(true);
                  }}
                  className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Reportar pago mensual
                </button>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                {config.supportContact ? (
                  <span>
                    ¿Necesitas ayuda?{' '}
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      {config.supportContact}
                    </span>
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
                >
                  <LogOut className="w-3 h-3" />
                  Usar otro correo (Cerrar sesión)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== STATE 3: CHOOSE PLAN / EXPIRED / DENIED ==================== */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Contextual Access Denied / Expired Banner */}
            {authHint && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                {authHint}
              </div>
            )}

            {(expired ||
              account?.accessStatus === 'rejected' ||
              account?.accessStatus === 'suspended') && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/8 p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                    {expired
                      ? account?.accessStatus === 'trial_active'
                        ? 'Tu modo de prueba ha finalizado'
                        : 'Tu suscripción mensual ha vencido'
                      : account?.accessStatus === 'suspended'
                        ? 'Acceso suspendido por el administrador'
                        : 'Tu solicitud anterior no fue aprobada'}
                  </h2>
                  <p className="text-xs text-rose-700/90 dark:text-rose-200/85 leading-relaxed">
                    {expired
                      ? `Tu acceso venció el ${formatDateShort(account?.accessExpiresAtMs || null)}. Para volver a entrar a tu espacio de trabajo, envía el pago de tu suscripción mensual para aprobación.`
                      : 'Para recuperar o solicitar acceso nuevamente, registra tu pago mensual abajo o comunícate con el administrador.'}
                  </p>
                  {account?.adminNote && (
                    <p className="text-xs text-rose-800 dark:text-rose-200 font-medium pt-0.5">
                      Nota del administrador: {account.adminNote}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* User Identity Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {expired
                    ? 'Renueva tu acceso mensual'
                    : 'Solicita acceso al estudio'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Sesión iniciada como{' '}
                  <span className="font-semibold text-slate-700 dark:text-zinc-200">
                    {user.email}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {editingPending && (
                  <button
                    type="button"
                    onClick={() => setEditingPending(false)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Volver a mi solicitud pendiente
                  </button>
                )}
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cambiar correo
                </button>
              </div>
            </div>

            {/* Plan Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trial Option */}
              <button
                type="button"
                disabled={!canRequestTrial}
                onClick={() => setSelectedPlan('trial')}
                className={`text-left rounded-2xl border p-5 transition-colors space-y-2.5 ${
                  selectedPlan === 'trial' && canRequestTrial
                    ? 'border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08] ring-1 ring-indigo-500/40'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 hover:border-slate-300 dark:hover:border-zinc-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {config.trialTitle}
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                    {config.trialDays} días
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {config.trialDescription}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 pt-1">
                  {!config.trialEnabled
                    ? 'Modo prueba pausado temporalmente por el administrador.'
                    : account?.hasUsedTrial
                      ? 'Ya utilizaste tu periodo de prueba en esta cuenta.'
                      : account?.accessStatus === 'suspended'
                        ? 'No disponible para cuentas suspendidas.'
                        : 'Requiere aprobación manual del administrador.'}
                </p>
              </button>

              {/* Monthly Subscription Option */}
              <button
                type="button"
                onClick={() => setSelectedPlan('subscription')}
                className={`text-left rounded-2xl border p-5 transition-colors space-y-2.5 ${
                  selectedPlan === 'subscription'
                    ? 'border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08] ring-1 ring-indigo-500/40'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {config.subscriptionTitle}
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {config.subscriptionPrice}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {config.subscriptionDescription}
                </p>
                <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 pt-1">
                  Vigencia de {config.subscriptionCycleDays} días por pago mensual aprobado.
                </p>
              </button>
            </div>

            {/* Submission Form */}
            <form
              onSubmit={handleRequestSubmit}
              className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/85 p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedPlan === 'trial'
                    ? `Datos para aprobar tu ${config.trialTitle}`
                    : `Datos y confirmación de pago · ${config.subscriptionPrice}`}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Tu nombre
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Marca, agencia o Instagram
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ej. @miagencia / Tienda Norte"
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {selectedPlan === 'subscription' && (
                <PaymentMethodsPanel
                  config={config}
                  selectedMethod={paymentMethod}
                  onSelectMethod={setPaymentMethod}
                  paymentProofUrl={paymentProofUrl}
                  onChangePaymentProof={setPaymentProofUrl}
                  paymentReference={paymentReference}
                  onChangePaymentReference={setPaymentReference}
                />
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Mensaje para el administrador (opcional)
                </label>
                <textarea
                  rows={2}
                  maxLength={400}
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder={
                    selectedPlan === 'trial'
                      ? 'Cuéntanos brevemente qué marcas vas a gestionar...'
                      : 'Indica fecha, método o cualquier detalle de tu pago...'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {feedback && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {feedback}
                </p>
              )}
              {errorMsg && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errorMsg}
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  El administrador revisará y aprobará tu cuenta antes de otorgar acceso.
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {submitting
                    ? 'Enviando solicitud...'
                    : selectedPlan === 'trial'
                      ? `Solicitar ${config.trialTitle} (${config.trialDays} días)`
                      : 'Enviar pago y solicitar suscripción'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <PWAStatusBanner />
    </div>
  );
}
