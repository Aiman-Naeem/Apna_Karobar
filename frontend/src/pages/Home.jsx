import { Link } from 'react-router-dom'
import { Store, Search, PiggyBank, Bot } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'

export default function Home() {
  const { user } = useAuth()
  const { t } = useLang()

  const cards = [
    { to: '/my-store', icon: Store, title: 'home.myStore', desc: 'home.myStoreDesc', tint: 'bg-brand-50 text-brand-700' },
    { to: '/browse', icon: Search, title: 'home.browse', desc: 'home.browseDesc', tint: 'bg-sky-50 text-sky-700' },
    { to: '/kameti', icon: PiggyBank, title: 'home.kameti', desc: 'home.kametiDesc', tint: 'bg-amber-50 text-amber-700' },
    { to: '/advisor', icon: Bot, title: 'home.advisor', desc: 'home.advisorDesc', tint: 'bg-violet-50 text-violet-700' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold md:text-3xl">{t('home.hello')}, {user?.name} 👋</h1>
      <p className="mt-1 text-stone-600">{t('home.whatToday')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ to, icon: Icon, title, desc, tint }) => (
          <Link key={to} to={to} className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${tint}`}><Icon size={24} /></span>
            <h2 className="font-semibold">{t(title)}</h2>
            <p className="mt-1 text-sm text-stone-500">{t(desc)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
