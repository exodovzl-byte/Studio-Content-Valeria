import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 transition-colors"
        title="Instalar OmniContent Studio en tu teléfono o computadora"
      >
        {isInstallable ? (
          <Download className="w-3.5 h-3.5 text-indigo-500" />
        ) : (
          <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
        )}
        <span>Instalar App</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Instalar OmniContent Studio como aplicación"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Instalar en tu teléfono como app
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Abre tu enlace publicado (Vercel) en el navegador móvil para instalarla en pantalla completa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Cerrar instrucciones"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    1.
                  </span>
                  <span>
                    En <strong>Safari</strong>, toca el botón{' '}
                    <span className="inline-flex items-center gap-1 font-semibold">
                      Compartir <Share className="w-3 h-3 inline" />
                    </span>{' '}
                    en la barra inferior.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    2.
                  </span>
                  <span>
                    Desliza hacia abajo y elige{' '}
                    <strong>Agregar a inicio</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    3.
                  </span>
                  <span>
                    Toca <strong>Agregar</strong> y se abrirá como una app nativa sin barra del navegador.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-zinc-100">
                    Android (Chrome / Edge)
                  </div>
                  <p>
                    Toca el menú <strong>⋮</strong> en la esquina superior derecha y selecciona{' '}
                    <strong>Instalar aplicación</strong> o{' '}
                    <strong>Agregar a la pantalla principal</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-zinc-100">
                    iPhone / iPad (Safari)
                  </div>
                  <p>
                    Toca el botón <strong>Compartir</strong> y luego{' '}
                    <strong>Agregar a inicio</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
