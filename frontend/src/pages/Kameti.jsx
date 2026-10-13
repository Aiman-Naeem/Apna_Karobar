import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Check, ChevronRight, CircleDollarSign, Copy, HandCoins, Plus, ShieldCheck, Users } from 'lucide-react'
import { api } from '../api/client.js'
import { useLang } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { EmptyState, ErrorMessage, formatMoney, LoadingState, recordId, ScreenTitle } from '../components/Screen.jsx'

const fieldClass = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100'

export default function Kameti() {
  const { committeeId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLang()
  const { user, setUser } = useAuth()
  const [committees, setCommittees] = useState([])
  const [committee, setCommittee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', nameUr: '', monthlyAmount: '', totalMembers: '6', duration: '6' })
  const [inviteCode, setInviteCode] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (committeeId) {
        const result = await api.getCommittee(committeeId)
        setCommittee(result)
      } else {
        const result = await api.getCommittees()
        setCommittees(Array.isArray(result) ? result : [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [committeeId])

  useEffect(() => { load() }, [load])

  const createCommittee = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const amount = Number(createForm.monthlyAmount)
    const members = Number(createForm.totalMembers)
    const duration = Number(createForm.duration)
    if (!createForm.name.trim() || !Number.isFinite(amount) || amount < 100 || members < 2 || members > 50 || duration < 1) {
      setError(t('kameti.invalidForm'))
      return
    }
    setBusy(true)
    try {
      const created = await api.createCommittee({
        name: createForm.name.trim(),
        nameUr: createForm.nameUr.trim() || createForm.name.trim(),
        monthlyAmount: amount,
        totalMembers: members,
        duration,
        language: lang,
      })
      navigate(`/kameti/${recordId(created)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const joinCommittee = async (event) => {
    event.preventDefault()
    if (!inviteCode.trim()) return
    setBusy(true)
    setError('')
    try {
      const joined = await api.joinCommittee(inviteCode.trim())
      navigate(`/kameti/${recordId(joined)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const payContribution = async (month) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await api.payCommitteeContribution(committeeId, month)
      setNotice(`${t('kameti.paymentRecorded')} ${t('kameti.trustScore')}: ${result.trustScore}/100`)
      setUser((previous) => previous ? { ...previous, trustScore: result.trustScore } : previous)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(committee.inviteCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      setError(`${t('kameti.copyFailed')}: ${err.message}`)
    }
  }

  if (loading) return <LoadingState label={t('common.loading')} />

  if (committeeId) {
    if (error && !committee) {
      return <><Link to="/kameti" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700"><ArrowLeft size={16} />{t('kameti.back')}</Link><ErrorMessage>{error}</ErrorMessage></>
    }
    if (!committee) return null

    const payments = committee.userPayments || []
    const paidCount = payments.filter((payment) => payment.status === 'paid').length
    const nextPayment = payments.find((payment) => payment.status !== 'paid')
    const members = committee.members || []
    const progress = committee.totalMembers ? Math.min(100, (members.length / committee.totalMembers) * 100) : 0
    const currentUserId = user?.id || user?._id

    return (
      <div className="space-y-5">
        <Link to="/kameti" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft size={16} />{t('kameti.back')}</Link>
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-teal-600 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-teal-100">{t('kameti.groupSavings')}</p>
              <h1 className="mt-1 text-3xl font-bold">{lang === 'ur' ? committee.nameUr || committee.name : committee.name}</h1>
              <p className="mt-2 text-teal-50">{t('kameti.createdBy')} {committee.createdBy?.name || t('kameti.groupAdmin')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-xs text-teal-100">{t('kameti.inviteCode')}</p>
              <button onClick={copyInviteCode} className="mt-1 flex items-center gap-2 text-lg font-bold tracking-[0.18em]" aria-label={t('kameti.copyInvite')}>
                {committee.inviteCode} {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <p className="text-[11px] text-teal-100">{copied ? t('kameti.copied') : t('kameti.shareCode')}</p>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={CircleDollarSign} label={t('kameti.monthlyContribution')} value={formatMoney(committee.monthlyAmount)} />
            <SummaryTile icon={Users} label={t('kameti.members')} value={`${members.length} / ${committee.totalMembers}`} />
            <SummaryTile icon={CalendarDays} label={t('kameti.duration')} value={`${committee.duration} ${t('kameti.months')}`} />
          </div>
        </section>

        <ErrorMessage>{error}</ErrorMessage>
        {notice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{t('kameti.yourProgress')}</h2>
                <p className="mt-1 text-sm text-stone-500">{t('kameti.contributionsPaid', { paidCount, duration: committee.duration })}</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><HandCoins size={22} /></span>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${committee.duration ? Math.min(100, paidCount / committee.duration * 100) : 0}%` }} />
            </div>
            <div className="mt-5 space-y-3">
              {payments.length ? payments.map((payment) => {
                const isPaid = payment.status === 'paid'
                const isNext = nextPayment && payment.month === nextPayment.month
                return (
                  <div key={payment.month} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-white text-stone-500'}`}>
                        {isPaid ? <Check size={18} /> : <span className="text-sm font-bold">{payment.month}</span>}
                      </span>
                      <div>
                        <p className="font-semibold">{t('kameti.month')} {payment.month}</p>
                        <p className="text-xs text-stone-500">{formatMoney(payment.amount)} · {isPaid ? t('kameti.paid') : t('kameti.due')} {payment.dueDate ? `· ${new Date(payment.dueDate).toLocaleDateString()}` : ''}</p>
                      </div>
                    </div>
                    {isNext && !isPaid && (
                      <button disabled={busy} onClick={() => payContribution(payment.month)} className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                        {busy ? t('kameti.recording') : t('kameti.recordPayment')}
                      </button>
                    )}
                  </div>
                )
              }) : <p className="text-sm text-stone-500">{t('kameti.noPayments')}</p>}
            </div>
            <p className="mt-4 text-xs text-stone-500">{t('kameti.paymentDisclaimer')}</p>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-bold">{t('kameti.memberCircle')}</h2>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-accent-500" style={{ width: `${progress}%` }} /></div>
              <p className="mt-2 text-xs text-stone-500">{t('kameti.membersJoined', { count: members.length, total: committee.totalMembers })}</p>
              <div className="mt-4 space-y-3">
                {members.map((member, index) => {
                  const memberId = recordId(member)
                  return (
                    <div key={memberId || index} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-800">{(member.name || '?').slice(0, 1)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{member.name || t('kameti.member')}</p>
                          <p className="text-xs text-stone-500">{memberId === currentUserId ? t('kameti.you') : member.phone || t('kameti.member')}</p>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"><ShieldCheck size={13} />{member.trustScore ?? 50}</span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-800">{t('kameti.trustHint')}</p>
            </section>
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-2"><CalendarDays size={18} className="text-brand-700" /><h2 className="font-bold">{t('kameti.nextPayout')}</h2></div>
              <p className="mt-2 text-sm text-stone-600">{committee.nextPayoutDate ? new Date(committee.nextPayoutDate).toLocaleDateString() : t('kameti.payoutNotScheduled')}</p>
              <p className="mt-1 text-xs text-stone-500">{t('kameti.payoutDisclaimer')}</p>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ScreenTitle
        eyebrow={t('kameti.eyebrow')}
        title={t('kameti.title')}
        description={t('kameti.description')}
        action={<button onClick={() => { setShowCreate((value) => !value); setShowJoin(false) }} className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"><Plus size={18} />{t('kameti.create')}</button>}
      />
      <ErrorMessage>{error}</ErrorMessage>
      {showCreate && (
        <form onSubmit={createCommittee} className="mb-5 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-bold">{t('kameti.createTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">{t('kameti.groupName')}<input required className={`${fieldClass} mt-1.5 font-normal`} value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} maxLength={60} /></label>
            <label className="text-sm font-semibold">{t('kameti.groupNameUr')}<input dir="rtl" className={`${fieldClass} mt-1.5 font-normal`} value={createForm.nameUr} onChange={(event) => setCreateForm({ ...createForm, nameUr: event.target.value })} maxLength={60} /></label>
            <label className="text-sm font-semibold">{t('kameti.monthlyContribution')}<input required type="number" min="100" className={`${fieldClass} ltr-field mt-1.5 font-normal`} value={createForm.monthlyAmount} onChange={(event) => setCreateForm({ ...createForm, monthlyAmount: event.target.value })} /></label>
            <label className="text-sm font-semibold">{t('kameti.totalMembers')}<input required type="number" min="2" max="50" className={`${fieldClass} ltr-field mt-1.5 font-normal`} value={createForm.totalMembers} onChange={(event) => setCreateForm({ ...createForm, totalMembers: event.target.value, duration: event.target.value })} /></label>
            <label className="text-sm font-semibold">{t('kameti.durationMonths')}<input required type="number" min="1" max="60" className={`${fieldClass} ltr-field mt-1.5 font-normal`} value={createForm.duration} onChange={(event) => setCreateForm({ ...createForm, duration: event.target.value })} /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={busy} className="rounded-xl bg-brand-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{busy ? t('kameti.creating') : t('kameti.createGroup')}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-stone-300 px-5 py-2.5 font-semibold text-stone-700">{t('common.cancel')}</button>
          </div>
        </form>
      )}
      {showJoin && (
        <form onSubmit={joinCommittee} className="mb-5 flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-semibold">{t('kameti.enterInvite')}<input required className={`${fieldClass} ltr-field mt-1.5 uppercase font-normal tracking-[0.16em]`} maxLength={8} value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="AB12CD34" /></label>
          <button disabled={busy} className="rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{busy ? t('kameti.joining') : t('kameti.join')}</button>
        </form>
      )}
      {notice && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {committees.length === 0 ? (
        <EmptyState icon={Users} title={t('kameti.noGroups')} description={t('kameti.noGroupsDesc')} action={
          <button onClick={() => { setShowJoin(true); setShowCreate(false) }} className="rounded-xl border border-brand-700 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">{t('kameti.joinWithCode')}</button>
        } />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{t('kameti.yourGroups')}</h2>
            <button onClick={() => { setShowJoin((value) => !value); setShowCreate(false) }} className="text-sm font-semibold text-brand-700 hover:underline">{t('kameti.joinWithCode')}</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {committees.map((item) => (
              <Link key={recordId(item)} to={`/kameti/${recordId(item)}`} className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><HandCoins size={23} /></span>
                    <div className="min-w-0"><h3 className="truncate font-bold">{lang === 'ur' ? item.nameUr || item.name : item.name}</h3><p className="mt-0.5 text-xs text-stone-500">{item.createdBy?.name || t('kameti.groupAdmin')}</p></div>
                  </div>
                  <ChevronRight className="mt-1 shrink-0 text-stone-400 transition group-hover:translate-x-1 group-hover:text-brand-700 rtl:rotate-180" size={20} />
                </div>
                <div className="mt-5 flex flex-wrap gap-4 text-sm">
                  <span><b>{formatMoney(item.monthlyAmount)}</b> <span className="text-stone-500">{t('kameti.perMonth')}</span></span>
                  <span className="text-stone-500">{item.members?.length || 0}/{item.totalMembers} {t('kameti.members')}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value }) {
  return <div className="rounded-2xl bg-white/10 p-4 backdrop-blur"><div className="flex items-center gap-2 text-sm text-teal-50"><Icon size={17} />{label}</div><p className="mt-2 text-xl font-bold">{value}</p></div>
}
