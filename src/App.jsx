import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PaginaVoluntarios from './pages/PaginaVoluntarios.jsx'
import PaginaEstudiantes from './pages/PaginaEstudiantes.jsx'
import Login from './pages/Login.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/voluntarios"
          element={
            <RutaProtegida>
              <PaginaVoluntarios />
            </RutaProtegida>
          }>
        </Route>
        <Route
          path="/estudiantes"
          element={
            <RutaProtegida>
              <PaginaEstudiantes />
            </RutaProtegida>
          }>  
      </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App