import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Store, Phone, KeyRound, User } from 'lucide-react'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import LanguageToggle from '../components/LanguageToggle.jsx'

const inputCls =
  'ltr-field w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100'

export default function Login() {
  const { t, setLang } = useLang()
  const { user, login } = useAuth()

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const sendOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^03\d{9}$/.test(phone)) return setError(t('login.invalidPhone'))
    setBusy(true)
    try {
      const res = await api.sendOtp(phone)
      if (res.otp) { setDevOtp(res.otp); setOtp(res.otp) } // dev-only auto-fill
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(otp)) return setError(t('login.invalidOtp'))
    setBusy(true)
    try {
      const res = await api.verifyOtp(phone, otp, name.trim())
      if (res.user?.language) setLang(res.user.language) // use the language saved on their profile
      login(res.token, res.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 to-brand-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-2xl font-bold">
          <Store size={32} /> {t('appName')}
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-snug">{t('tagline')}</h2>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -end-24 h-72 w-72 rounded-full bg-accent-400/30 blur-3xl" />
      </aside>

      <main className="relative flex items-center justify-center px-5 py-10">
        <div className="absolute end-4 top-4"><LanguageToggle /></div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-white shadow-lg">
              <Store size={28} />
            </span>
            <span className="text-xl font-bold text-brand-700">{t('appName')}</span>
          </div>

          <h1 className="text-2xl font-bold">{t('login.welcome')}</h1>

          {step === 'phone' ? (
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              <p className="text-stone-600">{t('login.subtitle')}</p>
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-sm font-medium"><Phone size={16} /> {t('login.phone')}</span>
                <input
                  className={inputCls}
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('login.phonePlaceholder')}
                  autoFocus
                />
              </label>
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60">
                {busy ? t('login.sending') : t('login.sendOtp')}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-4">
              <p className="text-stone-600">
                {t('login.otpSent')} <span dir="ltr" className="font-semibold">{phone}</span>
              </p>
              {devOtp && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t('login.devOtp')} <b dir="ltr">{devOtp}</b>
                </p>
              )}
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-sm font-medium"><KeyRound size={16} /> {t('login.otp')}</span>
                <input
                  className={`${inputCls} tracking-[0.4em] text-center text-xl`}
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-sm font-medium"><User size={16} /> {t('login.name')}</span>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60">
                {busy ? t('login.verifying') : t('login.verify')}
              </button>
              <button type="button" onClick={() => { setStep('phone'); setError('') }} className="w-full text-sm font-medium text-brand-700 hover:underline">
                {t('login.changeNumber')}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
