import { AlertCircle, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

export function ScreenTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-stone-600 md:text-base">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorMessage({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-stone-500" role="status">
      <LoaderCircle size={20} className="animate-spin" />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      {Icon && <Icon size={32} className="mx-auto mb-3 text-brand-700" />}
      <h2 className="font-semibold text-stone-900">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ImageWithPlaceholder({ src, alt = '', icon: Icon }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-stone-100 text-brand-700">
      {!failed && <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />}
      {failed && Icon && <Icon size={28} aria-hidden="true" />}
    </div>
  )
}

export const formatMoney = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

export const recordId = (value) => (typeof value === 'string' ? value : value?._id || value?.id || '')
