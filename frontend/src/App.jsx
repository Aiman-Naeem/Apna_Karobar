import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { useLang } from './context/LanguageContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

function Protected({ children }) {
  const { user, loading } = useAuth()
  const { t } = useLang()
  if (loading) return <div className="grid min-h-screen place-items-center text-stone-500">{t('common.loading')}</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Home />} />
        {/* Placeholders — we build these one by one */}
        <Route path="/my-store" element={<ComingSoon />} />
        <Route path="/browse" element={<ComingSoon />} />
        <Route path="/orders" element={<ComingSoon />} />
        <Route path="/kameti" element={<ComingSoon />} />
        <Route path="/advisor" element={<ComingSoon />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
