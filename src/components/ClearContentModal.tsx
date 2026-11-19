import { Trash2, X } from 'lucide-react';

interface ClearContentModalProps {
  open: boolean;
  demoCount: number;
  currentBrandName: string;
  currentBrandCount: number;
  onClose: () => void;
  onClearDemoOnly: () => void;
  onClearCurrentBrand: () => void;
}

export function ClearContentModal({
  open,
  demoCount,
  currentBrandName,
  currentBrandCount,
  onClose,
  onClearDemoOnly,
  onClearCurrentBrand,
}: ClearContentModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Borrar contenido de prueba"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 pt-3 sm:pt-5 pb-5 pb-safe shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pb-1">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Borrar contenido de prueba
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Elige si quieres eliminar solo las piezas de ejemplo precargadas o vaciar todas las piezas de la marca actual. Este cambio se guarda permanentemente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={demoCount === 0}
            onClick={() => {
              onClearDemoOnly();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-rose-500/30 bg-rose-500/8 hover:bg-rose-500/15 text-left transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <div>
              <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                Borrar solo contenido de prueba
              </div>
              <div className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                Elimina <span className="font-mono tabular-nums">{demoCount}</span> piezas de ejemplo y conserva las tuyas
              </div>
            </div>
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
          </button>

          <button
            type="button"
            disabled={currentBrandCount === 0}
            onClick={() => {
              onClearCurrentBrand();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-left transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Vaciar todas las piezas de {currentBrandName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Elimina las <span className="font-mono tabular-nums">{currentBrandCount}</span> piezas de esta marca
              </div>
            </div>
            <Trash2 className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
