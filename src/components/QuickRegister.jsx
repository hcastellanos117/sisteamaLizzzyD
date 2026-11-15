import { useState } from 'react';
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  Lock,
  Plus,
  Scissors,
  User,
  Users,
  X,
} from 'lucide-react';
import { QUICK_SERVICES, formatMoney } from '../utils/format';

const WORKER_OPTIONS = [
  {
    id: 'lizzy',
    label: 'Lizzy',
    sub: '100%',
    Icon: User,
    color: '#E8B4B8',
    activeBg: 'bg-[#281A1D] text-[#FFFBF4] border-[#E8B4B8]/60 shadow-sm',
    indicator: 'bg-[#E8B4B8]',
  },
  {
    id: 'sandra',
    label: 'Sandra',
    sub: '100%',
    Icon: User,
    color: '#A3C9A8',
    activeBg: 'bg-[#18261C] text-[#FFFBF4] border-[#A3C9A8]/60 shadow-sm',
    indicator: 'bg-[#A3C9A8]',
  },
  {
    id: 'both',
    label: 'Compartido',
    sub: '50 / 50',
    Icon: Users,
    color: '#E4C59E',
    activeBg: 'bg-[#282218] text-[#FFFBF4] border-[#E4C59E]/60 shadow-sm',
    indicator: 'bg-[#E4C59E]',
  },
];

const PAYMENT_OPTIONS = [
  {
    id: 'efectivo',
    label: 'Efectivo',
    Icon: Banknote,
    color: '#A3C9A8',
    activeBg: 'bg-[#18261C] text-[#FFFBF4] border-[#A3C9A8]/60 shadow-sm',
  },
  {
    id: 'transferencia',
    label: 'Transferencia',
    Icon: CreditCard,
    color: '#9DBAD8',
    activeBg: 'bg-[#16202C] text-[#FFFBF4] border-[#9DBAD8]/60 shadow-sm',
  },
];

