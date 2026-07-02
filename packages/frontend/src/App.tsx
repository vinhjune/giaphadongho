import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-8 text-center">Gia Phả Dòng Họ — Phase 4</div>} />
        <Route path="/login" element={<div className="p-8 text-center">Login — Phase 3</div>} />
        <Route path="/tree" element={<div className="p-8 text-center">Tree View — Phase 5</div>} />
        <Route path="/list" element={<div className="p-8 text-center">List View — Phase 5</div>} />
        <Route path="/editor" element={<div className="p-8 text-center">Editor — Phase 6</div>} />
        <Route path="/content" element={<div className="p-8 text-center">Content Editor — Phase 7</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
