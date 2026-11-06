import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PaginaVoluntarios from './pages/PaginaVoluntarios.jsx'
import Login from './pages/Login.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import Notificador from './components/Notificador.jsx'
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
import Outreach from './pages/Outreach.jsx'
import MyProjects from './pages/MyProjects.jsx'
import MyClass from './pages/MyClass.jsx'
import MySchedule from './pages/MySchedule.jsx'
import StudentBook from './pages/StudentBook.jsx'
import ClassPhotos from './pages/ClassPhotos.jsx'
import MyFiles from './pages/MyFiles.jsx'
import Chat from './pages/Chat.jsx'
import MisTareas from './pages/MisTareas.jsx'
import MisFaltas from './pages/MisFaltas.jsx'
import MisCalificaciones from './pages/MisCalificaciones.jsx'
import MiHorario from './pages/MiHorario.jsx'
import MiLibro from './pages/MiLibro.jsx'

function App() {
  return (
    <BrowserRouter>
      <Notificador />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/voluntarios" element={<RutaProtegida><PaginaVoluntarios /></RutaProtegida>} />
        <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
        <Route path="/mis-horas" element={<RutaProtegida><MisHoras /></RutaProtegida>} />
        <Route path="/checklist" element={<RutaProtegida><Checklist /></RutaProtegida>} />
        <Route path="/announcements" element={<RutaProtegida><Announcements /></RutaProtegida>} />
        <Route path="/manage-hours" element={<RutaProtegida><ManageHours /></RutaProtegida>} />
        <Route path="/admin" element={<RutaProtegida><AdminPanel /></RutaProtegida>} />
        <Route path="/week-off" element={<RutaProtegida><WeekOff /></RutaProtegida>} />
        <Route path="/certificates" element={<RutaProtegida><Certificates /></RutaProtegida>} />
        <Route path="/weekly-report" element={<RutaProtegida><WeeklyReport /></RutaProtegida>} />
        <Route path="/admin-reports" element={<RutaProtegida><AdminReports /></RutaProtegida>} />
        <Route path="/estudiantes" element={<RutaProtegida><EstudianteDashboard /></RutaProtegida>} />
        <Route path="/class-observations" element={<RutaProtegida><ClassObservations /></RutaProtegida>} />
        <Route path="/content-hub" element={<RutaProtegida><ContentHub /></RutaProtegida>} />
        <Route path="/outreach" element={<RutaProtegida><Outreach /></RutaProtegida>} />
        <Route path="/my-projects" element={<RutaProtegida><MyProjects /></RutaProtegida>} />
        <Route path="/my-class" element={<RutaProtegida><MyClass /></RutaProtegida>} />
        <Route path="/my-schedule" element={<RutaProtegida><MySchedule /></RutaProtegida>} />
        <Route path="/student-book" element={<RutaProtegida><StudentBook /></RutaProtegida>} />
        <Route path="/class-photos" element={<RutaProtegida><ClassPhotos /></RutaProtegida>} />
        <Route path="/my-files" element={<RutaProtegida><MyFiles /></RutaProtegida>} />
        <Route path="/chat" element={<RutaProtegida><Chat /></RutaProtegida>} />
        <Route path="/mis-tareas-clase" element={<RutaProtegida><MisTareas /></RutaProtegida>} />
        <Route path="/mis-faltas" element={<RutaProtegida><MisFaltas /></RutaProtegida>} />
        <Route path="/mis-calificaciones" element={<RutaProtegida><MisCalificaciones /></RutaProtegida>} />
        <Route path="/mi-horario" element={<RutaProtegida><MiHorario /></RutaProtegida>} />
        <Route path="/mi-libro" element={<RutaProtegida><MiLibro /></RutaProtegida>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App