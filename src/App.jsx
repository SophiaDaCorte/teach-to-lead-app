import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PaginaVoluntarios from './pages/PaginaVoluntarios.jsx'
import PaginaEstudiantes from './pages/PaginaEstudiantes.jsx'
import Login from './pages/Login.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/voluntarios" element={<PaginaVoluntarios />} />
        <Route path="/estudiantes" element={<PaginaEstudiantes />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App