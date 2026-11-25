import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Image as ImageIcon,
  Landmark,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { compressImageFile } from '../firebase';
import {
  AccessConfig,
  PaymentMethod,
  hasBinanceDetails,
  hasPagoMovilDetails,
} from '../types/access';

interface PaymentMethodsPanelProps {
  config: AccessConfig;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  paymentProofUrl: string;
  onChangePaymentProof: (url: string) => void;
  paymentReference: string;
  onChangePaymentReference: (value: string) => void;
}

export function PaymentMethodsPanel({
  config,
  selectedMethod,
  onSelectMethod,
  paymentProofUrl,
  onChangePaymentProof,
  paymentReference,
  onChangePaymentReference,
}: PaymentMethodsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const showBinance = hasBinanceDetails(config);
  const showPagoMovil = hasPagoMovilDetails(config);
  const hasAnyStructuredMethod = showBinance || showPagoMovil;

  useEffect(() => {
    if (selectedMethod === 'binance' && showBinance) return;
    if (selectedMethod === 'pago_movil' && showPagoMovil) return;
    if (showPagoMovil) {
      onSelectMethod('pago_movil');
    } else if (showBinance) {
      onSelectMethod('binance');
    } else if (selectedMethod !== 'other') {
      onSelectMethod('other');
    }
  }, [showBinance, showPagoMovil, selectedMethod, onSelectMethod]);

  const copyText = async (key: string, text: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 1800);
    } catch {
      // Ignore clipboard permission errors in restricted contexts
    }
  };

  const handleCopyAllBinance = () => {
    const lines = [
      'Datos Binance Pay',
      config.binancePayId ? `Pay ID: ${config.binancePayId}` : '',
      config.binanceEmail ? `Correo: ${config.binanceEmail}` : '',
      config.binanceHolder ? `Titular: ${config.binanceHolder}` : '',
      config.binanceNote ? `Nota: ${config.binanceNote}` : '',
    ].filter(Boolean);
    copyText('binance-all', lines.join('\n'));
  };

  const handleCopyAllPagoMovil = () => {
    const lines = [
      'Datos Pago Móvil',
      config.pagoMovilBank ? `Banco: ${config.pagoMovilBank}` : '',
      config.pagoMovilPhone ? `Teléfono: ${config.pagoMovilPhone}` : '',
      config.pagoMovilId ? `Cédula/RIF: ${config.pagoMovilId}` : '',
      config.pagoMovilHolder ? `Titular: ${config.pagoMovilHolder}` : '',
      config.pagoMovilNote ? `Nota: ${config.pagoMovilNote}` : '',
    ].filter(Boolean);
    copyText('pm-all', lines.join('\n'));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Selecciona una imagen válida (PNG, JPG o captura de pantalla).');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const compressed = await compressImageFile(file, 1080, 0.78);
      if (!compressed) {
        setUploadError(
          'No se pudo procesar la imagen. Intenta con un capture más liviano.'
        );
        return;
      }
      onChangePaymentProof(compressed);
    } catch {
      setUploadError('Ocurrió un error al cargar el capture. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const CopyBtn = ({ id, value }: { id: string; value: string }) => {
    if (!value.trim()) return null;
    const isCopied = copiedKey === id;
    return (
      <button
        type="button"
        onClick={() => copyText(id, value)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
      >
        {isCopied ? (
          <>
            <Check className="w-3 h-3 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Copiar</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Structured Payment Methods Selection */}
      {hasAnyStructuredMethod ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              1. Elige cómo vas a pagar ({config.subscriptionPrice})
            </span>
          </div>

          <div
            className={`grid gap-2.5 ${
              showBinance && showPagoMovil ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {showPagoMovil && (
              <button
                type="button"
                onClick={() => onSelectMethod('pago_movil')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                  selectedMethod === 'pago_movil'
                    ? 'border-indigo-500 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.12] ring-1 ring-indigo-500/40'
                    : 'border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    Pago Móvil
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    {config.pagoMovilBank || 'Transferencia móvil'}
                  </div>
                </div>
              </button>
            )}

            {showBinance && (
              <button
                type="button"
                onClick={() => onSelectMethod('binance')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                  selectedMethod === 'binance'
                    ? 'border-indigo-500 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.12] ring-1 ring-indigo-500/40'
                    : 'border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/60 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    Binance Pay
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    USDT / Binance ID
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Selected Payment Method Details Box */}
          {selectedMethod === 'pago_movil' && showPagoMovil && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Datos para Pago Móvil
                </div>
                <button
                  type="button"
                  onClick={handleCopyAllPagoMovil}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  {copiedKey === 'pm-all' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Datos copiados
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiar todo
                    </>
                  )}
                </button>
              </div>

              <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/80 text-xs">
                {config.pagoMovilBank && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Banco
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">
                        {config.pagoMovilBank}
                      </span>
                    </div>
                    <CopyBtn id="pm-bank" value={config.pagoMovilBank} />
                  </div>
                )}
                {config.pagoMovilPhone && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Teléfono
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                        {config.pagoMovilPhone}
                      </span>
                    </div>
                    <CopyBtn id="pm-phone" value={config.pagoMovilPhone} />
                  </div>
                )}
                {config.pagoMovilId && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Cédula / RIF
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                        {config.pagoMovilId}
                      </span>
                    </div>
                    <CopyBtn id="pm-id" value={config.pagoMovilId} />
                  </div>
                )}
                {config.pagoMovilHolder && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Titular
                      </span>
                      <span className="font-medium text-slate-900 dark:text-zinc-100">
                        {config.pagoMovilHolder}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {config.pagoMovilNote && (
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 pt-1 whitespace-pre-line leading-relaxed">
                  {config.pagoMovilNote}
                </p>
              )}
            </div>
          )}

          {selectedMethod === 'binance' && showBinance && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.05] dark:bg-amber-500/[0.07] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Datos para Binance Pay
                </div>
                <button
                  type="button"
                  onClick={handleCopyAllBinance}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
                >
                  {copiedKey === 'binance-all' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Datos copiados
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiar todo
                    </>
                  )}
                </button>
              </div>

              <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/80 text-xs">
                {config.binancePayId && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Binance Pay ID / UID
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100 break-all">
                        {config.binancePayId}
                      </span>
                    </div>
                    <CopyBtn id="bn-id" value={config.binancePayId} />
                  </div>
                )}
                {config.binanceEmail && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Correo de Binance
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100 break-all">
                        {config.binanceEmail}
                      </span>
                    </div>
                    <CopyBtn id="bn-email" value={config.binanceEmail} />
                  </div>
                )}
                {config.binanceHolder && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Alias / Titular
                      </span>
                      <span className="font-medium text-slate-900 dark:text-zinc-100">
                        {config.binanceHolder}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {config.binanceNote && (
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 pt-1 whitespace-pre-line leading-relaxed">
                  {config.binanceNote}
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* General instructions fallback or supplementary note */}
      {config.paymentInstructions && (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 p-3.5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
            Instrucciones adicionales
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
            {config.paymentInstructions}
          </p>
          {config.supportContact && (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
              Soporte: <span className="font-medium">{config.supportContact}</span>
            </p>
          )}
        </div>
      )}

      {/* Upload Payment Capture (Screenshot) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200">
            {hasAnyStructuredMethod ? '2. ' : ''}Capture del comprobante de pago{' '}
            <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            Imagen JPG / PNG
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {paymentProofUrl ? (
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <img
              src={paymentProofUrl}
              alt="Capture de comprobante de pago"
              className="w-full sm:w-28 h-40 sm:h-28 object-cover rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Check className="w-4 h-4 shrink-0" />
                Capture cargado y listo para verificar
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                El administrador podrá ver esta imagen en su panel para confirmar tu pago y autorizar tu acceso.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Cambiar capture
                </button>
                <button
                  type="button"
                  onClick={() => onChangePaymentProof('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quitar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/70 dark:bg-zinc-950/60 p-5 flex flex-col items-center justify-center gap-2 text-center transition-colors disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {uploading ? (
                <Upload className="w-5 h-5 animate-pulse" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-800 dark:text-zinc-100">
                {uploading
                  ? 'Procesando capture...'
                  : 'Toca aquí para subir el capture de tu pago'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Desde tu galería del teléfono o computadora (se optimiza automáticamente)
              </div>
            </div>
          </button>
        )}

        {uploadError && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {uploadError}
          </p>
        )}
      </div>

      {/* Reference Number Input */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
          Número de referencia o ID de orden{' '}
          <span className="text-slate-400 font-normal">(recomendado)</span>
        </label>
        <input
          type="text"
          maxLength={200}
          value={paymentReference}
          onChange={(e) => onChangePaymentReference(e.target.value)}
          placeholder={
            selectedMethod === 'binance'
              ? 'Ej. ID de orden Binance o correo desde donde pagaste'
              : selectedMethod === 'pago_movil'
                ? 'Ej. Últimos 4-6 dígitos de referencia · Banco origen'
                : 'Ej. Ref #4821 · Titular de la cuenta'
          }
          className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
    </div>
  );
}
