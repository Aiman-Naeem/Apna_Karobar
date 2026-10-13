import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { useLang } from './context/LanguageContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import MyStore from './pages/MyStore.jsx'
import Browse from './pages/Browse.jsx'
import Orders from './pages/Orders.jsx'
import Kameti from './pages/Kameti.jsx'
import Advisor from './pages/Advisor.jsx'

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
        <Route path="/my-store" element={<MyStore />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/browse/:storefrontId" element={<Browse />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/kameti" element={<Kameti />} />
        <Route path="/kameti/:committeeId" element={<Kameti />} />
        <Route path="/advisor" element={<Advisor />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
