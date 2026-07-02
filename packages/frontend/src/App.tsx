import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'

// Phase stubs — replaced as phases are implemented
const Stub = ({ label }: { label: string }) => <div className="p-8 text-center text-stone-600">{label}</div>

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"       element={<Stub label="Trang chủ — Phase 4" />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/tree"   element={<Stub label="Cây gia phả — Phase 5" />} />
          <Route path="/list"   element={<Stub label="Danh sách — Phase 5" />} />
          <Route path="/editor" element={<ProtectedRoute role="editor"><Stub label="Quản lý thành viên — Phase 6" /></ProtectedRoute>} />
          <Route path="/content" element={<ProtectedRoute role="editor"><Stub label="Nội dung trang chủ — Phase 7" /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
