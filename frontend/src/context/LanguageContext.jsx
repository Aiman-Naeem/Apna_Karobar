import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translations } from '../i18n/translations.js'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  // 'en' | 'ur' — remembered between visits
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'ur')

  // Keep <html lang dir> in sync so layout flips to RTL for Urdu
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr'
    localStorage.setItem('lang', lang)
  }, [lang])

  const setLang = useCallback((l) => setLangState(l === 'ur' ? 'ur' : 'en'), [])

  // t('login.title') -> walks the translations object, falls back to English
  const t = useCallback(
    (path, values) => {
      const find = (obj) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)
      const value = find(translations[lang]) ?? find(translations.en) ?? path
      if (typeof value !== 'string' || !values) return value
      return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
    },
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL: lang === 'ur' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
