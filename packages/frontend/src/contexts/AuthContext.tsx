import { createContext, useContext, useState, type ReactNode } from 'react'

const TOKEN_KEY = 'giapha_auth_token'
const USER_KEY  = 'giapha_auth_user'

export type UserInfo = { username: string; role: 'editor' | 'viewer'; personId: string | null }

type AuthContextValue = {
  token: string | null
  user: UserInfo | null
  login: (token: string, user: UserInfo) => void
  updateUser: (patch: Partial<UserInfo> & { token?: string }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<UserInfo | null>(() => {
    const raw = sessionStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  })

  function login(newToken: string, newUser: UserInfo) {
    sessionStorage.setItem(TOKEN_KEY, newToken)
    sessionStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  function updateUser(patch: Partial<UserInfo> & { token?: string }) {
    const { token: newToken, ...userPatch } = patch
    if (newToken) {
      sessionStorage.setItem(TOKEN_KEY, newToken)
      setToken(newToken)
    }
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...userPatch }
      sessionStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }

  async function logout() {
    if (token) {
      // Best-effort revoke session on server
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ token, user, login, updateUser, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
