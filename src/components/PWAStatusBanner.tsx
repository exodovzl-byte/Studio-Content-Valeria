import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function PWAStatusBanner() {
  const isOnline = useOnlineStatus();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applyUpdateFn, setApplyUpdateFn] = useState<
    ((reloadPage?: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    let registrationRef: ServiceWorkerRegistration | undefined;

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateAvailable(true);
      },
      onRegisteredSW(_swUrl, registration) {
        registrationRef = registration;
      },
    });

    setApplyUpdateFn(() => updateSW);

    const checkForUpdates = () => {
      if (document.visibilityState === 'visible') {
        registrationRef?.update().catch(() => {
          // Ignore transient offline update check errors
        });
      }
    };

    document.addEventListener('visibilitychange', checkForUpdates);
    window.addEventListener('focus', checkForUpdates);

    return () => {
      document.removeEventListener('visibilitychange', checkForUpdates);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, []);

  const handleRefreshNow = () => {
    if (applyUpdateFn) {
      applyUpdateFn(true);
    } else {
      window.location.reload();
    }
  };

  if (isOnline && !updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-3 right-3 sm:left-4 sm:right-auto z-50 flex flex-col gap-2 max-w-sm">
      {updateAvailable && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-500/35 bg-white dark:bg-zinc-900 px-3.5 py-2.5 shadow-xl text-xs">
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Nueva versión disponible</span>
          </div>
          <button
            type="button"
            onClick={handleRefreshNow}
            className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            Actualizar
          </button>
        </div>
      )}

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500 text-zinc-950 px-3.5 py-2 shadow-lg text-xs font-semibold">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Sin conexión — tus cambios locales se guardarán al volver</span>
        </div>
      )}
    </div>
  );
}
