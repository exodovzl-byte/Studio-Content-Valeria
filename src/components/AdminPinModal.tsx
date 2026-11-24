import { useCallback, useEffect, useState } from 'react';
import { Delete, KeyRound, Lock, Shield, X } from 'lucide-react';
import { AdminPinConfig } from '../types/access';

interface AdminPinModalProps {
  open: boolean;
  pinConfig: AdminPinConfig | null;
  pinConfigLoaded: boolean;
  adminEmail: string;
  onClose: () => void;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onSaveNewPin: (pin: string) => Promise<void>;
  onReauthenticateForReset: () => Promise<boolean>;
  onUnlocked: () => void;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

export function AdminPinModal({
  open,
  pinConfig,
  pinConfigLoaded,
  adminEmail,
  onClose,
  onVerifyPin,
  onSaveNewPin,
  onReauthenticateForReset,
  onUnlocked,
}: AdminPinModalProps) {
  const [setupMode, setSetupMode] = useState<boolean>(false);
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [selectedLength, setSelectedLength] = useState<4 | 6>(4);
  const [firstPin, setFirstPin] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockUntilMs, setLockUntilMs] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const targetLength: 4 | 6 = setupMode
    ? selectedLength
    : pinConfig?.pinLength ?? 4;

  const cooldownSecs = Math.max(0, Math.ceil((lockUntilMs - nowMs) / 1000));

