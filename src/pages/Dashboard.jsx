import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [horas, setHoras] = useState(null)
  const [anuncios, setAnuncios] = useState([])

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        const { data } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single()
        setPerfil(data)

        const { data: horasData } = await supabase
          .from('horas')
          .select('*')
          .eq('user_id', session.session.user.id)
          .single()
        setHoras(horasData)

        const { data: anunciosData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(2)
        setAnuncios(anunciosData || [])
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

  function mostrarRol(rol) {
    if (rol === 'staff_admin') return 'Staff'
    if (rol === 'staff_marketing') return 'Staff'
    if (rol === 'staff_regular') return 'Staff'
    if (rol === 'marketing_interns') return 'Marketing'
    if (rol === 'tutors') return 'Tutor'
    if (rol === 'creation') return 'Creation Team'
    if (rol === 'volunteer_coordinator') return 'Staff'
    if (rol === 'director_of_programs') return 'Staff'
    return rol
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="dash-content">

        <div className="dash-topbar">
          <div>
            <h1 className="dash-name">Hey, {perfil.nombre} 👋</h1>
            <p className="dash-role">{mostrarRol(perfil.roles[0])} · {perfil.titulo} · Teach to Lead</p>
          </div>
          <div className="dash-top-right">
            <button className="dash-icon-btn" aria-label="Notifications">
              <i className="ti ti-bell" aria-hidden="true"></i>
            </button>
            <button className="dash-icon-btn" aria-label="Messages">
              <i className="ti ti-message-circle" aria-hidden="true"></i>
            </button>
            <button className="dash-signout" onClick={cerrarSesion}>
              <i className="ti ti-logout" aria-hidden="true"></i> Sign out
            </button>
          </div>
        </div>

        <div className="dash-metrics">
          {roles.includes('staff_admin') && (
            <div className="metric">
              <div className="metric-n">24</div>
              <div className="metric-l">Total volunteers</div>
            </div>
          )}
          <div className="metric">
            <div className="metric-n">{horas ? horas.total_hrs : 0}</div>
            <div className="metric-l">My hours</div>
          </div>
          {(roles.includes('staff_admin') || roles.includes('director_of_programs')) && (
            <div className="metric">
              <div className="metric-n">3</div>
              <div className="metric-l">Cert. requests</div>
            </div>
          )}
          {roles.includes('staff_admin') && (
            <div className="metric">
              <div className="metric-n">2</div>
              <div className="metric-l">Week off requests</div>
            </div>
          )}
        </div>

        <p className="dash-sl">Quick access</p>
        <div className="dash-modules">

          {roles.includes('staff_admin') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">👑</span>
              </div>
              <div className="dash-mod-title">Admin panel</div>
              <div className="dash-mod-desc">Manage all users and roles</div>
            </div>
          )}

          {roles.includes('staff_admin') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📜</span>
              </div>
              <div className="dash-mod-title">Certificates</div>
              <div className="dash-mod-desc">Review and generate</div>
            </div>
          )}

          {roles.includes('staff_admin') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🏖️</span>
                <span className="dash-badge badge-warn">2 new</span>
              </div>
              <div className="dash-mod-title">Week off</div>
              <div className="dash-mod-desc">Review all requests</div>
            </div>
          )}

          {roles.includes('staff_marketing') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📊</span>
              </div>
              <div className="dash-mod-title">Team hours</div>
              <div className="dash-mod-desc">View and edit marketing hours</div>
            </div>
          )}

          {roles.includes('staff_marketing') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🎯</span>
              </div>
              <div className="dash-mod-title">Content topics</div>
              <div className="dash-mod-desc">Manage team topics</div>
            </div>
          )}

          {(roles.includes('marketing_interns') || roles.includes('staff_marketing')) && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🎬</span>
              </div>
              <div className="dash-mod-title">My content</div>
              <div className="dash-mod-desc">Upload videos and posts</div>
            </div>
          )}

          {roles.includes('tutors') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🎓</span>
              </div>
              <div className="dash-mod-title">My class</div>
              <div className="dash-mod-desc">Students, attendance and grades</div>
            </div>
          )}

          {roles.includes('tutors') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📖</span>
              </div>
              <div className="dash-mod-title">Student book</div>
              <div className="dash-mod-desc">View and share course book</div>
            </div>
          )}

          {roles.includes('tutors') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📸</span>
              </div>
              <div className="dash-mod-title">Class photos</div>
              <div className="dash-mod-desc">Upload weekly class photos</div>
            </div>
          )}

          {roles.includes('creation') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🗂️</span>
              </div>
              <div className="dash-mod-title">My projects</div>
              <div className="dash-mod-desc">View assigned projects</div>
            </div>
          )}

          {roles.includes('creation') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">✔️</span>
              </div>
              <div className="dash-mod-title">What I've done</div>
              <div className="dash-mod-desc">Log your completed work</div>
            </div>
          )}

          {(roles.includes('staff_regular') || roles.includes('marketing_interns') || roles.includes('creation')) && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🏖️</span>
              </div>
              <div className="dash-mod-title">Week off</div>
              <div className="dash-mod-desc">Request a week off</div>
            </div>
          )}

          {(roles.includes('staff_regular') || roles.includes('staff_admin') || roles.includes('staff_marketing')) && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📝</span>
              </div>
              <div className="dash-mod-title">Weekly report</div>
              <div className="dash-mod-desc">Submit your weekly report</div>
            </div>
          )}

          {roles.includes('volunteer_coordinator') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">⏱️</span>
              </div>
              <div className="dash-mod-title">Tutor hours</div>
              <div className="dash-mod-desc">View and edit tutors' hours</div>
            </div>
          )}

          {roles.includes('volunteer_coordinator') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🎨</span>
              </div>
              <div className="dash-mod-title">Creation hours</div>
              <div className="dash-mod-desc">View and edit creation hours</div>
            </div>
          )}

          {roles.includes('volunteer_coordinator') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📸</span>
              </div>
              <div className="dash-mod-title">Class photos</div>
              <div className="dash-mod-desc">Review weekly tutor photos</div>
            </div>
          )}

          {roles.includes('director_of_programs') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📜</span>
              </div>
              <div className="dash-mod-title">Certificates</div>
              <div className="dash-mod-desc">Generate hour certificates</div>
            </div>
          )}

          {roles.includes('director_of_programs') && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">👥</span>
              </div>
              <div className="dash-mod-title">Volunteers</div>
              <div className="dash-mod-desc">View all volunteers</div>
            </div>
          )}

          <div className="dash-mod" onClick={() => navigate('/mis-horas')} style={{cursor: 'pointer'}}>
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">⏰</span>
            </div>
            <div className="dash-mod-title">My hours</div>
            <div className="dash-mod-desc">View and request cert</div>
          </div>

          <div className="dash-mod" onClick={() => navigate('/announcements')} style={{cursor: 'pointer'}}>
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">📢</span>
            </div>
            <div className="dash-mod-title">Announcements</div>
            <div className="dash-mod-desc">Post to any team</div>
          </div>

          <div className="dash-mod">
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">📁</span>
            </div>
            <div className="dash-mod-title">Drive</div>
            <div className="dash-mod-desc">All teams' files</div>
          </div>

          <div className="dash-mod" onClick={() => navigate('/checklist')} style={{cursor: 'pointer'}}>
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">✅</span>
            </div>
            <div className="dash-mod-title">Checklists</div>
            <div className="dash-mod-desc">My weekly tasks</div>
          </div>

          <div className="dash-mod">
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">📤</span>
            </div>
            <div className="dash-mod-title">Files</div>
            <div className="dash-mod-desc">Upload and share files</div>
          </div>

        </div>

        <p className="dash-sl">Latest announcements</p>
        <div className="dash-card">
          {anuncios.length === 0 && (
            <p style={{fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '1rem 0'}}>No announcements yet.</p>
          )}
          {anuncios.map((a) => (
            <div key={a.id} className="dash-ann-row">
              <div className="dash-ann-title">{a.titulo}</div>
              <div className="dash-ann-meta">
                {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          ))}
          <button className="dash-lime-btn" onClick={() => navigate('/announcements')}>
            View all announcements
          </button>
        </div>

      </div>
    </div>
  )
}

export default Dashboard