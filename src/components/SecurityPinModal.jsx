import { useState } from 'react';
import { KeyRound, Lock, X } from 'lucide-react';
import { isValidAdminPassword } from '../utils/security';

export default function SecurityPinModal({
  isOpen,
  title = 'Autorización Requerida',
  description = 'Ingresa la contraseña de administradora para confirmar esta acción.',
  onConfirm,
  onClose,
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError('Por favor ingresa la contraseña.');
      return;
    }

    if (!isValidAdminPassword(password)) {
      setError('Contraseña de administradora incorrecta.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'Contraseña incorrecta.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setPassword('');
    setError('');
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[#565449] bg-[#1A1B15] p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#D8CFBC]">
            <Lock className="h-5 w-5" aria-hidden="true" />
            <h3 id="security-modal-title" className="text-base font-extrabold text-[#FFFBF4]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={handleClose}
            className="rounded-xl border border-[#565449]/60 bg-[#11120D] p-2 text-[#D8CFBC] hover:text-[#FFFBF4]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-xs text-[#9E9A8B]">{description}</p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="security-admin-password"
              className="mb-1.5 block text-xs font-semibold text-[#D8CFBC]"
            >
              Contraseña de Administradora
            </label>
            <div className="relative flex items-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 text-[#D8CFBC]"
              >
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                id="security-admin-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="min-h-[44px] w-full rounded-xl border border-[#565449] bg-[#11120D] py-2.5 pl-10 pr-3 text-sm text-[#FFFBF4] focus:border-[#D8CFBC]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[42px] rounded-xl border border-[#565449] bg-[#11120D] text-xs font-bold text-[#D8CFBC]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[42px] rounded-xl bg-[#FFFBF4] text-xs font-extrabold text-[#11120D] hover:bg-[#D8CFBC] disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

