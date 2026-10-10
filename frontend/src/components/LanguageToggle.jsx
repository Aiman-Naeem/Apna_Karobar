import { useState } from 'react'
import { useLang } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api/client.js'

export default function LanguageToggle() {
  const { lang, setLang, t } = useLang()
  const { user, setUser } = useAuth()
  const [error, setError] = useState('')

  const choose = async (l) => {
    if (l === lang) return
    setError('')
    setLang(l)
    if (!user) return

    try {
      const response = await api.updateProfile({ language: l })
      if (response.user) setUser(response.user)
    } catch (err) {
      setError(`${t('language.saveError')} (${err.message})`)
    }
  }

  const base = 'px-3 py-1 text-sm font-semibold rounded-full transition-colors'
  const on = 'bg-brand-700 text-white shadow-sm'
  const off = 'text-stone-600 hover:bg-stone-200'

  return (
    <div className="inline-flex flex-col items-start">
      <div dir="ltr" className="inline-flex items-center gap-1 rounded-full bg-stone-100 p-1 ring-1 ring-stone-200" role="group" aria-label="Language">
        <button type="button" onClick={() => choose('en')} className={`${base} ${lang === 'en' ? on : off}`} aria-pressed={lang === 'en'}>
          EN
        </button>
        <button type="button" onClick={() => choose('ur')} className={`${base} ${lang === 'ur' ? on : off}`} aria-pressed={lang === 'ur'}>
          اردو
        </button>
      </div>
      {error && <span role="alert" className="mt-1 max-w-48 text-xs text-red-700">{error}</span>}
    </div>
  )
}
