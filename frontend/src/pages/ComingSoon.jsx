import { Construction } from 'lucide-react'
import { useLang } from '../context/LanguageContext.jsx'

export default function ComingSoon() {
  const { t } = useLang()
  return (
    <div className="grid place-items-center py-24 text-center text-stone-500">
      <Construction size={48} className="mb-3 text-accent-500" />
      <p className="text-lg">{t('common.comingSoon')}</p>
    </div>
  )
}
