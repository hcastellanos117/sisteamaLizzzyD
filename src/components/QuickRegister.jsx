import { useState } from 'react';
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  KeyRound,
  Loader2,
  Lock,
  Scissors,
  User,
  Users,
  X,
} from 'lucide-react';
import { QUICK_SERVICES, formatMoney } from '../utils/format';

const WORKER_OPTIONS = [
  { id: 'lizzy', label: 'Solo Lizzy', sub: 'Lizzy Dinora Viera', share: '100%', Icon: User },
  { id: 'sandra', label: 'Solo Sandra', sub: 'Sandra Viera', share: '100%', Icon: User },
  { id: 'both', label: 'Compartido', sub: 'Lizzy y Sandra', share: '50% / 50%', Icon: Users },
];

const PAYMENT_OPTIONS = [
  { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', Icon: CreditCard },
];

export default function QuickRegister({ onSubmit, cajaSesion, onAperturarCaja }) {
  const isCajaOpen = cajaSesion?.status === 'open';
  const [aperturaBaseInput, setAperturaBaseInput] = useState('');
  const [aperturandoCaja, setAperturandoCaja] = useState(false);
  const [aperturaError, setAperturaError] = useState('');

  const [description, setDescription] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [amount, setAmount] = useState('');
  const [worker, setWorker] = useState('lizzy');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  const numericAmount = parseFloat(amount);
  const hasValidAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  const selectedParts = description
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!isCajaOpen) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-amber-400/50 bg-[#1A1B15] p-5 text-center sm:p-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-lg font-extrabold text-[#FFFBF4]">
            Caja no iniciada / cerrada
          </h2>
          <p className="mt-1 text-xs text-[#D8CFBC]">
            Es obligatorio aperturar la caja con un monto inicial para poder registrar servicios.
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
            className="mx-auto mt-5 max-w-sm space-y-3"
          >
            {aperturaError && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs text-red-200">
                {aperturaError}
              </div>
            )}
            <div className="text-left">
              <label
                htmlFor="apertura-base-input"
                className="mb-1 block text-xs font-semibold text-[#D8CFBC]"
              >
                Monto de cambio inicial en caja (Lps)
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#D8CFBC]"
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
                  placeholder="Ingresa el monto de apertura"
                  className="min-h-[46px] w-full rounded-xl border border-[#565449] bg-[#11120D] py-2.5 pl-12 pr-3 text-base font-extrabold text-[#FFFBF4] placeholder:text-sm placeholder:font-normal placeholder:text-[#9E9A8B] focus:border-[#D8CFBC]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={aperturandoCaja}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FFFBF4] px-4 py-3 text-sm font-extrabold text-[#11120D] transition active:scale-95 disabled:opacity-50"
            >
              {aperturandoCaja ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              )}
              Aperturar caja y comenzar a registrar
            </button>
          </form>
        </section>
      </div>
    );
  }

  function handleSelectService(service) {
    if (!service) return;
    setError('');
    setJustSaved(false);
    const exists = selectedParts.some((p) => p.toLowerCase() === service.toLowerCase());
    if (exists) return;
    const next = selectedParts.length > 0 ? `${selectedParts.join(' + ')} + ${service}` : service;
    setDescription(next);
  }

  function handleRemovePart(partToRemove) {
    const nextParts = selectedParts.filter(
      (p) => p.toLowerCase() !== partToRemove.toLowerCase()
    );
    setDescription(nextParts.join(' + '));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setJustSaved(false);

    if (!description.trim()) {
      setError('Elige o escribe qué servicio se realizó.');
      return;
    }
    if (!hasValidAmount) {
      setError('Ingresa el monto cobrado.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
        clientReference: clientReference.trim(),
        amount: numericAmount,
        worker,
        paymentMethod,
      });
      setDescription('');
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3.5 text-sm font-medium text-red-200"
        >
          {error}
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="job-service-select"
            className="flex items-center gap-2 text-sm font-bold text-[#D8CFBC]"
          >
            <Scissors className="h-4 w-4 text-[#D8CFBC]" aria-hidden="true" />
            ¿Qué servicio se hizo?
          </label>
          <span className="text-xs text-[#9E9A8B]">Puedes elegir uno o varios</span>
        </div>

        <div className="relative">
          <select
            id="job-service-select"
            value=""
            onChange={(e) => handleSelectService(e.target.value)}
            className="min-h-[48px] w-full appearance-none rounded-xl border border-[#565449]/70 bg-[#11120D] py-3.5 pl-4 pr-10 text-base font-semibold text-[#FFFBF4] focus:border-[#D8CFBC]"
          >
            <option value="">
              {selectedParts.length === 0
                ? 'Selecciona un servicio frecuente...'
                : 'Agregar otro servicio al mismo cobro...'}
            </option>
            {QUICK_SERVICES.map((service) => {
              const alreadyAdded = selectedParts.some(
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
            className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D8CFBC]"
            aria-hidden="true"
          />
        </div>

        {selectedParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedParts.map((part) => (
              <span
                key={part}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#D8CFBC] px-3 py-1.5 text-xs font-bold text-[#11120D]"
              >
                {part}
                <button
                  type="button"
                  onClick={() => handleRemovePart(part)}
                  aria-label={`Quitar ${part}`}
                  className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-md p-1 hover:bg-black/15 active:scale-95"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="job-description" className="sr-only">
            O escribe otro servicio aquí
          </label>
          <input
            id="job-description"
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError('');
              setJustSaved(false);
            }}
            placeholder="O escribe otro servicio aquí..."
            className="min-h-[48px] w-full rounded-xl border border-[#565449]/70 bg-[#11120D] px-4 py-3.5 text-base text-[#FFFBF4] placeholder-[#9E9A8B] focus:border-[#D8CFBC]"
          />
        </div>

        <div className="border-t border-[#565449]/40 pt-4">
          <label htmlFor="job-amount" className="mb-2 block text-sm font-bold text-[#D8CFBC]">
            ¿Cuánto se cobró?
          </label>
          <div className="relative flex items-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 text-xl font-bold text-[#D8CFBC]"
            >
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
              placeholder="0"
              className="w-full rounded-xl border border-[#565449]/70 bg-[#11120D] py-4 pl-16 pr-4 text-3xl font-bold tracking-tight text-[#FFFBF4] placeholder-[#9E9A8B] focus:border-[#D8CFBC]"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4 sm:p-5">
        <div>
          <span className="mb-2.5 block text-sm font-bold text-[#D8CFBC]">
            ¿Quién realizó el trabajo?
          </span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {WORKER_OPTIONS.map(({ id, label, sub, share, Icon }) => {
              const active = worker === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setWorker(id)}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition active:scale-[0.97] sm:flex-col sm:items-start sm:gap-2 ${
                    active
                      ? 'border-[#FFFBF4] bg-[#D8CFBC] text-[#11120D] ring-2 ring-[#FFFBF4]/40'
                      : 'border-[#565449]/70 bg-[#11120D] text-[#D8CFBC] hover:border-[#D8CFBC]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        active ? 'bg-[#11120D] text-[#FFFBF4]' : 'bg-[#565449]/40 text-[#D8CFBC]'
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className={`text-base font-extrabold ${active ? 'text-[#11120D]' : 'text-[#FFFBF4]'}`}>
                        {label}
                      </div>
                      <div className={`text-xs ${active ? 'text-[#11120D]/80 font-medium' : 'text-[#9E9A8B]'}`}>
                        {sub}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                      active ? 'bg-[#11120D] text-[#FFFBF4]' : 'bg-[#565449]/40 text-[#FFFBF4]'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {share}
                  </span>
                </button>
              );
            })}
          </div>

          {worker === 'both' && hasValidAmount && (
            <div className="mt-3 rounded-xl border border-[#D8CFBC]/40 bg-[#11120D] px-3.5 py-2 text-center text-sm font-medium text-[#D8CFBC]">
              Se divide: <span className="font-bold text-[#FFFBF4]">{formatMoney(numericAmount / 2)}</span> para Lizzy y{' '}
              <span className="font-bold text-[#FFFBF4]">{formatMoney(numericAmount / 2)}</span> para Sandra
            </div>
          )}
        </div>

        <div className="border-t border-[#565449]/40 pt-4">
          <span className="mb-2.5 block text-sm font-bold text-[#D8CFBC]">Método de pago</span>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_OPTIONS.map(({ id, label, Icon }) => {
              const active = paymentMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border py-3.5 text-base font-extrabold transition active:scale-[0.97] ${
                    active
                      ? 'border-[#FFFBF4] bg-[#D8CFBC] text-[#11120D] ring-2 ring-[#FFFBF4]/40'
                      : 'border-[#565449]/70 bg-[#11120D] text-[#D8CFBC] hover:border-[#D8CFBC]/50'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                  {active && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <label
              htmlFor="job-client-ref"
              className="mb-1.5 block text-xs font-semibold text-[#9E9A8B]"
            >
              Clienta o N° de referencia (opcional)
            </label>
            <input
              id="job-client-ref"
              type="text"
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              placeholder={
                paymentMethod === 'transferencia'
                  ? 'Ej. María López / Ref. #4821'
                  : 'Nombre de la clienta (opcional)'
              }
              className="min-h-[44px] w-full rounded-xl border border-[#565449]/70 bg-[#11120D] px-4 py-2.5 text-sm text-[#FFFBF4] placeholder-[#9E9A8B] focus:border-[#D8CFBC]"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className={`flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-lg font-extrabold transition active:scale-[0.98] disabled:opacity-60 ${
          justSaved
            ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200'
            : 'bg-[#FFFBF4] text-[#11120D] hover:bg-[#D8CFBC]'
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
            Trabajo registrado correctamente
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
