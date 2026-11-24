import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CreditCard,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import {
  AccessConfig,
  AccessStatus,
  AdminPinConfig,
  LEGACY_PLACEHOLDER_EMAIL,
  UserAccount,
  dateInputToEndOfDay,
  formatDateShort,
  getDaysRemaining,
  hasPendingEarlyRenewal,
  isAccountAccessActive,
  isAccountExpired,
  toDateInputValue,
} from '../types/access';

interface AdminDashboardProps {
  accounts: UserAccount[];
  config: AccessConfig;
  adminEmail: string;
  pinConfig: AdminPinConfig | null;
  onBackToStudio: () => void;
  onLockAdmin: () => void;
  onSignOut: () => void;
  onSaveConfig: (nextConfig: AccessConfig) => Promise<void>;
  onVerifyCurrentPin: (pin: string) => Promise<boolean>;
  onChangeAdminPin: (newPin: string) => Promise<void>;
  onApproveTrial: (
    account: UserAccount,
    days: number,
    customDate?: Date,
    adminNote?: string
  ) => Promise<void>;
  onApproveSubscription: (
    account: UserAccount,
    cycleDays: number,
    customDate?: Date,
    adminNote?: string
  ) => Promise<void>;
  onUpdateAccount: (
    account: UserAccount,
    updates: {
      email?: string;
      accessStatus: AccessStatus;
      accessExpiresAt: Date | null;
      hasUsedTrial: boolean;
      trialDaysGranted: number;
      adminNote: string;
    }
  ) => Promise<void>;
  onDenyAccount: (
    account: UserAccount,
    status: 'rejected' | 'suspended',
    adminNote?: string
  ) => Promise<void>;
}

type AdminTab = 'accounts' | 'settings';
type AccountFilter =
  | 'all'
  | 'pending'
  | 'trial'
  | 'subscription'
  | 'expired';

function getAccountDisplayMeta(
  account: UserAccount,
  nowMs: number
): { label: string; colorClass: string; category: AccountFilter } {
  const expired = isAccountExpired(account, nowMs);
  const earlyRenewal = hasPendingEarlyRenewal(account, nowMs);

  if (account.accessStatus === 'pending_trial') {
    return {
      label: 'Pendiente prueba',
      colorClass: 'text-amber-600 dark:text-amber-400',
      category: 'pending',
    };
  }
  if (account.accessStatus === 'pending_subscription') {
    return {
      label: 'Pendiente suscripción',
      colorClass: 'text-amber-600 dark:text-amber-400',
      category: 'pending',
    };
  }
  if (account.accessStatus === 'trial_active') {
    if (expired) {
      return {
        label: 'Prueba vencida',
        colorClass: 'text-rose-600 dark:text-rose-400',
        category: 'expired',
      };
    }
    return {
      label: earlyRenewal ? 'Prueba activa · Renovación pendiente' : 'En modo prueba',
      colorClass: earlyRenewal
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-sky-600 dark:text-sky-400',
      category: 'trial',
    };
  }
  if (account.accessStatus === 'subscription_active') {
    if (expired) {
      return {
        label: 'Suscripción vencida',
        colorClass: 'text-rose-600 dark:text-rose-400',
        category: 'expired',
      };
    }
    return {
      label: earlyRenewal
        ? 'Suscripción activa · Renovación pendiente'
        : 'Suscripción activa',
      colorClass: earlyRenewal
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400',
      category: 'subscription',
    };
  }
  if (account.accessStatus === 'suspended') {
    return {
      label: 'Acceso suspendido',
      colorClass: 'text-rose-600 dark:text-rose-400',
      category: 'expired',
    };
  }
  if (account.accessStatus === 'rejected') {
    return {
      label: 'Solicitud rechazada',
      colorClass: 'text-rose-600 dark:text-rose-400',
      category: 'expired',
    };
  }
  if (account.isAdminAccount) {
    return {
      label: 'Administrador (acceso permanente)',
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      category: 'all',
    };
  }
  if (account.isLegacyWorkspace) {
    return {
      label: 'Cuenta registrada previa (sin plan asignado)',
      colorClass: 'text-amber-600 dark:text-amber-400',
      category: 'all',
    };
  }
  return {
    label: 'Registrada sin plan',
    colorClass: 'text-slate-500 dark:text-zinc-400',
    category: 'all',
  };
}

