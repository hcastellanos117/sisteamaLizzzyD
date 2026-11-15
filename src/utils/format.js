export function formatMoney(value) {
  const num = Number(value) || 0;
  const hasDecimals = Math.round(num * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
  return `Lps ${formatted}`;
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return String(isoString);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes} ${ampm}`;
}

export function dateToTimeString(dateInput = new Date()) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '08:00';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function timeStringToDate(timeStr, baseDateKey) {
  if (!timeStr) return new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  if (baseDateKey && /^\d{4}-\d{2}-\d{2}$/.test(baseDateKey)) {
    const [y, mon, d] = baseDateKey.split('-').map(Number);
    return new Date(y, mon - 1, d, h || 0, m || 0, 0, 0);
  }
  const d = new Date(now);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function toLocalDateKey(dateInput = new Date()) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateKeyLabel(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const str = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const WORKERS = {
  lizzy: {
    id: 'lizzy',
    shortName: 'Solo Lizzy',
    fullName: 'Lizzy Dinora Viera',
    badgeClass: 'bg-[#E8B4B8]/15 text-[#E8B4B8] border-[#E8B4B8]/35',
  },
  sandra: {
    id: 'sandra',
    shortName: 'Solo Sandra',
    fullName: 'Sandra Viera',
    badgeClass: 'bg-[#A3C9A8]/15 text-[#A3C9A8] border-[#A3C9A8]/35',
  },
  both: {
    id: 'both',
    shortName: 'Compartido (Ambas)',
    fullName: 'Lizzy y Sandra (50% / 50%)',
    badgeClass: 'bg-[#E4C59E]/15 text-[#E4C59E] border-[#E4C59E]/35',
  },
};

export const QUICK_SERVICES = [
  'Corte de cabello',
  'Tinte',
  'Peinado / Planchado',
  'Manicure',
  'Pedicure',
  'Uñas acrílicas',
  'Alisado / Keratina',
  'Cejas / Depilación',
  'Maquillaje',
  'Lavado y Secado',
];

export const QUICK_VALE_NOTES = [
  'Adelanto',
  'Comida / Almuerzo',
  'Transporte',
  'Gasto personal',
];

export const QUICK_GASTO_NOTES = [
  'Tintes / Químicos',
  'Acetona / Uñas',
  'Agua / Café',
  'Limpieza',
  'Papelería / Bolsas',
];

export function openWhatsApp(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
