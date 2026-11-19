import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, LogIn, LogOut, RotateCcw, Trash2 } from 'lucide-react';
import { Brand, BrandId } from '../types/content';

interface AccountUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface BrandSelectorProps {
  brands: Brand[];
  selectedBrandId: BrandId;
  countsByBrand: Record<BrandId, number>;
  onSelectBrand: (brandId: BrandId) => void;
  onResetDemo: () => void;
  onOpenClearModal: () => void;
  accountUser: AccountUser | null;
  authReady: boolean;
  authBusy: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function BrandSelector({
  brands,
  selectedBrandId,
  countsByBrand,
  onSelectBrand,
  onResetDemo,
  onOpenClearModal,
  accountUser,
  authReady,
  authBusy,
  onSignIn,
  onSignOut,
}: BrandSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = brands.find((b) => b.id === selectedBrandId) || brands[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
      >
        <span
          className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center text-[11px] font-bold text-white shrink-0 font-mono"
          style={{ backgroundColor: current.accent }}
        >
          {current.avatarUrl ? (
            <img
              src={current.avatarUrl}
              alt={current.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            current.badge
          )}
        </span>
        <span className="text-xs font-semibold truncate max-w-[140px] sm:max-w-[190px] whitespace-nowrap">
          {current.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-76 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-50 p-1.5"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            Espacios y marcas activas
          </div>

          <div className="space-y-0.5">
            {brands.map((brand) => {
              const active = brand.id === selectedBrandId;
              const count = countsByBrand[brand.id] ?? 0;
              return (
                <button
                  key={brand.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelectBrand(brand.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                    active
                      ? 'bg-slate-100 dark:bg-zinc-800'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 font-mono"
                    style={{ backgroundColor: brand.accent }}
                  >
                    {brand.avatarUrl ? (
                      <img
                        src={brand.avatarUrl}
                        alt={brand.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      brand.badge
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate text-slate-900 dark:text-zinc-100">
                        {brand.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                          {count}
                        </span>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      {brand.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onOpenClearModal();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar contenido de prueba
            </button>
            <button
              type="button"
              onClick={() => {
                onResetDemo();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar piezas iniciales
            </button>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800">
            {accountUser ? (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {accountUser.photoURL ? (
                    <img
                      src={accountUser.photoURL}
                      alt={accountUser.displayName || 'Cuenta'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {(accountUser.displayName || accountUser.email || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-200 truncate">
                    {accountUser.displayName || accountUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => {
                    onSignOut();
                    setOpen(false);
                  }}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors shrink-0 disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={authBusy || !authReady}
                onClick={() => {
                  onSignIn();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                Iniciar sesión con Google
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
