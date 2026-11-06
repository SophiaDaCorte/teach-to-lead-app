import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { cargarResumen } from '../chat.js'
import { veSeccionTutor, esSupervisorDeClases } from '../tutor.js'
import Campana from '../components/Campana.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [horas, setHoras] = useState(null)
  const [anuncios, setAnuncios] = useState([])
  const [certCount, setCertCount] = useState(0)
  const [weekOffCount, setWeekOffCount] = useState(0)
  const [voluntariosCount, setVoluntariosCount] = useState(0)
  const [reportePendiente, setReportePendiente] = useState(false)
  const [fotosNuevas, setFotosNuevas] = useState(0)
  const [chatSinLeer, setChatSinLeer] = useState(0)

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        const { data } = await supabase.from('perfiles').select('*').eq('id', session.session.user.id).single()
        setPerfil(data)

        const resumen = await cargarResumen(session.session.user.id)
        setChatSinLeer(resumen.total)

        const revisorFotos = data?.roles?.includes('staff_admin') || data?.roles?.includes('volunteer_coordinator')
        if (revisorFotos) {
          const { data: pendientes } = await supabase
            .from('fotos_clase')
            .select('envio_id, fecha, tutor_id, comunidad')
            .eq('revisado', false)
          const envios = new Set((pendientes || []).map(f => f.envio_id || `${f.fecha}|${f.tutor_id}|${f.comunidad}`))
          setFotosNuevas(envios.size)
        }

        const { data: horasData } = await supabase.from('horas').select('*').eq('user_id', session.session.user.id).maybeSingle()
        setHoras(horasData)

        const { data: anunciosData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(2)
        setAnuncios(anunciosData || [])

        const { count: certs } = await supabase.from('solicitudes_certificado').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
        setCertCount(certs || 0)

        const { count: weekOffs } = await supabase.from('solicitudes_week_off').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
        setWeekOffCount(weekOffs || 0)

        const { count: vols } = await supabase.from('perfiles').select('*', { count: 'exact', head: true }).not('roles', 'cs', '{"estudiante"}').not('roles', 'cs', '{"inactivo"}')
        setVoluntariosCount(vols || 0)

        const hoy = new Date()
        const inicioSemana = new Date(hoy)
        const dia = hoy.getDay()
        const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1)
        inicioSemana.setDate(diff)
        inicioSemana.setHours(0, 0, 0, 0)
        const isoSemana = inicioSemana.toISOString().split('T')[0]

        const { data: reporte } = await supabase.from('weekly_reports').select('id').eq('user_id', session.session.user.id).eq('semana_inicio', isoSemana).maybeSingle()
        setReportePendiente(!reporte)
      }
    }
    cargarDatos()
  }, [])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!perfil) return <p>Loading...</p>

  const roles = perfil.roles
  const esRevisorFotos = roles.includes('staff_admin') || roles.includes('volunteer_coordinator')
  const veFotos = roles.includes('tutors') || esRevisorFotos
  const veTutor = veSeccionTutor(roles)
  const soloSupervisor = esSupervisorDeClases(roles) && !roles.includes('tutors')

  function mostrarRol(rol) {
    if (rol === 'staff_admin') return 'Staff'
    if (rol === 'staff_marketing') return 'Staff'
    if (rol === 'staff_regular') return 'Staff'
    if (rol === 'marketing_interns') return 'Marketing'
    if (rol === 'tutors') return 'Tutor'
    if (rol === 'creation') return 'Creation Team'
    if (rol === 'volunteer_coordinator') return 'Staff'
    if (rol === 'director_of_programs') return 'Staff'
    if (rol === 'director_of_schools') return 'Staff'
    return rol
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="dash-content">
        <div className="dash-topbar">
          <div>
            <h1 className="dash-name">Hey, {perfil.nombre} 👋</h1>
            <p className="dash-role">{mostrarRol(perfil.roles[0])} · {perfil.titulo} · Teach to Lead</p>
          </div>
          <div className="dash-top-right">
            <Campana />
            <button className="dash-icon-btn" aria-label="Messages" onClick={() => navigate('/chat')} style={{position:'relative'}}>
              <i className="ti ti-message-circle" aria-hidden="true"></i>
              {chatSinLeer > 0 && (
                <span style={{position:'absolute', top:'-4px', right:'-4px', minWidth:'16px', height:'16px', borderRadius:'999px', background:'#b91c1c', color:'white', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px'}}>
                  {chatSinLeer > 99 ? '99+' : chatSinLeer}
                </span>
              )}
            </button>
            <button className="dash-signout" onClick={cerrarSesion}><i className="ti ti-logout" aria-hidden="true"></i> Sign out</button>
          </div>
        </div>

        <div className="dash-metrics">
          {roles.includes('staff_admin') && (
            <div className="metric"><div className="metric-n">{voluntariosCount}</div><div className="metric-l">Total volunteers</div></div>
          )}
          <div className="metric"><div className="metric-n">{horas ? horas.total_hrs : 0}</div><div className="metric-l">My hours</div></div>
          {(roles.includes('staff_admin') || roles.includes('director_of_programs')) && (
            <div className="metric"><div className="metric-n">{certCount}</div><div className="metric-l">Cert. requests</div></div>
          )}
          {roles.includes('staff_admin') && (
            <div className="metric"><div className="metric-n">{weekOffCount}</div><div className="metric-l">Week off requests</div></div>
          )}
        </div>

        <p className="dash-sl">Quick access</p>
        <div className="dash-modules">

          {(roles.includes('staff_admin') || roles.includes('volunteer_coordinator') || roles.includes('director_of_schools') || roles.includes('staff_marketing')) && (
            <div className="dash-mod" onClick={() => navigate('/admin')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">👑</span></div>
              <div className="dash-mod-title">Admin panel</div>
              <div className="dash-mod-desc">Manage users and roles</div>
            </div>
          )}

          {roles.includes('director_of_schools') && (
            <div className="dash-mod" onClick={() => navigate('/class-observations')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">📋</span></div>
              <div className="dash-mod-title">Class observations</div>
              <div className="dash-mod-desc">Report and view class visits</div>
            </div>
          )}

          {(roles.includes('staff_admin') || roles.includes('director_of_programs')) && (
            <div className="dash-mod" onClick={() => navigate('/certificates')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📜</span>
                {certCount > 0 && <span className="dash-badge badge-warn">{certCount} new</span>}
              </div>
              <div className="dash-mod-title">Certificates</div>
              <div className="dash-mod-desc">Review and approve</div>
            </div>
          )}

          {roles.includes('staff_admin') && (
            <div className="dash-mod" onClick={() => navigate('/admin-reports')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">📊</span></div>
              <div className="dash-mod-title">Staff reports</div>
              <div className="dash-mod-desc">Weekly reports and observations</div>
            </div>
          )}

          {(roles.includes('staff_admin') || roles.includes('staff_marketing')) && (
            <div className="dash-mod" onClick={() => navigate('/manage-hours')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">⏱️</span></div>
              <div className="dash-mod-title">Manage hours</div>
              <div className="dash-mod-desc">Edit volunteer hours</div>
            </div>
          )}

          {(roles.includes('staff_admin') || roles.includes('staff_marketing') || roles.includes('marketing_interns')) && (
            <div className="dash-mod" onClick={() => navigate('/content-hub')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">🎬</span></div>
              <div className="dash-mod-title">Content hub</div>
              <div className="dash-mod-desc">Assign and upload content</div>
            </div>
          )}

          {(roles.includes('staff_admin') || roles.includes('staff_marketing') || roles.includes('marketing_interns')) && (
            <div className="dash-mod" onClick={() => navigate('/outreach')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">📣</span></div>
              <div className="dash-mod-title">Outreach</div>
              <div className="dash-mod-desc">
                {roles.includes('marketing_interns') && !roles.includes('staff_admin') && !roles.includes('staff_marketing') ? 'My assignments' : 'Creators and events'}
              </div>
            </div>
          )}

          {(roles.includes('staff_admin') || roles.includes('volunteer_coordinator') || roles.includes('creation')) && (
            <div className="dash-mod" onClick={() => navigate('/my-projects')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">🗂️</span></div>
              <div className="dash-mod-title">My projects</div>
              <div className="dash-mod-desc">
                {roles.includes('creation') && !roles.includes('staff_admin') ? 'View and claim tasks' : 'Manage creation projects'}
              </div>
            </div>
          )}

          {veTutor && (
            <div className="dash-mod" onClick={() => navigate('/my-class')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">🎓</span></div>
              <div className="dash-mod-title">My class</div>
              <div className="dash-mod-desc">{soloSupervisor ? 'All classes: attendance and grades' : 'Attendance and gradebook'}</div>
            </div>
          )}

          {veTutor && (
            <div className="dash-mod" onClick={() => navigate('/my-schedule')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">🗓️</span></div>
              <div className="dash-mod-title">My schedule</div>
              <div className="dash-mod-desc">{soloSupervisor ? 'All classes: times and links' : 'Manage class times and links'}</div>
            </div>
          )}

          {veTutor && (
            <div className="dash-mod" onClick={() => navigate('/student-book')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">📖</span></div>
              <div className="dash-mod-title">Student book</div>
              <div className="dash-mod-desc">View and share course book</div>
            </div>
          )}

          {veFotos && (
            <div className="dash-mod" onClick={() => navigate('/class-photos')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📸</span>
                {esRevisorFotos && fotosNuevas > 0 && <span className="dash-badge badge-warn">{fotosNuevas} new</span>}
              </div>
              <div className="dash-mod-title">Class photos</div>
              <div className="dash-mod-desc">
                {esRevisorFotos ? 'Review class photos' : 'Submit weekly class photos'}
              </div>
            </div>
          )}

          {!roles.includes('staff_admin') && (
            <div className="dash-mod" onClick={() => navigate('/week-off')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top"><span className="dash-mod-emoji">🏖️</span></div>
              <div className="dash-mod-title">Week off</div>
              <div className="dash-mod-desc">Request a week off</div>
            </div>
          )}

          {roles.includes('staff_admin') && (
            <div className="dash-mod" onClick={() => navigate('/week-off')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🏖️</span>
                {weekOffCount > 0 && <span className="dash-badge badge-warn">{weekOffCount} new</span>}
              </div>
              <div className="dash-mod-title">Week off</div>
              <div className="dash-mod-desc">Review all requests</div>
            </div>
          )}

          {!roles.includes('creation') && (
            <div className="dash-mod" onClick={() => navigate('/weekly-report')} style={{cursor:'pointer'}}>
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📝</span>
                {reportePendiente && <span className="dash-badge badge-new">Pending</span>}
              </div>
              <div className="dash-mod-title">Weekly report</div>
              <div className="dash-mod-desc">Submit your weekly report</div>
            </div>
          )}

          <div className="dash-mod" onClick={() => navigate('/mis-horas')} style={{cursor:'pointer'}}>
            <div className="dash-mod-top"><span className="dash-mod-emoji">⏰</span></div>
            <div className="dash-mod-title">My hours</div>
            <div className="dash-mod-desc">View and request cert</div>
          </div>

          <div className="dash-mod" onClick={() => navigate('/announcements')} style={{cursor:'pointer'}}>
            <div className="dash-mod-top"><span className="dash-mod-emoji">📢</span></div>
            <div className="dash-mod-title">Announcements</div>
            <div className="dash-mod-desc">Post to any team</div>
          </div>

          <div className="dash-mod" onClick={() => navigate('/chat')} style={{cursor:'pointer'}}>
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">💬</span>
              {chatSinLeer > 0 && <span className="dash-badge badge-warn">{chatSinLeer} new</span>}
            </div>
            <div className="dash-mod-title">Chat</div>
            <div className="dash-mod-desc">Teams, classes and direct messages</div>
          </div>

          <div className="dash-mod" onClick={() => navigate('/my-files')} style={{cursor:'pointer'}}>
            <div className="dash-mod-top"><span className="dash-mod-emoji">📁</span></div>
            <div className="dash-mod-title">My files</div>
            <div className="dash-mod-desc">Your documents and folders</div>
          </div>

          <div className="dash-mod" onClick={() => navigate('/checklist')} style={{cursor:'pointer'}}>
            <div className="dash-mod-top"><span className="dash-mod-emoji">✅</span></div>
            <div className="dash-mod-title">Checklists</div>
            <div className="dash-mod-desc">My weekly tasks</div>
          </div>

        </div>

        <p className="dash-sl">Latest announcements</p>
        <div className="dash-card">
          {anuncios.length === 0 && <p style={{fontSize:'13px', color:'#aaa', textAlign:'center', padding:'1rem 0'}}>No announcements yet.</p>}
          {anuncios.map((a) => (
            <div key={a.id} className="dash-ann-row">
              <div className="dash-ann-title">{a.titulo}</div>
              <div className="dash-ann-meta">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          ))}
          <button className="dash-lime-btn" onClick={() => navigate('/announcements')}>View all announcements</button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 