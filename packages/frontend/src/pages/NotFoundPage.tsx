import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center max-w-sm px-4">
        <p className="text-7xl font-bold text-amber-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Không tìm thấy trang</h1>
        <p className="text-stone-500 text-sm mb-6">Trang bạn đang tìm không tồn tại hoặc đã bị xóa.</p>
        <Link to="/" className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
