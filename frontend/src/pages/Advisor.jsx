import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Lightbulb, MessageCircle, Plus, Send, Sparkles } from 'lucide-react'
import { api } from '../api/client.js'
import { useLang } from '../context/LanguageContext.jsx'
import { ErrorMessage, formatMoney, LoadingState, ScreenTitle } from '../components/Screen.jsx'

const chatSessionKey = 'apna-karobar-chat-session'
const newSessionId = () => globalThis.crypto?.randomUUID?.() || `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`
const categories = ['tailoring', 'food', 'crafts', 'tutoring', 'other']

export default function Advisor() {
  const { t, lang } = useLang()
  const [sessionId, setSessionId] = useState(() => {
    const current = localStorage.getItem(chatSessionKey)
    if (current) return current
    const created = newSessionId()
    localStorage.setItem(chatSessionKey, created)
    return created
  })
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [chatLoading, setChatLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('tailoring')
  const [region, setRegion] = useState('')
  const [insights, setInsights] = useState(null)
  const [insightsBusy, setInsightsBusy] = useState(false)
  const bottomRef = useRef(null)

  const loadHistory = useCallback(async () => {
    setChatLoading(true)
    setError('')
    try {
      const history = await api.getChatHistory(sessionId)
      setMessages(Array.isArray(history) ? history : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setChatLoading(false)
    }
  }, [sessionId])

  useEffect(() => { loadHistory() }, [loadHistory])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const sendMessage = async (event) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || sending) return
    setDraft('')
    setError('')
    const optimistic = { _id: `${Date.now()}`, role: 'user', message }
    setMessages((current) => [...current, optimistic])
    setSending(true)
    try {
      const result = await api.sendChatMessage(message, sessionId)
      setMessages((current) => [...current, { _id: `${Date.now()}-reply`, role: 'assistant', message: result.reply }])
    } catch (err) {
      setError(err.message)
      setMessages((current) => current.filter((item) => item._id !== optimistic._id))
      setDraft(message)
    } finally {
      setSending(false)
    }
  }

  const startNewChat = () => {
    const nextId = newSessionId()
    localStorage.setItem(chatSessionKey, nextId)
    setSessionId(nextId)
    setMessages([])
    setError('')
  }

  const fetchInsights = async (event) => {
    event.preventDefault()
    setInsightsBusy(true)
    setError('')
    setInsights(null)
    try {
      setInsights(await api.getMarketInsights(category, region.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setInsightsBusy(false)
    }
  }

  return (
    <div>
      <ScreenTitle eyebrow={t('advisor.eyebrow')} title={t('advisor.title')} description={t('advisor.description')} />
      <ErrorMessage>{error}</ErrorMessage>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 p-4 md:p-5">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Bot size={22} /></span><div><h2 className="font-bold">{t('advisor.chatTitle')}</h2><p className="text-xs text-stone-500">{t('advisor.chatSubtitle')}</p></div></div>
            <button onClick={startNewChat} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold hover:bg-stone-50"><Plus size={15} />{t('advisor.newChat')}</button>
          </div>
          <div className="flex h-[390px] flex-col gap-3 overflow-y-auto bg-stone-50/60 p-4 md:h-[470px] md:p-5">
            {chatLoading ? <LoadingState label={t('common.loading')} /> : messages.length === 0 ? (
              <div className="m-auto max-w-sm text-center"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Sparkles size={24} /></span><p className="font-semibold">{t('advisor.welcome')}</p><p className="mt-1 text-sm text-stone-500">{t('advisor.welcomeDesc')}</p></div>
            ) : messages.map((message, index) => (
              <div key={message._id || `${message.role}-${index}`} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'self-end rounded-ee-sm bg-brand-700 text-white' : 'self-start rounded-es-sm border border-stone-200 bg-white text-stone-800'}`}>{message.message}</div>
            ))}
            {sending && <div className="self-start rounded-2xl rounded-es-sm border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">{t('advisor.thinking')}</div>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-stone-100 p-3 md:p-4">
            <label className="sr-only" htmlFor="advisor-message">{t('advisor.messagePlaceholder')}</label>
            <input id="advisor-message" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder={t('advisor.messagePlaceholder')} />
            <button aria-label={t('advisor.send')} disabled={sending || !draft.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50"><Send size={18} className="rtl:rotate-180" /></button>
          </form>
        </section>

        <section className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Lightbulb size={22} /></span><div><h2 className="font-bold">{t('advisor.insightsTitle')}</h2><p className="text-xs text-stone-500">{t('advisor.insightsDesc')}</p></div></div>
          <form onSubmit={fetchInsights} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold">{t('store.category')}<select className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-600" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item} value={item}>{t(`categories.${item}`)}</option>)}</select></label>
            <label className="block text-sm font-semibold">{t('advisor.region')}<input className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm outline-none focus:border-brand-600" value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t('advisor.regionPlaceholder')} /></label>
            <button disabled={insightsBusy} className="w-full rounded-xl border border-brand-700 py-3 font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60">{insightsBusy ? t('advisor.loadingInsights') : t('advisor.getInsights')}</button>
          </form>
          {insights && (
            <div className="mt-5 space-y-4 rounded-2xl bg-amber-50/70 p-4">
              <div className="flex items-center justify-between gap-2"><h3 className="font-bold">{t(`categories.${insights.category || category}`)}{(insights.region || region) ? ` · ${insights.region || region}` : ''}</h3><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-800">{t('advisor.demand')}: {insights.demandTrend || t('advisor.notAvailable')}</span></div>
              {insights.averagePrice && <div className="grid grid-cols-3 gap-2 text-center">
                <InsightPrice label={t('advisor.low')} amount={insights.averagePrice.min} />
                <InsightPrice label={t('advisor.typical')} amount={insights.averagePrice.typical} />
                <InsightPrice label={t('advisor.high')} amount={insights.averagePrice.max} />
              </div>}
              {Array.isArray(insights.topSellingItems) && insights.topSellingItems.length > 0 && <div><p className="text-xs font-bold uppercase text-stone-500">{t('advisor.popularItems')}</p><div className="mt-2 flex flex-wrap gap-2">{insights.topSellingItems.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-700">{item}</span>)}</div></div>}
              {insights.note && <p className="flex items-start gap-2 text-sm leading-relaxed text-stone-700"><MessageCircle size={17} className="mt-0.5 shrink-0 text-amber-700" />{insights.note}</p>}
              <p className="text-[11px] text-stone-400">{lang === 'ur' ? t('advisor.insightsDisclaimerUr') : t('advisor.insightsDisclaimer')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function InsightPrice({ label, amount }) {
  return <div className="rounded-xl bg-white p-2"><p className="text-[11px] text-stone-500">{label}</p><p className="mt-1 text-xs font-bold">{amount == null ? '—' : formatMoney(amount)}</p></div>
}
