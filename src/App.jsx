import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PaginaVoluntarios from './pages/PaginaVoluntarios.jsx'
import PaginaEstudiantes from './pages/PaginaEstudiantes.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/voluntarios" element={<PaginaVoluntarios />} />
        <Route path="/estudiantes" element={<PaginaEstudiantes />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App