export function AdminDashboard({
  accounts,
  config,
  adminEmail,
  pinConfig,
  onBackToStudio,
  onLockAdmin,
  onSignOut,
  onSaveConfig,
  onVerifyCurrentPin,
  onChangeAdminPin,
  onApproveTrial,
  onApproveSubscription,
  onUpdateAccount,
  onDenyAccount,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('accounts');
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Per-account custom editor state
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState<string>('');
  const [editStatus, setEditStatus] = useState<AccessStatus>('trial_active');
  const [editDateStr, setEditDateStr] = useState<string>('');
  const [editHasUsedTrial, setEditHasUsedTrial] = useState<boolean>(false);
  const [editTrialDays, setEditTrialDays] = useState<number>(config.trialDays);
  const [editAdminNote, setEditAdminNote] = useState<string>('');

  // Admin config editor state
  const [draftConfig, setDraftConfig] = useState<AccessConfig>(config);
  const [newFeature, setNewFeature] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedMsg, setConfigSavedMsg] = useState<string | null>(null);

  // Admin PIN change form state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinLength, setNewPinLength] = useState<4 | 6>(
    pinConfig?.pinLength ?? 4
  );
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  useEffect(() => {
    setDraftConfig(config);
  }, [config]);

  useEffect(() => {
    if (pinConfig) {
      setNewPinLength(pinConfig.pinLength);
    }
  }, [pinConfig]);

  const nowMs = Date.now();

  const metrics = useMemo(() => {
    let pending = 0;
    let trialActive = 0;
    let subActive = 0;
    let expiredOrDenied = 0;

    accounts.forEach((acc) => {
      const earlyRenewal = hasPendingEarlyRenewal(acc, nowMs);
      if (
        acc.accessStatus === 'pending_trial' ||
        acc.accessStatus === 'pending_subscription' ||
        earlyRenewal
      ) {
        pending += 1;
      }
      if (acc.accessStatus === 'trial_active' && isAccountAccessActive(acc, nowMs)) {
        trialActive += 1;
      } else if (
        acc.accessStatus === 'subscription_active' &&
        isAccountAccessActive(acc, nowMs)
      ) {
        subActive += 1;
      } else if (
        isAccountExpired(acc, nowMs) ||
        acc.accessStatus === 'rejected' ||
        acc.accessStatus === 'suspended'
      ) {
        expiredOrDenied += 1;
      }
    });

    return {
      total: accounts.length,
      pending,
      trialActive,
      subActive,
      expiredOrDenied,
    };
  }, [accounts, nowMs]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      const meta = getAccountDisplayMeta(acc, nowMs);
      const earlyRenewal = hasPendingEarlyRenewal(acc, nowMs);

      if (filter === 'pending' && meta.category !== 'pending' && !earlyRenewal) {
        return false;
      }
      if (filter === 'trial' && meta.category !== 'trial') return false;
      if (filter === 'subscription' && meta.category !== 'subscription') {
        return false;
      }
      if (filter === 'expired' && meta.category !== 'expired') return false;

      if (!q) return true;
      return (
        acc.email.toLowerCase().includes(q) ||
        acc.displayName.toLowerCase().includes(q) ||
        acc.businessName.toLowerCase().includes(q) ||
        acc.paymentReference.toLowerCase().includes(q) ||
        acc.adminNote.toLowerCase().includes(q)
      );
    });
  }, [accounts, filter, searchQuery, nowMs]);

  const openEditorFor = (acc: UserAccount) => {
    if (editingUid === acc.uid) {
      setEditingUid(null);
      return;
    }
    setEditingUid(acc.uid);
    setEditEmail(
      acc.email === LEGACY_PLACEHOLDER_EMAIL ? '' : acc.email || ''
    );
    setEditStatus(
      acc.accessStatus === 'pending_trial' || acc.accessStatus === 'unassigned'
        ? 'trial_active'
        : acc.accessStatus === 'pending_subscription'
          ? 'subscription_active'
          : acc.accessStatus
    );
    setEditDateStr(
      toDateInputValue(
        acc.accessExpiresAtMs ||
          Date.now() +
            (acc.accessStatus === 'pending_subscription'
              ? config.subscriptionCycleDays
              : config.trialDays) *
              86_400_000
      )
    );
    setEditHasUsedTrial(acc.hasUsedTrial);
    setEditTrialDays(acc.trialDaysGranted || config.trialDays);
    setEditAdminNote(acc.adminNote || '');
  };

  const applyPresetDays = (days: number) => {
    const baseMs = Date.now();
    setEditDateStr(toDateInputValue(baseMs + days * 86_400_000));
  };

  const handleQuickApproveTrial = async (acc: UserAccount) => {
    setBusyUid(acc.uid);
    setActionMessage(null);
    try {
      await onApproveTrial(acc, config.trialDays);
      setActionMessage(
        `Prueba de ${config.trialDays} días aprobada para ${acc.email}.`
      );
    } finally {
      setBusyUid(null);
    }
  };

  const handleQuickApproveSub = async (acc: UserAccount) => {
    setBusyUid(acc.uid);
    setActionMessage(null);
    try {
      await onApproveSubscription(acc, config.subscriptionCycleDays);
      setActionMessage(
        `Suscripción mensual (+${config.subscriptionCycleDays} días) aprobada para ${acc.email}.`
      );
    } finally {
      setBusyUid(null);
    }
  };

  const handleQuickSuspend = async (
    acc: UserAccount,
    status: 'rejected' | 'suspended'
  ) => {
    setBusyUid(acc.uid);
    setActionMessage(null);
    try {
      await onDenyAccount(acc, status);
      setActionMessage(
        status === 'rejected'
          ? `Solicitud rechazada para ${acc.email}.`
          : `Acceso suspendido para ${acc.email}.`
      );
    } finally {
      setBusyUid(null);
    }
  };

  const handleSaveAccountEdit = async (e: FormEvent, acc: UserAccount) => {
    e.preventDefault();
    setBusyUid(acc.uid);
    setActionMessage(null);
    try {
      const parsedDate =
        editStatus === 'trial_active' || editStatus === 'subscription_active'
          ? dateInputToEndOfDay(editDateStr)
          : acc.accessExpiresAtMs
            ? new Date(acc.accessExpiresAtMs)
            : null;

      await onUpdateAccount(acc, {
        email: editEmail.trim() || undefined,
        accessStatus: editStatus,
        accessExpiresAt: parsedDate,
        hasUsedTrial:
          editStatus === 'trial_active' ? true : editHasUsedTrial,
        trialDaysGranted: editTrialDays,
        adminNote: editAdminNote,
      });
      setEditingUid(null);
      setActionMessage(
        `Cambios guardados para ${editEmail.trim() || acc.displayName || acc.uid}.`
      );
    } finally {
      setBusyUid(null);
    }
  };

  const handlePinChangeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPinMsg(null);
    const cleanNew = newPinInput.trim();
    const cleanConfirm = confirmPinInput.trim();

    if (cleanNew.length !== newPinLength || !/^\d+$/.test(cleanNew)) {
      setPinMsg({
        type: 'err',
        text: `El nuevo PIN debe tener exactamente ${newPinLength} dígitos numéricos.`,
      });
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setPinMsg({
        type: 'err',
        text: 'La confirmación del nuevo PIN no coincide.',
      });
      return;
    }

    setSavingPin(true);
    try {
      if (pinConfig) {
        const validCurrent = await onVerifyCurrentPin(currentPinInput.trim());
        if (!validCurrent) {
          setPinMsg({
            type: 'err',
            text: 'El PIN actual ingresado es incorrecto.',
          });
          return;
        }
      }
      await onChangeAdminPin(cleanNew);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinMsg({
        type: 'ok',
        text: `Código PIN actualizado correctamente (${newPinLength} dígitos).`,
      });
    } catch {
      setPinMsg({
        type: 'err',
        text: 'No se pudo actualizar el código PIN. Intenta de nuevo.',
      });
    } finally {
      setSavingPin(false);
    }
  };

  const handleConfigSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSavedMsg(null);
    try {
      await onSaveConfig(draftConfig);
      setConfigSavedMsg(
        'Configuración guardada y aplicada en vivo al Lobby y aprobaciones.'
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddFeature = () => {
    const text = newFeature.trim();
    if (!text || draftConfig.subscriptionFeatures.length >= 10) return;
    setDraftConfig((prev) => ({
      ...prev,
      subscriptionFeatures: [...prev.subscriptionFeatures, text],
    }));
    setNewFeature('');
  };

  const handleRemoveFeature = (idx: number) => {
    setDraftConfig((prev) => ({
      ...prev,
      subscriptionFeatures: prev.subscriptionFeatures.filter(
        (_, i) => i !== idx
      ),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-5">
      {/* Admin Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Panel de Administrador
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
              Control de acceso, aprobaciones y suscripciones · {adminEmail}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'accounts'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Cuentas
              {metrics.pending > 0 && (
                <span className="font-mono tabular-nums text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  ({metrics.pending})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Planes y Lobby
            </button>
          </div>

          <button
            type="button"
            onClick={onLockAdmin}
            title="Bloquear panel con PIN"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            Bloquear
          </button>

          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ir al Estudio
          </button>

          <button
            type="button"
            onClick={onSignOut}
            title="Cerrar sesión y volver al Lobby"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {activeTab === 'accounts' ? (
        <div className="space-y-4">
          {/* 5-Column Tabular Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 overflow-hidden">
            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Registradas
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {metrics.total}
              </div>
            </div>
            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Pendientes
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {metrics.pending}
              </div>
            </div>
            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                En prueba
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                {metrics.trialActive}
              </div>
            </div>
            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Suscripciones
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {metrics.subActive}
              </div>
            </div>
            <div className="p-3.5 sm:p-4 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                Vencidas / Sin acceso
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {metrics.expiredOrDenied}
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar correo, nombre, marca o referencia..."
                className="w-full min-h-[38px] pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  ['all', `Todas (${metrics.total})`],
                  ['pending', `Pendientes (${metrics.pending})`],
                  ['trial', `En prueba (${metrics.trialActive})`],
                  ['subscription', `Suscripción (${metrics.subActive})`],
                  ['expired', `Vencidas (${metrics.expiredOrDenied})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    filter === key
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {actionMessage && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <span>{actionMessage}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="p-0.5 rounded hover:bg-emerald-500/15"
                aria-label="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Accounts List */}
          {filteredAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 py-14 px-6 text-center space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                {accounts.length === 0
                  ? 'Aún no hay cuentas registradas'
                  : 'No hay cuentas en este filtro'}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {accounts.length === 0
                  ? 'Cuando alguien inicie sesión en el Lobby, aparecerá aquí automáticamente para que apruebes su prueba o suscripción.'
                  : 'Prueba seleccionando otro estado o limpiando el buscador.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 divide-y divide-slate-200 dark:divide-zinc-800 overflow-hidden">
              {filteredAccounts.map((acc) => {
                const meta = getAccountDisplayMeta(acc, nowMs);
                const daysLeft = getDaysRemaining(acc.accessExpiresAtMs, nowMs);
                const isBusy = busyUid === acc.uid;
                const isEditing = editingUid === acc.uid;
                const isActive = isAccountAccessActive(acc, nowMs);

                return (
                  <div key={acc.uid} className="p-4 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Account Identity & Metadata */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {acc.displayName || 'Sin nombre'}
                          </span>
                          {acc.businessName && (
                            <>
                              <span
                                aria-hidden="true"
                                className="text-slate-300 dark:text-zinc-700"
                              >
                                ·
                              </span>
                              <span className="text-xs font-medium text-slate-600 dark:text-zinc-300 truncate">
                                {acc.businessName}
                              </span>
                            </>
                          )}
                          <span
                            aria-hidden="true"
                            className="text-slate-300 dark:text-zinc-700"
                          >
                            ·
                          </span>
                          <span className={`text-xs font-semibold ${meta.colorClass}`}>
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
                          <span className="font-mono text-[11px] text-slate-700 dark:text-zinc-300">
                            {acc.email === LEGACY_PLACEHOLDER_EMAIL
                              ? 'Correo pendiente de sincronizar (al próximo acceso)'
                              : acc.email}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[11px]">
                            Registro: {formatDateShort(acc.createdAtMs)}
                          </span>
                          {acc.accessExpiresAtMs && !acc.isAdminAccount && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-[11px]">
                                Vence: {formatDateShort(acc.accessExpiresAtMs)}
                                {isActive ? ` (${daysLeft}d)` : ''}
                              </span>
                            </>
                          )}
                          {!acc.isAdminAccount && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[11px]">
                                {acc.hasUsedTrial
                                  ? 'Prueba ya usada'
                                  : 'Sin prueba previa'}
                              </span>
                            </>
                          )}
                        </div>

                        {(acc.paymentReference || acc.userNote || acc.adminNote) && (
                          <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-zinc-300">
                            {acc.paymentReference && (
                              <span>
                                <strong className="font-semibold text-slate-800 dark:text-zinc-100">
                                  Ref. pago:
                                </strong>{' '}
                                <span className="font-mono">
                                  {acc.paymentReference}
                                </span>
                              </span>
                            )}
                            {acc.userNote && (
                              <span>
                                <strong className="font-semibold text-slate-800 dark:text-zinc-100">
                                  Nota usuario:
                                </strong>{' '}
                                {acc.userNote}
                              </span>
                            )}
                            {acc.adminNote && (
                              <span className="text-indigo-700 dark:text-indigo-300">
                                <strong className="font-semibold">Admin:</strong>{' '}
                                {acc.adminNote}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Action Controls */}
                      {acc.isAdminAccount ? (
                        <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
                          Cuenta protegida de administrador
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleQuickApproveTrial(acc)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/15 transition-colors whitespace-nowrap disabled:opacity-50"
                            title={`Aprobar modo prueba por ${config.trialDays} días`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Prueba ({config.trialDays}d)
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleQuickApproveSub(acc)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap disabled:opacity-50"
                            title={`Aprobar o renovar suscripción mensual (+${config.subscriptionCycleDays} días)`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Suscripción (+{config.subscriptionCycleDays}d)
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openEditorFor(acc)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                              isEditing
                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Editar fecha
                          </button>

                          {acc.accessStatus !== 'suspended' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleQuickSuspend(
                                  acc,
                                  acc.accessStatus === 'pending_trial' ||
                                    acc.accessStatus === 'pending_subscription'
                                    ? 'rejected'
                                    : 'suspended'
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium border border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-colors whitespace-nowrap disabled:opacity-50"
                              title="Negar o suspender acceso"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {acc.accessStatus === 'pending_trial' ||
                                acc.accessStatus === 'pending_subscription'
                                  ? 'Rechazar'
                                  : 'Suspender'}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline Custom Date & Access Editor */}
                    {isEditing && !acc.isAdminAccount && (
                      <form
                        onSubmit={(e) => handleSaveAccountEdit(e, acc)}
                        className="pt-3 mt-1 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 -mx-4 px-4 pb-1 space-y-3"
                      >
                        {acc.email === LEGACY_PLACEHOLDER_EMAIL && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                              Correo de referencia (opcional, se sincroniza automático al entrar)
                            </label>
                            <input
                              type="email"
                              maxLength={180}
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Ej. cliente@gmail.com"
                              className="w-full sm:max-w-md min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                              Estado de acceso
                            </label>
                            <select
                              value={editStatus}
                              onChange={(e) =>
                                setEditStatus(e.target.value as AccessStatus)
                              }
                              className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-900 dark:text-zinc-100"
                            >
                              <option value="trial_active">
                                Modo prueba activo
                              </option>
                              <option value="subscription_active">
                                Suscripción mensual activa
                              </option>
                              <option value="pending_trial">
                                Pendiente prueba
                              </option>
                              <option value="pending_subscription">
                                Pendiente suscripción
                              </option>
                              <option value="rejected">Rechazada</option>
                              <option value="suspended">Suspendida</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                              Fecha exacta de vencimiento
                            </label>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <input
                                type="date"
                                value={editDateStr}
                                onChange={(e) => setEditDateStr(e.target.value)}
                                className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                              Atajos rápidos desde hoy
                            </label>
                            <div className="flex flex-wrap items-center gap-1">
                              {[7, 15, 30, 90, 365].map((days) => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => {
                                    applyPresetDays(days);
                                    if (editStatus === 'trial_active') {
                                      setEditTrialDays(days);
                                    }
                                  }}
                                  className="px-2 py-1.5 rounded-md text-[11px] font-mono tabular-nums border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                                >
                                  +{days}d
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-8">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                              Nota interna del administrador
                            </label>
                            <input
                              type="text"
                              maxLength={400}
                              value={editAdminNote}
                              onChange={(e) => setEditAdminNote(e.target.value)}
                              placeholder="Ej. Pagó mes de noviembre por Pago Móvil ref 4920"
                              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100"
                            />
                          </div>

                          <label className="sm:col-span-4 flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 pt-4 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editHasUsedTrial}
                              onChange={(e) =>
                                setEditHasUsedTrial(e.target.checked)
                              }
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Bloquear nuevas solicitudes de prueba
                          </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingUid(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Guardar acceso
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==================== TAB 2: CUSTOMIZE LOBBY, TRIAL, MONTHLY SUBSCRIPTION & ADMIN PIN ==================== */
        <div className="space-y-5">
          <form onSubmit={handleConfigSubmit} className="space-y-5">
          {configSavedMsg && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-200">
              <span>{configSavedMsg}</span>
              <button
                type="button"
                onClick={() => setConfigSavedMsg(null)}
                aria-label="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section 1: Lobby Appearance */}
          <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Portada del Lobby / Inicio
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Textos visibles para cualquier persona al abrir la aplicación antes de acceder.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Título principal
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={draftConfig.lobbyTitle}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, lobbyTitle: e.target.value }))
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Contacto de soporte (WhatsApp, correo o enlace)
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={draftConfig.supportContact}
                  onChange={(e) =>
                    setDraftConfig((c) => ({
                      ...c,
                      supportContact: e.target.value,
                    }))
                  }
                  placeholder="Ej. WhatsApp +58 412... o correo@tudominio.com"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Subtítulo descriptivo
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={draftConfig.lobbySubtitle}
                onChange={(e) =>
                  setDraftConfig((c) => ({
                    ...c,
                    lobbySubtitle: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
              />
            </div>
          </section>

          {/* Section 2: Trial Settings */}
          <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Configuración del Modo Prueba
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Controla cuántos días dura la prueba por defecto y si aceptas nuevas solicitudes.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftConfig.trialEnabled}
                  onChange={(e) =>
                    setDraftConfig((c) => ({
                      ...c,
                      trialEnabled: e.target.checked,
                    }))
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Permitir solicitudes de prueba
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nombre del plan de prueba
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={draftConfig.trialTitle}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, trialTitle: e.target.value }))
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Duración del modo prueba (días)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={draftConfig.trialDays}
                  onChange={(e) =>
                    setDraftConfig((c) => ({
                      ...c,
                      trialDays: Math.max(
                        1,
                        Math.min(365, Number(e.target.value) || 1)
                      ),
                    }))
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Descripción del modo prueba
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={draftConfig.trialDescription}
                onChange={(e) =>
                  setDraftConfig((c) => ({
                    ...c,
                    trialDescription: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
              />
            </div>
          </section>

          {/* Section 3: Monthly Subscription Settings */}
          <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Suscripción Mensual e Instrucciones de Pago
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Personaliza precio, ciclo mensual, beneficios y los datos donde tus clientes deben pagar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nombre de la suscripción
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={draftConfig.subscriptionTitle}
                  onChange={(e) =>
                    setDraftConfig((c) => ({
                      ...c,
                      subscriptionTitle: e.target.value,
                    }))
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Precio visible
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={draftConfig.subscriptionPrice}
                  onChange={(e) =>
                    setDraftConfig((c) => ({
                      ...c,
                      subscriptionPrice: e.target.value,
                    }))
                  }
                  placeholder="Ej. $15 / mes"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs font-mono text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Días por ciclo mensual
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={draftConfig.subscriptionCycleDays}
                  onChange={(e) =>
                    setDraftConfig((c) => ({
                      ...c,
                      subscriptionCycleDays: Math.max(
                        1,
                        Math.min(365, Number(e.target.value) || 30)
                      ),
                    }))
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Descripción del plan mensual
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={draftConfig.subscriptionDescription}
                onChange={(e) =>
                  setDraftConfig((c) => ({
                    ...c,
                    subscriptionDescription: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Instrucciones de pago (Pago Móvil, Zelle, Binance, link, WhatsApp...)
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                value={draftConfig.paymentInstructions}
                onChange={(e) =>
                  setDraftConfig((c) => ({
                    ...c,
                    paymentInstructions: e.target.value,
                  }))
                }
                placeholder="Escribe aquí tus cuentas, enlaces de pago o pasos para que el cliente te envíe la referencia..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 leading-relaxed"
              />
            </div>

            {/* Editable Features List */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Beneficios incluidos ({draftConfig.subscriptionFeatures.length}/10)
              </label>
              <div className="space-y-1.5">
                {draftConfig.subscriptionFeatures.map((feat, idx) => (
                  <div
                    key={`${feat}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/50 text-xs"
                  >
                    <span className="text-slate-800 dark:text-zinc-200 truncate">
                      {feat}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      aria-label="Quitar beneficio"
                      className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {draftConfig.subscriptionFeatures.length < 10 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={120}
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Añadir beneficio del plan mensual..."
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>
              )}
            </div>
          </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {savingConfig ? 'Guardando...' : 'Guardar cambios del Lobby y planes'}
              </button>
            </div>
          </form>

          {/* Section 4: Admin PIN Security (4 or 6 digits) */}
          <form
            onSubmit={handlePinChangeSubmit}
            className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/75 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Código PIN del Panel de Administrador
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {pinConfig
                      ? `PIN activo de ${pinConfig.pinLength} dígitos. Puedes cambiarlo aquí a 4 o 6 dígitos.`
                      : 'Configura un código PIN de 4 o 6 dígitos para proteger este panel.'}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                {([4, 6] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => {
                      setNewPinLength(len);
                      setNewPinInput('');
                      setConfirmPinInput('');
                      setPinMsg(null);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      newPinLength === len
                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {len} dígitos
                  </button>
                ))}
              </div>
            </div>

            {pinMsg && (
              <div
                className={`rounded-xl px-3.5 py-2.5 text-xs border ${
                  pinMsg.type === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200'
                }`}
              >
                {pinMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {pinConfig && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    PIN actual ({pinConfig.pinLength} dígitos)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={pinConfig.pinLength}
                    required
                    value={currentPinInput}
                    onChange={(e) =>
                      setCurrentPinInput(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder={'•'.repeat(pinConfig.pinLength)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs font-mono tracking-widest text-slate-900 dark:text-zinc-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nuevo PIN ({newPinLength} dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={newPinLength}
                  required
                  value={newPinInput}
                  onChange={(e) =>
                    setNewPinInput(e.target.value.replace(/\D/g, ''))
                  }
                  placeholder={'•'.repeat(newPinLength)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs font-mono tracking-widest text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Confirmar nuevo PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={newPinLength}
                  required
                  value={confirmPinInput}
                  onChange={(e) =>
                    setConfirmPinInput(e.target.value.replace(/\D/g, ''))
                  }
                  placeholder={'•'.repeat(newPinLength)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs font-mono tracking-widest text-slate-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPin}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {savingPin ? 'Actualizando PIN...' : 'Guardar nuevo PIN'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