export default function QuickRegister({ onSubmit, cajaSesion, onAperturarCaja }) {
  const isCajaOpen = cajaSesion?.status === 'open';
  const [aperturaBaseInput, setAperturaBaseInput] = useState('');
  const [aperturandoCaja, setAperturandoCaja] = useState(false);
  const [aperturaError, setAperturaError] = useState('');

  const [services, setServices] = useState([]);
  const [customServiceInput, setCustomServiceInput] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [amount, setAmount] = useState('');
  const [worker, setWorker] = useState('lizzy');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  const numericAmount = parseFloat(amount);
  const hasValidAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  if (!isCajaOpen) {
    return (
      <div className="mx-auto max-w-lg py-6 sm:py-10">
        <div className="rounded-3xl border border-[#3E382A] bg-[#161511] p-6 text-center sm:p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight text-[#FFFBF4]">
            Caja cerrada para este turno
          </h2>
          <p className="mt-1.5 text-xs text-[#9E9A8B]">
            Ingresa el monto de cambio inicial en gaveta para comenzar a registrar servicios.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAperturaError('');
              const num = parseFloat(aperturaBaseInput);
              if (!Number.isFinite(num) || num < 0) {
                setAperturaError('Ingresa un monto inicial válido.');
                return;
              }
              setAperturandoCaja(true);
              try {
                await onAperturarCaja(num);
              } catch (err) {
                setAperturaError(err.message || 'Error al aperturar caja.');
              } finally {
                setAperturandoCaja(false);
              }
            }}
            className="mt-6 space-y-4"
          >
            {aperturaError && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs text-red-200">
                {aperturaError}
              </div>
            )}
            <div className="text-left">
              <label
                htmlFor="apertura-base-input"
                className="mb-1.5 block text-xs font-semibold text-[#D8CFBC]"
              >
                Base de cambio inicial (Lps)
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#E4C59E]"
                >
                  Lps
                </span>
                <input
                  id="apertura-base-input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={aperturaBaseInput}
                  onChange={(e) => setAperturaBaseInput(e.target.value)}
                  placeholder="0.00"
                  className="min-h-[48px] w-full rounded-2xl border border-[#3E382A] bg-[#0E0E0A] py-2.5 pl-14 pr-4 text-xl font-extrabold text-[#FFFBF4] placeholder-[#565449] focus:border-[#E4C59E]"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={aperturandoCaja}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FFFBF4] px-4 py-3 text-sm font-extrabold text-[#11120D] transition active:scale-95 disabled:opacity-50 hover:bg-[#E5DFD3]"
            >
              {aperturandoCaja ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              )}
              Aperturar caja y comenzar turno
            </button>
          </form>
        </div>
      </div>
    );
  }

  function handleSelectService(service) {
    if (!service) return;
    setError('');
    setJustSaved(false);
    const exists = services.some((s) => s.toLowerCase() === service.toLowerCase());
    if (exists) return;
    setServices((prev) => [...prev, service]);
  }

  function handleAddCustomService() {
    const trimmed = customServiceInput.trim();
    if (!trimmed) return;
    setError('');
    setJustSaved(false);
    const exists = services.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setServices((prev) => [...prev, trimmed]);
    }
    setCustomServiceInput('');
  }

  function handleRemoveService(serviceToRemove) {
    setServices((prev) =>
      prev.filter((s) => s.toLowerCase() !== serviceToRemove.toLowerCase())
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setJustSaved(false);

    let finalServices = [...services];
    const pendingCustom = customServiceInput.trim();
    if (
      pendingCustom &&
      !finalServices.some((s) => s.toLowerCase() === pendingCustom.toLowerCase())
    ) {
      finalServices.push(pendingCustom);
    }

    if (finalServices.length === 0) {
      setError('Elige o escribe al menos un servicio realizado.');
      return;
    }
    if (!hasValidAmount) {
      setError('Ingresa el monto cobrado.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        description: finalServices.join(' + '),
        clientReference: clientReference.trim(),
        amount: numericAmount,
        worker,
        paymentMethod,
      });
      setServices([]);
      setCustomServiceInput('');
      setClientReference('');
      setAmount('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2400);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el trabajo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 pb-8">
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200"
        >
          {error}
        </div>
      )}

      {/* Bloque Principal: Monto & Servicios (Sin tarjetas anidadas) */}
      <div className="rounded-3xl border border-[#2D2A22] bg-[#161511] p-5 sm:p-7 shadow-lg">
        {/* Cabecera del cobro */}
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="job-amount" className="text-xs font-bold uppercase tracking-wider text-[#A59F91]">
            Monto del servicio
          </label>
          <span className="text-xs font-medium text-[#7D786D]">Moneda: Lps</span>
        </div>

        {/* Input de monto tipo Hero */}
        <div className="flex items-center pb-5 border-b border-[#25231C]">
          <span className="pointer-events-none text-2xl sm:text-3xl font-extrabold text-[#E4C59E] mr-3">
            Lps
          </span>
          <input
            id="job-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
              setJustSaved(false);
            }}
            placeholder="0.00"
            className="w-full bg-transparent text-4xl sm:text-5xl font-extrabold tracking-tight text-[#FFFBF4] placeholder-[#38362D] focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('job-custom-service')?.focus();
              }
            }}
          />
        </div>

        {/* Selección de servicio */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="job-service-select"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A59F91]"
            >
              <Scissors className="h-3.5 w-3.5 text-[#E4C59E]" aria-hidden="true" />
              Servicios realizados
            </label>
            <span className="text-[11px] text-[#7D786D]">Puedes combinar varios</span>
          </div>

          <div className="relative">
            <select
              id="job-service-select"
              value=""
              onChange={(e) => handleSelectService(e.target.value)}
              className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#2B2921] bg-[#0E0E0A] py-2.5 pl-4 pr-10 text-sm font-semibold text-[#FFFBF4] focus:border-[#E4C59E] focus:outline-none"
            >
              <option value="">
                {services.length === 0
                  ? 'Seleccionar servicio frecuente...'
                  : 'Agregar otro servicio frecuente a este cobro...'}
              </option>
              {QUICK_SERVICES.map((service) => {
                const alreadyAdded = services.some(
                  (p) => p.toLowerCase() === service.toLowerCase()
                );
                return (
                  <option key={service} value={service} disabled={alreadyAdded}>
                    {alreadyAdded ? `✓ ${service}` : service}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A59F91]"
              aria-hidden="true"
            />
          </div>

          {/* Chips de servicios seleccionados */}
          {services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {services.map((part) => (
                <span
                  key={part}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#28261F] border border-[#3E3B30] px-3 py-1.5 text-xs font-bold text-[#FFFBF4] shadow-sm"
                >
                  <Scissors className="h-3 w-3 text-[#E4C59E]" aria-hidden="true" />
                  <span>{part}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveService(part)}
                    aria-label={`Quitar ${part}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-md hover:bg-black/40 text-[#A59F91] hover:text-[#FFFBF4] transition"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input para servicio manual con botón agregar y captura de Enter */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                id="job-custom-service"
                type="text"
                value={customServiceInput}
                onChange={(e) => {
                  setCustomServiceInput(e.target.value);
                  setError('');
                  setJustSaved(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomService();
                  }
                }}
                placeholder="O escribe otro trabajo manual..."
                className="min-h-[46px] min-w-0 flex-1 rounded-2xl border border-[#2B2921] bg-[#0E0E0A] px-4 text-sm text-[#FFFBF4] placeholder-[#565449] focus:border-[#E4C59E] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomService}
                className="inline-flex shrink-0 min-h-[46px] items-center gap-1.5 rounded-2xl border border-[#3A372D] bg-[#222019] px-4 py-2.5 text-xs font-bold text-[#FFFBF4] hover:bg-[#2C2920] hover:border-[#E4C59E]/50 transition active:scale-95"
              >
                <Plus className="h-4 w-4 text-[#E4C59E]" aria-hidden="true" />
                <span>Agregar</span>
              </button>
            </div>
            <p className="text-[11px] text-[#7D786D]">
              Presiona <kbd className="rounded bg-[#222019] px-1 py-0.5 text-[10px] text-[#D8CFBC] border border-[#333026]">Enter</kbd> o toca <strong className="text-[#D8CFBC]">Agregar</strong> para sumar otro servicio sin guardar todavía el trabajo.
            </p>
          </div>
        </div>
      </div>

      {/* Bloque Secundario: Colaboradora, Método y Clienta */}
      <div className="rounded-3xl border border-[#2D2A22] bg-[#161511] p-5 sm:p-7 space-y-6 shadow-lg">
        {/* Selector de Colaboradora */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A59F91]">
              Atendido por
            </span>
            {worker === 'both' && hasValidAmount && (
              <span className="text-xs text-[#A59F91]">
                Lizzy <span className="font-bold text-[#E8B4B8]">{formatMoney(numericAmount / 2)}</span> • Sandra <span className="font-bold text-[#A3C9A8]">{formatMoney(numericAmount / 2)}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#0D0D09] p-1.5 border border-[#26241D]">
            {WORKER_OPTIONS.map((opt) => {
              const active = worker === opt.id;
              const { Icon } = opt;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setWorker(opt.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-bold transition ${
                    active
                      ? `${opt.activeBg} border`
                      : 'text-[#8E897C] hover:text-[#FFFBF4]'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${opt.indicator}`}
                    aria-hidden="true"
                  />
                  <span>{opt.label}</span>
                  <span className="hidden sm:inline text-[11px] font-medium opacity-70">
                    ({opt.sub})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Método de pago y Clienta en una sola fila integrada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-[#A59F91] mb-2">
              Método de cobro
            </span>
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#0D0D09] p-1.5 border border-[#26241D]">
              {PAYMENT_OPTIONS.map(({ id, label, Icon, activeBg }) => {
                const active = paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPaymentMethod(id)}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition ${
                      active
                        ? `${activeBg} border`
                        : 'text-[#8E897C] hover:text-[#FFFBF4]'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="job-client-ref"
              className="block text-xs font-bold uppercase tracking-wider text-[#A59F91] mb-2"
            >
              Nombre de clienta o referencia
            </label>
            <input
              id="job-client-ref"
              type="text"
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              placeholder={
                paymentMethod === 'transferencia'
                  ? 'Ej. María / Ref. #1234'
                  : 'Opcional (Ej. Ana Hernández)'
              }
              className="h-[46px] w-full rounded-2xl border border-[#2B2921] bg-[#0E0E0A] px-4 text-sm text-[#FFFBF4] placeholder-[#565449] focus:border-[#E4C59E] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Botón Principal de Envío */}
      <button
        type="submit"
        disabled={submitting}
        className={`flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-base sm:text-lg font-extrabold transition active:scale-[0.98] disabled:opacity-60 shadow-lg ${
          justSaved
            ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200'
            : 'bg-[#FFFBF4] text-[#11120D] hover:bg-[#E5DFD3]'
        }`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Guardando trabajo...
          </>
        ) : justSaved ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden="true" />
            Trabajo guardado correctamente
          </>
        ) : (
          <>
            <Check className="h-5 w-5" aria-hidden="true" />
            Guardar trabajo
          </>
        )}
      </button>
    </form>
  );
}