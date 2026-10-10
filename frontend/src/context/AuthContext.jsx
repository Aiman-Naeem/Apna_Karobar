import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, getToken, setToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken()) // only "loading" if a token exists

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  // Restore session on refresh
  useEffect(() => {
    if (!getToken()) return
    api.me().then((r) => setUser(r.user)).catch(logout).finally(() => setLoading(false))
  }, [logout])

  // api client fires this on any 401
  useEffect(() => {
    window.addEventListener('auth:logout', logout)
    return () => window.removeEventListener('auth:logout', logout)
  }, [logout])

  const login = (token, userData) => {
    setToken(token)
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
