import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** If specified, also checks that the user has this role (or higher). */
  role?: 'viewer' | 'editor'
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role === 'editor' && user.role !== 'editor') return <Navigate to="/" replace />
  return <>{children}</>
}
