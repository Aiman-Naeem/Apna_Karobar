import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Search, ShoppingBag, Store, Volume2 } from 'lucide-react'
import { api, imageUrl } from '../api/client.js'
import { useLang } from '../context/LanguageContext.jsx'
import { EmptyState, ErrorMessage, formatMoney, ImageWithPlaceholder, LoadingState, recordId, ScreenTitle } from '../components/Screen.jsx'

const categories = ['tailoring', 'food', 'crafts', 'tutoring', 'other']
const fieldClass = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100'

export default function Browse() {
  const { storefrontId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLang()
  const [storefronts, setStorefronts] = useState([])
  const [storefront, setStorefront] = useState(null)
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantities, setQuantities] = useState({})
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (storefrontId) {
        const [store, items] = await Promise.all([api.getStorefront(storefrontId), api.getProducts(storefrontId)])
        setStorefront(store)
        setProducts(Array.isArray(items) ? items : [])
      } else {
        const params = {}
        if (search.trim()) params.search = search.trim()
        if (category) params.category = category
        const results = await api.getStorefronts(params)
        setStorefronts(Array.isArray(results) ? results : [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [storefrontId, search, category])

  useEffect(() => {
    const timeout = window.setTimeout(load, storefrontId ? 0 : 250)
    return () => window.clearTimeout(timeout)
  }, [load, storefrontId])

  const placeOrder = async (event) => {
    event.preventDefault()
    const items = products.filter((product) => Number(quantities[recordId(product)]) > 0)
      .map((product) => ({ product: recordId(product), quantity: Number(quantities[recordId(product)]) }))
    if (!items.length) {
      setError(t('browse.selectProduct'))
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const order = await api.placeOrder({ storefront: storefrontId, items, deliveryAddress: address.trim() })
      setNotice(`${t('browse.orderPlaced')} ${formatMoney(order.totalAmount)}`)
      setQuantities({})
      setAddress('')
      window.setTimeout(() => navigate('/orders'), 1300)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const speak = (text) => {
    if (!('speechSynthesis' in window)) {
      setError(t('common.ttsUnavailable'))
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'ur' ? 'ur-PK' : 'en-PK'
    window.speechSynthesis.speak(utterance)
  }

  if (loading) return <LoadingState label={t('common.loading')} />

  if (storefrontId) {
    const total = products.reduce((sum, product) => sum + product.price * (Number(quantities[recordId(product)]) || 0), 0)
    return (
      <div className="space-y-5">
        <Link to="/browse" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft size={16} />{t('browse.backToShops')}</Link>
        <ErrorMessage>{error}</ErrorMessage>
        {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        {storefront && (
          <>
            <section className="relative overflow-hidden rounded-3xl bg-brand-800 text-white">
              <img src={imageUrl.storefrontCover(recordId(storefront))} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <div className="relative p-6 md:p-9">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{t(`categories.${storefront.category}`)}</span>
                <h1 className="mt-3 text-3xl font-bold">{lang === 'ur' ? storefront.nameUr || storefront.name : storefront.name}</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/85">{lang === 'ur' ? storefront.descriptionUr || storefront.description : storefront.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/85">
                  {(storefront.location?.city || storefront.location?.area) && <span className="flex items-center gap-1"><MapPin size={15} />{[storefront.location.area, storefront.location.city].filter(Boolean).join(', ')}</span>}
                  {storefront.owner?.name && <span>{t('browse.owner')}: {storefront.owner.name}</span>}
                  <button onClick={() => speak(`${storefront.name}. ${storefront.description || ''}`)} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><Volume2 size={15} />{t('common.listen')}</button>
                </div>
              </div>
            </section>
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">{t('browse.products')}</h2>
                  <button onClick={() => speak(products.map((product) => `${lang === 'ur' ? product.nameUr || product.name : product.name}, ${formatMoney(product.price)}`).join('. '))} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"><Volume2 size={15} />{t('common.listen')}</button>
                </div>
                {products.length ? <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((product) => (
                    <article key={recordId(product)} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                      <div className="h-40"><ImageWithPlaceholder src={imageUrl.product(recordId(product))} icon={ShoppingBag} /></div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2"><h3 className="font-bold">{lang === 'ur' ? product.nameUr || product.name : product.name}</h3><span className="shrink-0 font-bold text-brand-800">{formatMoney(product.price)}</span></div>
                        {(lang === 'ur' ? product.descriptionUr || product.description : product.description) && <p className="mt-1 text-sm text-stone-500">{lang === 'ur' ? product.descriptionUr || product.description : product.description}</p>}
                        <p className="mt-1 text-xs text-stone-400">{t('store.per')} {product.unit}</p>
                        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">{t('browse.quantity')}
                          <input type="number" min="0" max={product.stock ?? undefined} className={`${fieldClass} ltr-field max-w-24 py-2`} value={quantities[recordId(product)] || ''} onChange={(e) => setQuantities({ ...quantities, [recordId(product)]: e.target.value })} />
                        </label>
                      </div>
                    </article>
                  ))}
                </div> : <EmptyState icon={ShoppingBag} title={t('browse.noProducts')} description={t('browse.noProductsDesc')} />}
              </section>
              <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                <h2 className="text-lg font-bold">{t('browse.checkout')}</h2>
                <p className="mt-1 text-sm text-stone-500">{t('browse.checkoutDesc')}</p>
                <form onSubmit={placeOrder} className="mt-4 space-y-3">
                  <label className="block text-sm font-semibold">{t('browse.deliveryAddress')}<textarea rows="3" className={`${fieldClass} mt-1.5 font-normal`} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
                  <div className="flex justify-between border-t border-stone-100 pt-3 font-bold"><span>{t('browse.total')}</span><span>{formatMoney(total)}</span></div>
                  <button disabled={busy || total <= 0} className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? t('browse.placingOrder') : t('browse.placeOrder')}</button>
                </form>
              </aside>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <ScreenTitle eyebrow={t('browse.eyebrow')} title={t('browse.title')} description={t('browse.description')} />
      <ErrorMessage>{error}</ErrorMessage>
      <div className="mb-5 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_220px]">
        <label className="relative"><Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className={`${fieldClass} ps-10`} placeholder={t('browse.searchPlaceholder')} /></label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}><option value="">{t('browse.allCategories')}</option>{categories.map((item) => <option key={item} value={item}>{t(`categories.${item}`)}</option>)}</select>
      </div>
      {!storefronts.length ? <EmptyState icon={Store} title={t('browse.noShops')} description={t('browse.noShopsDesc')} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {storefronts.map((store) => (
            <Link key={recordId(store)} to={`/browse/${recordId(store)}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-40 bg-gradient-to-br from-brand-800 to-teal-500"><img src={imageUrl.storefrontCover(recordId(store))} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /><span className="absolute bottom-3 start-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-800">{t(`categories.${store.category}`)}</span></div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2"><h2 className="font-bold group-hover:text-brand-700">{lang === 'ur' ? store.nameUr || store.name : store.name}</h2><span className="text-sm text-amber-600">★ {store.rating?.average ? Number(store.rating.average).toFixed(1) : t('browse.new')}</span></div>
                <p className="mt-1 line-clamp-2 text-sm text-stone-500">{lang === 'ur' ? store.descriptionUr || store.description : store.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                  <span className="flex items-center gap-1"><MapPin size={13} />{[store.location?.area, store.location?.city].filter(Boolean).join(', ') || t('browse.locationNotSet')}</span>
                  <span>{store.owner?.name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
