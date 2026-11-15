import { ArrowDownCircle, CalendarCheck, PlusCircle, Wallet } from 'lucide-react';

const TABS = [
  {
    id: 'register',
    label: 'Registrar',
    icon: PlusCircle,
    color: '#A3C9A8',
    activeBg: 'bg-[#A3C9A8] text-[#0E1711]',
    mobileActive: 'bg-[#A3C9A8]/15 text-[#A3C9A8]',
  },
  {
    id: 'daily',
    label: 'Caja',
    icon: Wallet,
    color: '#E4C59E',
    activeBg: 'bg-[#E4C59E] text-[#1A150E]',
    mobileActive: 'bg-[#E4C59E]/15 text-[#E4C59E]',
  },
  {
    id: 'cortes',
    label: 'Quincena',
    icon: CalendarCheck,
    color: '#9DBAD8',
    activeBg: 'bg-[#9DBAD8] text-[#0E151E]',
    mobileActive: 'bg-[#9DBAD8]/15 text-[#9DBAD8]',
  },
  {
    id: 'vales',
    label: 'Vales',
    icon: ArrowDownCircle,
    color: '#E09F95',
    activeBg: 'bg-[#E09F95] text-[#1E0F0E]',
    mobileActive: 'bg-[#E09F95]/15 text-[#E09F95]',
  },
];

export function DesktopNav({ activeTab, onChange, hasCorteAlert }) {
  return (
    <nav aria-label="Navegación principal" className="hidden sm:flex sm:items-center sm:gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition active:scale-95 ${
              active
                ? `${tab.activeBg} shadow-sm`
                : 'border border-[#26241D] bg-[#161511] text-[#A59F91] hover:border-[#E4C59E]/40 hover:text-[#FFFBF4]'
            }`}
          >
            <Icon
              className="h-4 w-4"
              style={{ color: active ? 'currentColor' : tab.color }}
              aria-hidden="true"
            />
            {tab.label}
            {tab.id === 'cortes' && hasCorteAlert && (
              <span
                aria-label="Corte pendiente"
                className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#11120D]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileNav({ activeTab, onChange, hasCorteAlert }) {
  return (
    <nav
      aria-label="Navegación móvil"
      className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-[#26241D] bg-[#14130F]/95 backdrop-blur-lg px-2 pt-2 sm:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(tab.id)}
              className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl py-2 transition active:scale-95 ${
                active
                  ? tab.mobileActive
                  : 'text-[#8E897C] hover:text-[#FFFBF4]'
              }`}
            >
              <div className="relative">
                <Icon
                  className="h-6 w-6"
                  style={{ color: active ? 'currentColor' : `${tab.color}B3` }}
                  aria-hidden="true"
                />
                {tab.id === 'cortes' && hasCorteAlert && (
                  <span
                    aria-label="Corte pendiente"
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#14130F]"
                  />
                )}
              </div>
              <span className="text-[11px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
