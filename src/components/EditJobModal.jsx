import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, CreditCard, KeyRound, X } from 'lucide-react';
import { isValidAdminPassword } from '../utils/security';

const WORKER_OPTIONS = [
  { id: 'lizzy', label: 'Solo Lizzy' },
  { id: 'sandra', label: 'Solo Sandra' },
  { id: 'both', label: 'Ambas' },
];

const PAYMENT_OPTIONS = [
  { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', Icon: CreditCard },
];

export default function EditJobModal({ job, onClose, onSave }) {
  const [description, setDescription] = useState(job.description);
  const [clientReference, setClientReference] = useState(job.clientReference || '');
  const [amount, setAmount] = useState(String(job.amount));
  const [worker, setWorker] = useState(job.worker);
  const [paymentMethod, setPaymentMethod] = useState(job.paymentMethod);
  const [adminPassword, setAdminPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const num = parseFloat(amount);
    if (!description.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    if (!Number.isFinite(num) || num <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (!adminPassword) {
      setError('Ingresa la contraseña de administradora para guardar cambios.');
      return;
    }
    if (!isValidAdminPassword(adminPassword)) {
      setError('Contraseña de administradora incorrecta.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        job.id,
        {
          description: description.trim(),
          clientReference: clientReference.trim(),
          amount: num,
          worker,
          paymentMethod,
        },
        adminPassword
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  }

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-job-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overscroll-contain overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative my-auto w-full max-w-lg rounded-3xl border border-[#2B2921] bg-[#161511] p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="edit-job-title" className="text-lg font-bold text-[#FFFBF4]">
            Corregir trabajo
          </h3>
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={onClose}
            className="rounded-xl border border-[#26241D] bg-[#11100D] p-2.5 text-[#8E897C] hover:border-[#E4C59E]/40 hover:text-[#FFFBF4] transition"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-job-description"
              className="mb-1.5 block text-sm font-semibold text-[#D8CFBC]"
            >
              Servicio
            </label>
            <input
              id="edit-job-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#565449] bg-[#11120D] px-4 py-3 text-base text-[#FFFBF4] focus:border-[#D8CFBC]"
            />
          </div>

          <div>
            <label
              htmlFor="edit-job-amount"
              className="mb-1.5 block text-sm font-semibold text-[#D8CFBC]"
            >
              Monto
            </label>
            <div className="relative flex items-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 text-base font-bold text-[#D8CFBC]"
              >
                Lps
              </span>
              <input
                id="edit-job-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[#565449] bg-[#11120D] py-3 pl-14 pr-4 text-xl font-bold text-[#FFFBF4] focus:border-[#D8CFBC]"
              />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-[#D8CFBC]">
              ¿Quién lo realizó?
            </span>
            <div className="grid grid-cols-3 gap-2">
              {WORKER_OPTIONS.map((opt) => {
                const active = worker === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWorker(opt.id)}
                    className={`min-h-[44px] rounded-xl border py-2.5 text-sm font-bold transition ${
                      active
                        ? 'border-[#D8CFBC] bg-[#D8CFBC] text-[#11120D]'
                        : 'border-[#565449] bg-[#11120D] text-[#D8CFBC]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-[#D8CFBC]">
              Método de pago
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_OPTIONS.map(({ id, label, Icon }) => {
                const active = paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPaymentMethod(id)}
                    className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold ${
                      active
                        ? 'border-[#D8CFBC] bg-[#D8CFBC] text-[#11120D]'
                        : 'border-[#565449] bg-[#11120D] text-[#D8CFBC]'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-job-client-ref"
              className="mb-1.5 block text-xs font-semibold text-[#9E9A8B]"
            >
              Clienta o N° de referencia (opcional)
            </label>
            <input
              id="edit-job-client-ref"
              type="text"
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              placeholder="Ej. María López / Ref. #4821"
              className="w-full rounded-xl border border-[#565449] bg-[#11120D] px-4 py-2.5 text-sm text-[#FFFBF4] focus:border-[#D8CFBC]"
            />
          </div>

          <div className="rounded-2xl border border-[#565449]/70 bg-[#11120D] p-3.5">
            <label
              htmlFor="edit-job-admin-pwd"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#D8CFBC]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Contraseña de Administradora requerida
            </label>
            <input
              id="edit-job-admin-pwd"
              type="password"
              placeholder="••••••••"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-[#565449] bg-[#1A1B15] px-3 text-sm text-[#FFFBF4] focus:border-[#D8CFBC]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] flex-1 rounded-2xl border border-[#26241D] bg-[#11100D] py-3 text-sm font-bold text-[#A59F91] hover:border-[#38362D] hover:text-[#FFFBF4] transition active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[46px] flex-1 rounded-2xl bg-[#FFFBF4] py-3 text-sm font-extrabold text-[#11100D] hover:bg-[#E5DFD3] transition active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
