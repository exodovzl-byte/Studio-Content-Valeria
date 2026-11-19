import { FormEvent, useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Brand, BrandId } from '../types/content';

interface BrandManagerModalProps {
  open: boolean;
  brands: Brand[];
  selectedBrandId: BrandId;
  countsByBrand: Record<string, number>;
  onClose: () => void;
  onSelectBrand: (brandId: BrandId) => void;
  onCreateBrand: (brand: Brand) => void;
  onRenameBrand: (brandId: BrandId, patch: Partial<Brand>) => void;
  onDeleteBrand: (brandId: BrandId) => void;
}

const ACCENT_PRESETS = [
  { label: 'Obsidiana', accent: '#18181b', accentLight: '#f4f4f5' },
  { label: 'Índigo', accent: '#4f46e5', accentLight: '#eef2ff' },
  { label: 'Teal', accent: '#0d9488', accentLight: '#f0fdfa' },
  { label: 'Rosa', accent: '#e11d48', accentLight: '#fff1f2' },
  { label: 'Ámbar', accent: '#d97706', accentLight: '#fffbeb' },
  { label: 'Esmeralda', accent: '#059669', accentLight: '#ecfdf5' },
  { label: 'Violeta', accent: '#7c3aed', accentLight: '#f5f3ff' },
  { label: 'Cielo', accent: '#0284c7', accentLight: '#f0f9ff' },
];

function deriveBadge(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const clean = name.replace(/[^a-zA-Z0-9]/g, '');
  return (clean.slice(0, 2) || 'MC').toUpperCase();
}

function deriveHandle(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30);
  return slug || 'nueva.marca';
}

export function BrandManagerModal({
  open,
  brands,
  selectedBrandId,
  countsByBrand,
  onClose,
  onSelectBrand,
  onCreateBrand,
  onRenameBrand,
  onDeleteBrand,
}: BrandManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(1);

  const [editingId, setEditingId] = useState<BrandId | null>(null);
  const [editName, setEditName] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<BrandId | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
        } else if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, editingId, confirmDeleteId, onClose]);

  if (!open) return null;

  const handleStartEdit = (brand: Brand) => {
    setConfirmDeleteId(null);
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditBadge(brand.badge);
  };

  const handleSaveEdit = (brandId: BrandId) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const badge = (editBadge.trim() || deriveBadge(trimmed))
      .slice(0, 4)
      .toUpperCase();
    onRenameBrand(brandId, { name: trimmed.slice(0, 80), badge });
    setEditingId(null);
  };

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const preset = ACCENT_PRESETS[selectedPresetIdx] || ACCENT_PRESETS[1];
    const cleanHandle = (newHandle.trim() || deriveHandle(trimmed))
      .replace(/^@+/, '')
      .slice(0, 60);
    const cleanBadge = (newBadge.trim() || deriveBadge(trimmed))
      .slice(0, 4)
      .toUpperCase();

    const created: Brand = {
      id: `brand-${Date.now()}`,
      name: trimmed.slice(0, 80),
      badge: cleanBadge,
      accent: preset.accent,
      accentLight: preset.accentLight,
      description: newDescription.trim().slice(0, 300),
      handle: cleanHandle || 'nueva.marca',
      category: 'Marca',
      website: '',
      avatarUrl: '',
      verified: false,
      igPostsOverride: '',
      igFollowers: '0',
      igFollowing: '0',
      showStoryRing: true,
      ttFollowing: '0',
      ttFollowers: '0',
      ttLikes: '0',
      ttShowPinned: true,
      highlights: [],
    };

    onCreateBrand(created);
    setNewName('');
    setNewHandle('');
    setNewBadge('');
    setNewDescription('');
  };

  const canDelete = brands.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-manager-title"
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h2
              id="brand-manager-title"
              className="text-sm font-semibold text-slate-900 dark:text-zinc-100"
            >
              Gestionar marcas
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Agrega marcas nuevas, cambia su nombre o elimina las que ya no
              uses.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestión de marcas"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Active Brands List */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Marcas activas ({brands.length})
              </h3>
              {!canDelete && (
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Debe quedar al menos 1 marca
                </span>
              )}
            </div>

            <div className="space-y-2">
              {brands.map((brand) => {
                const count = countsByBrand[brand.id] ?? 0;
                const isSelected = brand.id === selectedBrandId;
                const isEditing = editingId === brand.id;
                const isConfirmingDelete = confirmDeleteId === brand.id;

                return (
                  <div
                    key={brand.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? 'border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/8'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editBadge}
                          onChange={(e) =>
                            setEditBadge(e.target.value.slice(0, 4))
                          }
                          maxLength={4}
                          aria-label="Siglas de la marca"
                          placeholder="EX"
                          className="w-14 px-2 py-1.5 text-xs font-mono uppercase text-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={80}
                          autoFocus
                          aria-label="Nuevo nombre de la marca"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(brand.id);
                            }
                          }}
                          className="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(brand.id)}
                          disabled={!editName.trim()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors"
                          aria-label="Cancelar edición"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBrand(brand.id);
                            onClose();
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                        >
                          <span
                            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 font-mono"
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                {brand.name}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                                  Activa
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                              @{brand.handle} ·{' '}
                              <span className="font-mono tabular-nums">
                                {count} {count === 1 ? 'pieza' : 'piezas'}
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(brand)}
                            title="Cambiar nombre"
                            aria-label={`Cambiar nombre de ${brand.name}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Renombrar</span>
                          </button>
                          <button
                            type="button"
                            disabled={!canDelete}
                            onClick={() => {
                              setEditingId(null);
                              setConfirmDeleteId(
                                isConfirmingDelete ? null : brand.id
                              );
                            }}
                            title={
                              canDelete
                                ? 'Quitar marca'
                                : 'Debe quedar al menos 1 marca activa'
                            }
                            aria-label={`Quitar ${brand.name}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Quitar</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isConfirmingDelete && (
                      <div className="mt-2.5 pt-2.5 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-rose-700 dark:text-rose-300">
                          ¿Quitar <strong>{brand.name}</strong>
                          {count > 0
                            ? ` y sus ${count} ${count === 1 ? 'pieza' : 'piezas'}`
                            : ''}
                          ?
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteBrand(brand.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                          >
                            Sí, quitar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Create New Brand Form */}
          <section className="pt-4 border-t border-slate-200 dark:border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
              Agregar nueva marca
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                    Nombre de la marca *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Estudio Norte"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                    Siglas
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value.slice(0, 4))}
                    placeholder={newName ? deriveBadge(newName) : 'EN'}
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                    Usuario social (@)
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value)}
                    placeholder={newName ? deriveHandle(newName) : 'estudio.norte'}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                    Descripción breve
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Campañas, lanzamientos..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mr-1">
                    Color:
                  </span>
                  {ACCENT_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.accent}
                      type="button"
                      onClick={() => setSelectedPresetIdx(idx)}
                      title={preset.label}
                      aria-label={`Color ${preset.label}`}
                      className={`w-5 h-5 rounded-md transition-transform ${
                        selectedPresetIdx === idx
                          ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-zinc-950 scale-110'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.accent }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-45"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar marca
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
