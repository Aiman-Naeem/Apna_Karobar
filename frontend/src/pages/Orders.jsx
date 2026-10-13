import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, PackageCheck, Store, Volume2 } from 'lucide-react'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { EmptyState, ErrorMessage, formatMoney, LoadingState, recordId, ScreenTitle } from '../components/Screen.jsx'

const sellerNextStatus = { pending: 'confirmed', confirmed: 'out_for_delivery', out_for_delivery: 'delivered' }
const statusKeys = { pending: 'orders.pending', confirmed: 'orders.confirmed', out_for_delivery: 'orders.outForDelivery', delivered: 'orders.delivered', cancelled: 'orders.cancelled' }

export default function Orders() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [customerOrders, setCustomerOrders] = useState([])
  const [sellerOrders, setSellerOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const jobs = [api.getMyOrders()]
      if (recordId(user?.storefront)) jobs.push(api.getStorefrontOrders(recordId(user.storefront)))
      const results = await Promise.all(jobs)
      setCustomerOrders(Array.isArray(results[0]) ? results[0] : [])
      setSellerOrders(Array.isArray(results[1]) ? results[1] : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.storefront])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    setBusyId(id)
    setError('')
    try {
      await api.updateOrderStatus(id, status)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  const speak = () => {
    if (!('speechSynthesis' in window)) {
      setError(t('common.ttsUnavailable'))
      return
    }
    const orderSummary = [...customerOrders, ...sellerOrders]
      .map((order) => `${t('orders.order')}: ${t(statusKeys[order.status] || 'orders.pending')}, ${formatMoney(order.totalAmount)}`)
      .join('. ')
    const utterance = new SpeechSynthesisUtterance(orderSummary || t('orders.noOrders'))
    utterance.lang = lang === 'ur' ? 'ur-PK' : 'en-PK'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  if (loading) return <LoadingState label={t('common.loading')} />

  return (
    <div>
      <ScreenTitle eyebrow={t('orders.eyebrow')} title={t('orders.title')} description={t('orders.description')} action={<button onClick={speak} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"><Volume2 size={17} />{t('common.listen')}</button>} />
      <ErrorMessage>{error}</ErrorMessage>
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><ClipboardList size={20} className="text-brand-700" />{t('orders.myOrders')}</h2>
        {customerOrders.length ? <div className="grid gap-3 lg:grid-cols-2">{customerOrders.map((order) => <OrderCard key={recordId(order)} order={order} t={t} lang={lang} />)}</div> :
          <EmptyState icon={ClipboardList} title={t('orders.noOrders')} description={t('orders.noOrdersDesc')} />}
      </section>
      {recordId(user?.storefront) && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Store size={20} className="text-brand-700" />{t('orders.storeOrders')}</h2>
          {sellerOrders.length ? <div className="grid gap-3 lg:grid-cols-2">{sellerOrders.map((order) => {
            const id = recordId(order)
            const next = sellerNextStatus[order.status]
            return <OrderCard key={id} order={order} t={t} lang={lang} extra={(
              next && <button disabled={busyId === id} onClick={() => updateStatus(id, next)} className="mt-3 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{busyId === id ? t('common.saving') : `${t('orders.markAs')} ${t(statusKeys[next])}`}</button>
            )} />
          })}</div> : <EmptyState icon={PackageCheck} title={t('orders.noStoreOrders')} description={t('orders.noStoreOrdersDesc')} />}
        </section>
      )}
    </div>
  )
}

function OrderCard({ order, t, lang, extra }) {
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-bold">{lang === 'ur' ? order.storefront?.nameUr || order.storefront?.name || t('orders.order') : order.storefront?.name || t('orders.order')}</p><p className="mt-0.5 text-xs text-stone-500">{t('orders.placedOn')} {createdAt} · {t('orders.customer')} {order.customer?.name || t('orders.you')}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.status === 'delivered' ? 'bg-green-50 text-green-700' : order.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{t(statusKeys[order.status] || 'orders.pending')}</span>
      </div>
      <div className="mt-3 space-y-1 border-t border-stone-100 pt-3">
        {(order.items || []).map((item, index) => <div key={`${item.product}-${index}`} className="flex justify-between gap-3 text-sm"><span>{item.name} × {item.quantity}</span><span>{formatMoney(item.price * item.quantity)}</span></div>)}
      </div>
      <div className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-sm font-bold"><span>{t('orders.total')}</span><span>{formatMoney(order.totalAmount)}</span></div>
      {order.deliveryAddress && <p className="mt-2 text-xs text-stone-500">{t('orders.deliveryTo')}: {order.deliveryAddress}</p>}
      {extra}
    </article>
  )
}
