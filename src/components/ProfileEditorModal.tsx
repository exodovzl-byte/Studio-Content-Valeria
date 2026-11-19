import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { compressImageFile } from '../firebase';
import { Brand, BrandHighlight } from '../types/content';
import { SocialPreviewNetwork } from './GridPreviewView';

interface ProfileEditorModalProps {
  open: boolean;
  brand: Brand;
  initialNetwork: SocialPreviewNetwork;
  onClose: () => void;
  onUpdateBrand: (brandId: Brand['id'], patch: Partial<Brand>) => void;
  onResetBrand: (brandId: Brand['id']) => void;
}

type EditorTab = 'general' | 'instagram' | 'tiktok';

const HIGHLIGHT_TINTS = [
  '#18181b',
  '#3f3f46',
  '#0f766e',
  '#4338ca',
  '#be123c',
  '#b45309',
  '#1d4ed8',
];

export function ProfileEditorModal({
  open,
  brand,
  initialNetwork,
  onClose,
  onUpdateBrand,
  onResetBrand,
}: ProfileEditorModalProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('general');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const highlightInputRefs = useRef<Record<string, HTMLInputElement | null>>(
    {}
  );

  useEffect(() => {
    if (!open) return;
    setActiveTab('general');
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<Brand>) => {
    onUpdateBrand(brand.id, patch);
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await compressImageFile(file, 320, 0.8);
    if (url) update({ avatarUrl: url });
    e.target.value = '';
  };

  const handleHighlightImageUpload = async (
    highlightId: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await compressImageFile(file, 160, 0.72);
    if (url) {
      const updated = brand.highlights.map((h) =>
        h.id === highlightId ? { ...h, imageUrl: url } : h
      );
      update({ highlights: updated });
    }
    e.target.value = '';
  };

  const updateHighlight = (
    highlightId: string,
    patch: Partial<BrandHighlight>
  ) => {
    const updated = brand.highlights.map((h) =>
      h.id === highlightId ? { ...h, ...patch } : h
    );
    update({ highlights: updated });
  };

  const addHighlight = () => {
    const next: BrandHighlight = {
      id: `hl-${Date.now()}`,
      label: 'Nueva',
      tint: HIGHLIGHT_TINTS[brand.highlights.length % HIGHLIGHT_TINTS.length],
    };
    update({ highlights: [...brand.highlights, next] });
  };

  const removeHighlight = (highlightId: string) => {
    update({
      highlights: brand.highlights.filter((h) => h.id !== highlightId),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personalizar perfil del feed"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[93dvh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100">
              Personalizar perfil del feed
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Edita foto, métricas, biografía y destacadas de {brand.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onResetBrand(brand.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
              title="Restaurar valores originales de esta marca"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar editor de perfil"
              className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-1">
          {(
            [
              { id: 'general', label: 'Perfil y foto' },
              {
                id: 'instagram',
                label:
                  initialNetwork === 'Instagram'
                    ? 'Instagram (activo)'
                    : 'Instagram',
              },
              {
                id: 'tiktok',
                label:
                  initialNetwork === 'TikTok' ? 'TikTok (activo)' : 'TikTok',
              },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'general' && (
            <>
              {/* Avatar Upload Section */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/40">
                <div className="relative shrink-0 self-start sm:self-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 dark:border-zinc-700 flex items-center justify-center bg-slate-200 dark:bg-zinc-800">
                    {brand.avatarUrl ? (
                      <img
                        src={brand.avatarUrl}
                        alt={brand.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white text-lg font-bold font-mono"
                        style={{ backgroundColor: brand.accent }}
                      >
                        {brand.badge}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2.5">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      Foto de perfil
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Sube una foto desde tu equipo o personaliza las iniciales y el color de fondo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir foto
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />

                    {brand.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => update({ avatarUrl: '' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar foto
                      </button>
                    )}

                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] text-slate-600 dark:text-zinc-300 cursor-pointer">
                      <span>Color</span>
                      <input
                        type="color"
                        value={brand.accent}
                        onChange={(e) => update({ accent: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                    </label>

                    <input
                      type="text"
                      maxLength={3}
                      value={brand.badge}
                      onChange={(e) =>
                        update({ badge: e.target.value.toUpperCase() })
                      }
                      aria-label="Iniciales del avatar"
                      placeholder="EX"
                      className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-center text-slate-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Nombre visible
                  </label>
                  <input
                    type="text"
                    value={brand.name}
                    onChange={(e) => update({ name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Nombre de usuario (@handle)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      @
                    </span>
                    <input
                      type="text"
                      value={brand.handle}
                      onChange={(e) =>
                        update({ handle: e.target.value.replace(/^@+/, '') })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 pl-7 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Categoría (Instagram)
                  </label>
                  <input
                    type="text"
                    value={brand.category}
                    onChange={(e) => update({ category: e.target.value })}
                    placeholder="Ej. Marca de ropa, Creador digital..."
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Enlace de la biografía
                  </label>
                  <input
                    type="text"
                    value={brand.website}
                    onChange={(e) => update({ website: e.target.value })}
                    placeholder="miweb.com"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Biografía / Descripción
                </label>
                <textarea
                  rows={3}
                  value={brand.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Escribe la biografía que aparecerá debajo del nombre..."
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-3 text-xs leading-relaxed text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Verified Toggle */}
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/35 cursor-pointer">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-sky-500" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      Insignia de cuenta verificada
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Muestra el check azul junto al usuario en Instagram y TikTok
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(brand.verified)}
                  onChange={(e) => update({ verified: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
            </>
          )}

          {activeTab === 'instagram' && (
            <>
              {/* Instagram Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Publicaciones
                  </label>
                  <input
                    type="text"
                    value={brand.igPostsOverride ?? ''}
                    onChange={(e) =>
                      update({ igPostsOverride: e.target.value })
                    }
                    placeholder="Auto (según el feed)"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Déjalo vacío para contar piezas reales
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Seguidores
                  </label>
                  <input
                    type="text"
                    value={brand.igFollowers}
                    onChange={(e) => update({ igFollowers: e.target.value })}
                    placeholder="12.4K"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Seguidos
                  </label>
                  <input
                    type="text"
                    value={brand.igFollowing}
                    onChange={(e) => update({ igFollowing: e.target.value })}
                    placeholder="284"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {/* Story Ring Toggle */}
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/35 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Aro de historia activa
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Muestra el degradado alrededor de la foto de perfil en Instagram
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={brand.showStoryRing !== false}
                  onChange={(e) => update({ showStoryRing: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              {/* Story Highlights Editor */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Historias destacadas
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Personaliza nombre, color o sube una portada para cada círculo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addHighlight}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir destacada
                  </button>
                </div>

                <div className="space-y-2">
                  {brand.highlights.map((hl) => (
                    <div
                      key={hl.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40"
                    >
                      {/* Mini preview */}
                      <button
                        type="button"
                        onClick={() => highlightInputRefs.current[hl.id]?.click()}
                        title="Subir imagen de destacada"
                        className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-300 dark:border-zinc-700 shrink-0 group"
                      >
                        {hl.imageUrl ? (
                          <img
                            src={hl.imageUrl}
                            alt={hl.label}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white font-mono"
                            style={{ backgroundColor: hl.tint }}
                          >
                            {hl.label.slice(0, 2).toUpperCase() || 'HI'}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                      </button>
                      <input
                        ref={(el) => {
                          highlightInputRefs.current[hl.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleHighlightImageUpload(hl.id, e)}
                        className="hidden"
                      />

                      <input
                        type="text"
                        value={hl.label}
                        onChange={(e) =>
                          updateHighlight(hl.id, { label: e.target.value })
                        }
                        placeholder="Nombre"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />

                      <input
                        type="color"
                        value={hl.tint}
                        onChange={(e) =>
                          updateHighlight(hl.id, { tint: e.target.value })
                        }
                        title="Color de fondo"
                        className="w-7 h-7 rounded cursor-pointer border border-slate-200 dark:border-zinc-700 bg-transparent p-0.5 shrink-0"
                      />

                      {hl.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            updateHighlight(hl.id, { imageUrl: '' })
                          }
                          className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200 px-1.5"
                          title="Quitar imagen"
                        >
                          Quitar img
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeHighlight(hl.id)}
                        aria-label={`Eliminar destacada ${hl.label}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {brand.highlights.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 text-center py-4 border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
                      No hay historias destacadas (no se mostrará la fila en el feed).
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'tiktok' && (
            <>
              {/* TikTok Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Siguiendo
                  </label>
                  <input
                    type="text"
                    value={brand.ttFollowing}
                    onChange={(e) => update({ ttFollowing: e.target.value })}
                    placeholder="96"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Seguidores
                  </label>
                  <input
                    type="text"
                    value={brand.ttFollowers}
                    onChange={(e) => update({ ttFollowers: e.target.value })}
                    placeholder="18.9K"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Me gusta
                  </label>
                  <input
                    type="text"
                    value={brand.ttLikes}
                    onChange={(e) => update({ ttLikes: e.target.value })}
                    placeholder="142.6K"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {/* TikTok Pinned Toggle */}
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/35 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Etiqueta "Fijado" en el primer video
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Muestra la marca roja de video fijado en la posición #1 del feed
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={brand.ttShowPinned !== false}
                  onChange={(e) => update({ ttShowPinned: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/40 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            Los cambios se aplican y guardan al instante.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