  useEffect(() => {
    if (!open) return;
    setValue('');
    setFirstPin('');
    setSetupStep('create');
    setErrorMsg(null);
    setBusy(false);
    if (pinConfigLoaded) {
      setSetupMode(!pinConfig);
      if (pinConfig) {
        setSelectedLength(pinConfig.pinLength);
      }
    }
  }, [open, pinConfig, pinConfigLoaded]);

  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const timer = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(timer);
  }, [cooldownSecs]);

  const handleCompletePin = useCallback(
    async (pin: string) => {
      if (busy) return;
      if (!setupMode && lockUntilMs > Date.now()) return;

      if (setupMode) {
        if (setupStep === 'create') {
          setFirstPin(pin);
          setValue('');
          setSetupStep('confirm');
          setErrorMsg(null);
          return;
        }
        if (pin !== firstPin) {
          setErrorMsg('Los códigos PIN no coinciden. Inténtalo de nuevo.');
          setValue('');
          setFirstPin('');
          setSetupStep('create');
          return;
        }
        setBusy(true);
        setErrorMsg(null);
        try {
          await onSaveNewPin(pin);
          onUnlocked();
        } catch {
          setErrorMsg('No se pudo guardar el código PIN. Intenta de nuevo.');
          setValue('');
        } finally {
          setBusy(false);
        }
        return;
      }

      setBusy(true);
      setErrorMsg(null);
      try {
        const ok = await onVerifyPin(pin);
        if (ok) {
          setFailedAttempts(0);
          setLockUntilMs(0);
          onUnlocked();
        } else {
          const nextAttempts = failedAttempts + 1;
          setFailedAttempts(nextAttempts);
          setValue('');
          if (nextAttempts >= 5) {
            const until = Date.now() + 30_000;
            setLockUntilMs(until);
            setNowMs(Date.now());
            setFailedAttempts(0);
            setErrorMsg('Demasiados intentos fallidos. Espera 30 segundos.');
          } else {
            setErrorMsg(
              `PIN incorrecto (${nextAttempts}/5 intentos). Verifica e intenta de nuevo.`
            );
          }
        }
      } catch {
        setErrorMsg('Error al verificar el PIN.');
        setValue('');
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      setupMode,
      setupStep,
      firstPin,
      lockUntilMs,
      failedAttempts,
      onSaveNewPin,
      onVerifyPin,
      onUnlocked,
    ]
  );

  const pushDigit = useCallback(
    (digit: string) => {
      if (busy || (!setupMode && cooldownSecs > 0)) return;
      setErrorMsg(null);
      setValue((prev) => {
        if (prev.length >= targetLength) return prev;
        const next = prev + digit;
        if (next.length === targetLength) {
          setTimeout(() => {
            void handleCompletePin(next);
          }, 90);
        }
        return next;
      });
    },
    [busy, setupMode, cooldownSecs, targetLength, handleCompletePin]
  );

  const popDigit = useCallback(() => {
    if (busy) return;
    setValue((prev) => prev.slice(0, -1));
  }, [busy]);

  const clearDigits = useCallback(() => {
    if (busy) return;
    setValue('');
    setErrorMsg(null);
  }, [busy]);

  // Support physical keyboard input on PC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        popDigit();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pushDigit(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, popDigit, pushDigit]);

  if (!open) return null;

  const handleForgotPin = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const ok = await onReauthenticateForReset();
      if (ok) {
        setSetupMode(true);
        setSetupStep('create');
        setFirstPin('');
        setValue('');
        setFailedAttempts(0);
        setLockUntilMs(0);
      } else {
        setErrorMsg(
          'Debes confirmar tu cuenta de administrador con Google para restablecer el PIN.'
        );
      }
    } catch {
      setErrorMsg('No se pudo reautenticar con Google. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pin-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {setupMode ? (
                <KeyRound className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="admin-pin-title"
                className="text-sm font-semibold text-slate-900 dark:text-white truncate"
              >
                {!pinConfigLoaded
                  ? 'Verificando seguridad...'
                  : setupMode
                    ? setupStep === 'create'
                      ? 'Crear PIN de Administrador'
                      : 'Confirma tu nuevo PIN'
                    : 'Acceso de Administrador'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                {adminEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {!pinConfigLoaded ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-zinc-400">
              Cargando configuración de seguridad...
            </div>
          ) : (
            <>
              {setupMode && setupStep === 'create' && (
                <div className="space-y-2 text-center">
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    Elige un código numérico de 4 o 6 dígitos para proteger tu Panel de Administrador.
                  </p>
                  <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                    {([4, 6] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => {
                          setSelectedLength(len);
                          setValue('');
                          setErrorMsg(null);
                        }}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          selectedLength === len
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {len} dígitos
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {setupMode && setupStep === 'confirm' && (
                <p className="text-xs text-center text-slate-600 dark:text-zinc-300">
                  Vuelve a ingresar el mismo PIN de {selectedLength} dígitos para confirmarlo.
                </p>
              )}

              {!setupMode && (
                <p className="text-xs text-center text-slate-600 dark:text-zinc-300">
                  Ingresa tu código PIN de{' '}
                  <strong className="font-mono">{targetLength} dígitos</strong>{' '}
                  para abrir el panel.
                </p>
              )}

              {/* Masked PIN Indicator Dots */}
              <div
                aria-label={`PIN ingresado: ${value.length} de ${targetLength} dígitos`}
                className="flex items-center justify-center gap-3 py-2"
              >
                {Array.from({ length: targetLength }).map((_, idx) => {
                  const filled = idx < value.length;
                  return (
                    <span
                      key={idx}
                      className={`w-10 h-11 rounded-xl border flex items-center justify-center transition-all ${
                        filled
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-transform ${
                          filled
                            ? 'bg-indigo-600 dark:bg-indigo-400 scale-100'
                            : 'bg-slate-300 dark:bg-zinc-700 scale-50'
                        }`}
                      />
                    </span>
                  );
                })}
              </div>

              {errorMsg && (
                <p className="text-xs text-center font-medium text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </p>
              )}

              {cooldownSecs > 0 && !setupMode && (
                <p className="text-xs text-center font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  Bloqueo temporal: {cooldownSecs}s
                </p>
              )}

              {/* Tactile Numeric Keypad (great on mobile & desktop) */}
              <div className="grid grid-cols-3 gap-2">
                {KEYPAD_KEYS.map((key) => {
                  if (key === 'clear') {
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={busy || value.length === 0}
                        onClick={clearDigits}
                        className="min-h-[48px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/70 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                      >
                        Limpiar
                      </button>
                    );
                  }
                  if (key === 'back') {
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={busy || value.length === 0}
                        onClick={popDigit}
                        aria-label="Borrar último dígito"
                        className="min-h-[48px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/70 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                      >
                        <Delete className="w-4.5 h-4.5" />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={busy || (!setupMode && cooldownSecs > 0)}
                      onClick={() => pushDigit(key)}
                      className="min-h-[48px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base font-semibold font-mono tabular-nums text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-[0.97] transition-all disabled:opacity-40"
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {!setupMode && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleForgotPin}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    ¿Olvidaste tu PIN? Restablecer con Google
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
