import { NavLink, Outlet, Link } from 'react-router-dom'
import { Home, Store, ClipboardList, PiggyBank, Bot, LogOut } from 'lucide-react'
import { useLang } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageToggle from './LanguageToggle.jsx'

const links = [
  { to: '/', key: 'nav.home', icon: Home, end: true },
  { to: '/browse', key: 'nav.browse', icon: Store },
  { to: '/orders', key: 'nav.orders', icon: ClipboardList },
  { to: '/kameti', key: 'nav.kameti', icon: PiggyBank },
  { to: '/advisor', key: 'nav.advisor', icon: Bot },
]

export default function Layout() {
  const { t } = useLang()
  const { logout } = useAuth()

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Top bar (always) */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white">
              <Store size={20} />
            </span>
            {t('appName')}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(({ to, key, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100'
                  }`
                }
              >
                <Icon size={18} /> {t(key)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={logout}
              className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              aria-label={t('common.logout')}
              title={t('common.logout')}
            >
              <LogOut size={18} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white md:hidden">
        {links.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-brand-700' : 'text-stone-500'
              }`
            }
          >
            <Icon size={22} />
            {t(key)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
