import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ImagePlus, PackagePlus, Pencil, Plus, Store, Trash2, Volume2 } from 'lucide-react'
import { api, imageUrl } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import { EmptyState, ErrorMessage, formatMoney, ImageWithPlaceholder, LoadingState, recordId, ScreenTitle } from '../components/Screen.jsx'

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100'
const categories = ['tailoring', 'food', 'crafts', 'tutoring', 'other']
const blankProduct = { name: '', nameUr: '', price: '', unit: 'item', stock: '', description: '', descriptionUr: '' }

export default function MyStore() {
  const { user, setUser } = useAuth()
  const { t, lang } = useLang()
  const [storefront, setStorefront] = useState(null)
  const [products, setProducts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [storeForm, setStoreForm] = useState({ name: '', nameUr: '', category: 'other', description: '', descriptionUr: '', city: '', area: '', contactPhone: '' })
  const [coverImage, setCoverImage] = useState(null)
  const [productForm, setProductForm] = useState(blankProduct)
  const [productImage, setProductImage] = useState(null)
  const [editingId, setEditingId] = useState('')

  const storefrontId = recordId(user?.storefront)
  const load = useCallback(async () => {
    if (!storefrontId) {
      setStorefront(null)
      setProducts([])
      setStats(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [store, items, storeStats] = await Promise.all([
        api.getStorefront(storefrontId),
        api.getProducts(storefrontId),
        api.getStorefrontStats(storefrontId),
      ])
      setStorefront(store)
      setProducts(Array.isArray(items) ? items : [])
      setStats(storeStats)
      setStoreForm({
        name: store.name || '', nameUr: store.nameUr || '', category: store.category || 'other',
        description: store.description || '', descriptionUr: store.descriptionUr || '',
        city: store.location?.city || '', area: store.location?.area || '',
        contactPhone: store.contactPhone || '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [storefrontId])

  useEffect(() => { load() }, [load])

  const saveStore = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData()
    Object.entries({
      name: storeForm.name.trim(), nameUr: storeForm.nameUr, category: storeForm.category,
      description: storeForm.description, descriptionUr: storeForm.descriptionUr,
      'location[city]': storeForm.city, 'location[area]': storeForm.area,
      contactPhone: storeForm.contactPhone,
    }).forEach(([key, value]) => form.append(key, value))
    if (coverImage) form.append('coverImage', coverImage)
    try {
      const isCreating = !storefront
      const created = storefront
        ? await api.updateStorefront(recordId(storefront), form)
        : await api.createStorefront(form)
      setStorefront(created)
      setUser((previous) => ({ ...previous, storefront: recordId(created) }))
      if (!isCreating) await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData()
    if (!editingId) form.append('storefront', recordId(storefront))
    Object.entries({
      ...productForm,
      name: productForm.name.trim(),
      price: String(Number(productForm.price)),
    }).forEach(([key, value]) => {
      if (value !== '' || key !== 'stock') form.append(key, value)
    })
    if (productImage) form.append('image', productImage)
    try {
      if (editingId) await api.updateProduct(editingId, form)
      else await api.createProduct(form)
      setProductForm(blankProduct)
      setProductImage(null)
      setEditingId('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const editProduct = (product) => {
    setEditingId(recordId(product))
    setProductForm({
      name: product.name || '', nameUr: product.nameUr || '', price: String(product.price),
      unit: product.unit || 'item', stock: product.stock == null ? '' : String(product.stock),
      description: product.description || '', descriptionUr: product.descriptionUr || '',
    })
    setProductImage(null)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const removeProduct = async (productId) => {
    if (!window.confirm(t('store.confirmDelete'))) return
    setError('')
    try {
      await api.deleteProduct(productId)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const speak = () => {
    if (!('speechSynthesis' in window)) {
      setError(t('common.ttsUnavailable'))
      return
    }
    window.speechSynthesis.cancel()
    const productSummary = products.map((product) =>
      `${lang === 'ur' ? product.nameUr || product.name : product.name}, ${formatMoney(product.price)}`
    ).join('. ')
    const utterance = new SpeechSynthesisUtterance(
      `${storefront?.name || t('store.title')}. ${products.length} ${t('store.productsListed')}. ${productSummary}`
    )
    utterance.lang = lang === 'ur' ? 'ur-PK' : 'en-PK'
    window.speechSynthesis.speak(utterance)
  }

  if (loading) return <LoadingState label={t('common.loading')} />

  return (
    <div className="space-y-5">
      <ScreenTitle
        eyebrow={t('store.eyebrow')}
        title={storefront ? storefront.name : t('store.title')}
        description={storefront ? t('store.dashboardDesc') : t('store.createDesc')}
        action={storefront && <button onClick={speak} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"><Volume2 size={17} />{t('common.listen')}</button>}
      />
      <ErrorMessage>{error}</ErrorMessage>

      {storefront && (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="relative h-44 bg-gradient-to-br from-brand-800 to-teal-500">
            <img src={imageUrl.storefrontCover(recordId(storefront))} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} />
            <span className="absolute bottom-4 start-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-800">{t(`categories.${storefront.category}`)}</span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3 md:p-5">
            <StatCard icon={PackagePlus} label={t('store.productCount')} value={stats?.totalProducts ?? products.length} />
            <StatCard icon={BarChart3} label={t('store.ordersReceived')} value={stats?.totalOrders ?? 0} />
            <StatCard icon={Store} label={t('store.salesValue')} value={formatMoney(stats?.totalRevenue)} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-bold">{storefront ? t('store.editDetails') : t('store.createTitle')}</h2>
        <form onSubmit={saveStore} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">{t('store.name')} *<input className={`${inputClass} mt-1.5 font-normal`} required maxLength={80} value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} /></label>
          <label className="text-sm font-semibold">{t('store.nameUr')}<input dir="rtl" className={`${inputClass} mt-1.5 font-normal`} value={storeForm.nameUr} onChange={(e) => setStoreForm({ ...storeForm, nameUr: e.target.value })} /></label>
          <label className="text-sm font-semibold">{t('store.category')}<select className={`${inputClass} mt-1.5 font-normal`} value={storeForm.category} onChange={(e) => setStoreForm({ ...storeForm, category: e.target.value })}>{categories.map((category) => <option key={category} value={category}>{t(`categories.${category}`)}</option>)}</select></label>
          <label className="text-sm font-semibold">{t('store.phone')}<input className={`${inputClass} ltr-field mt-1.5 font-normal`} type="tel" value={storeForm.contactPhone} onChange={(e) => setStoreForm({ ...storeForm, contactPhone: e.target.value })} /></label>
          <label className="text-sm font-semibold">{t('store.city')}<input className={`${inputClass} mt-1.5 font-normal`} value={storeForm.city} onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })} /></label>
          <label className="text-sm font-semibold">{t('store.area')}<input className={`${inputClass} mt-1.5 font-normal`} value={storeForm.area} onChange={(e) => setStoreForm({ ...storeForm, area: e.target.value })} /></label>
          <label className="text-sm font-semibold sm:col-span-2">{t('store.description')}<textarea rows="3" className={`${inputClass} mt-1.5 font-normal`} value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} /></label>
          <label className="text-sm font-semibold sm:col-span-2">{t('store.descriptionUr')}<textarea dir="rtl" rows="3" className={`${inputClass} mt-1.5 font-normal`} value={storeForm.descriptionUr} onChange={(e) => setStoreForm({ ...storeForm, descriptionUr: e.target.value })} /></label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 p-3 text-sm text-stone-600 sm:col-span-2">
            <ImagePlus size={21} className="text-brand-700" /><span>{coverImage?.name || t('store.coverImage')}<span className="block text-xs text-stone-400">{t('store.imageLimit')}</span></span>
            <input className="sr-only" type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files?.[0] || null)} />
          </label>
          <div className="sm:col-span-2"><button disabled={busy} className="rounded-xl bg-brand-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{busy ? t('common.saving') : storefront ? t('store.saveDetails') : t('store.createStore')}</button></div>
        </form>
      </section>

      {storefront && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">{t('store.products')}</h2><p className="text-sm text-stone-500">{t('store.productsDesc')}</p></div>
            <Link to="/orders" className="text-sm font-semibold text-brand-700 hover:underline">{t('store.manageOrders')} →</Link>
          </div>
          {products.length === 0 ? <EmptyState icon={PackagePlus} title={t('store.noProducts')} description={t('store.noProductsDesc')} /> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article key={recordId(product)} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <div className="h-36"><ImageWithPlaceholder src={imageUrl.product(recordId(product))} icon={PackagePlus} /></div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2"><h3 className="font-bold">{lang === 'ur' ? product.nameUr || product.name : product.name}</h3><span className="shrink-0 text-sm font-bold text-brand-800">{formatMoney(product.price)}</span></div>
                    <p className="mt-1 text-xs text-stone-500">{product.stock == null ? t('store.madeToOrder') : `${t('store.stock')}: ${product.stock}`} · {product.unit}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => editProduct(product)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold hover:bg-stone-50"><Pencil size={14} />{t('common.edit')}</button>
                      <button onClick={() => removeProduct(recordId(product))} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14} />{t('common.delete')}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <section className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold"><Plus size={19} className="text-brand-700" />{editingId ? t('store.editProduct') : t('store.addProduct')}</h3>
            <form onSubmit={saveProduct} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input required aria-label={t('store.productName')} placeholder={`${t('store.productName')} *`} className={inputClass} value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              <input aria-label={t('store.productNameUr')} placeholder={t('store.productNameUr')} className={inputClass} value={productForm.nameUr} onChange={(e) => setProductForm({ ...productForm, nameUr: e.target.value })} />
              <input required type="number" min="0" step="1" aria-label={t('store.price')} placeholder={`${t('store.price')} (Rs.) *`} className={`${inputClass} ltr-field`} value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
              <input aria-label={t('store.unit')} placeholder={t('store.unit')} className={inputClass} value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} />
              <input type="number" min="0" aria-label={t('store.stock')} placeholder={t('store.stockOptional')} className={`${inputClass} ltr-field`} value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
              <label className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-600"><ImagePlus size={17} />{productImage?.name || t('store.productImage')}<input className="sr-only" type="file" accept="image/*" onChange={(e) => setProductImage(e.target.files?.[0] || null)} /></label>
              <textarea rows="2" placeholder={t('store.productDescription')} className={`${inputClass} sm:col-span-2 lg:col-span-3`} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              <textarea dir="rtl" rows="2" placeholder={t('store.productDescriptionUr')} className={`${inputClass} sm:col-span-2 lg:col-span-3`} value={productForm.descriptionUr} onChange={(e) => setProductForm({ ...productForm, descriptionUr: e.target.value })} />
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <button disabled={busy} className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{busy ? t('common.saving') : editingId ? t('store.updateProduct') : t('store.addProduct')}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(''); setProductForm(blankProduct); setProductImage(null) }} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold">{t('common.cancel')}</button>}
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon size={19} /></span><div><p className="text-xs text-stone-500">{label}</p><p className="font-bold">{value}</p></div></div>
}
