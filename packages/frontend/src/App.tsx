import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import TreePage from './pages/TreePage'
import ListPage from './pages/ListPage'
import EditorPage from './pages/EditorPage'
import ContentEditorPage from './pages/ContentEditorPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"       element={<LandingPage />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/tree"   element={<TreePage />} />
          <Route path="/list"   element={<ListPage />} />
          <Route path="/editor" element={<ProtectedRoute role="editor"><EditorPage /></ProtectedRoute>} />
          <Route path="/content" element={<ProtectedRoute role="editor"><ContentEditorPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
