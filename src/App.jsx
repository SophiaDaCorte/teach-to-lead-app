import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PaginaVoluntarios from './pages/PaginaVoluntarios.jsx'
import Login from './pages/Login.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MisHoras from './pages/MisHoras.jsx'
import Checklist from './pages/Checklist.jsx'
import Announcements from './pages/Announcements.jsx'
import ManageHours from './pages/ManageHours.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import WeekOff from './pages/WeekOff.jsx'
import Certificates from './pages/Certificates.jsx'
import WeeklyReport from './pages/WeeklyReport.jsx'
import AdminReports from './pages/AdminReports.jsx'
import EstudianteDashboard from './pages/EstudianteDashboard.jsx'
import ClassObservations from './pages/ClassObservations.jsx'
import ContentHub from './pages/ContentHub.jsx'

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
        <Route path="/checklist" element={
            <RutaProtegida>
              <Checklist />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/announcements" element={
            <RutaProtegida>
              <Announcements />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/manage-hours" element={
            <RutaProtegida>
              <ManageHours />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/admin" element={
            <RutaProtegida>
              <AdminPanel />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/week-off" element={
            <RutaProtegida>
              <WeekOff />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/certificates" element={
            <RutaProtegida>
              <Certificates />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/weekly-report" element={
            <RutaProtegida>
              <WeeklyReport />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/admin-reports" element={
            <RutaProtegida>
              <AdminReports />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/estudiantes" element={
            <RutaProtegida>
              <EstudianteDashboard />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/class-observations" element={
            <RutaProtegida>
              <ClassObservations />
            </RutaProtegida>
          }>
        </Route>
        <Route path="/content-hub" element={
            <RutaProtegida>
              <ContentHub />
            </RutaProtegida>
          }>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App