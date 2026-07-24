import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PaginaVoluntarios from './pages/PaginaVoluntarios.jsx'
import PaginaEstudiantes from './pages/PaginaEstudiantes.jsx'
import Login from './pages/Login.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MisHoras from './pages/MisHoras.jsx'

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
      <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          }>
        </Route>
        <Route
          path="/mis-horas"
          element={
            <RutaProtegida>
              <MisHoras />
            </RutaProtegida>
          }>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App