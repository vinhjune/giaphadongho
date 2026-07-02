import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AppNav({ familyName }: { familyName?: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-stone-800 text-lg hover:text-amber-700 transition-colors">
        {familyName ?? 'Gia Phả Dòng Họ'}
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <span className="text-stone-600">Xin chào, <strong>{user.username}</strong></span>
            {user.role === 'editor' && (
              <>
                <Link to="/editor"  className="text-amber-700 hover:underline">Thành viên</Link>
                <Link to="/content" className="text-amber-700 hover:underline">Nội dung</Link>
              </>
            )}
            <button onClick={handleLogout} className="text-stone-500 hover:text-stone-800 transition-colors">
              Đăng xuất
            </button>
          </>
        ) : (
          <Link to="/login" className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  )
}
