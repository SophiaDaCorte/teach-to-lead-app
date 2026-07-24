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

  useEffect(() => {
    async function cargarPerfil() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        const { data } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
        setPerfil(data[0])
      }
    }
    cargarPerfil()
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
            <div className="metric-n">47</div>
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

          {/* Staff Admin only */}
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

          {/* Staff Marketing only */}
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

          {/* Marketing interns + staff_marketing */}
          {(roles.includes('marketing_interns') || roles.includes('staff_marketing')) && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🎬</span>
              </div>
              <div className="dash-mod-title">My content</div>
              <div className="dash-mod-desc">Upload videos and posts</div>
            </div>
          )}

          {/* Tutors only */}
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

          {/* Creation only */}
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

          {/* Week off for non-admin roles */}
          {(roles.includes('staff_regular') || roles.includes('marketing_interns') || roles.includes('creation')) && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">🏖️</span>
              </div>
              <div className="dash-mod-title">Week off</div>
              <div className="dash-mod-desc">Request a week off</div>
            </div>
          )}

          {/* Weekly report */}
          {(roles.includes('staff_regular') || roles.includes('staff_admin') || roles.includes('staff_marketing')) && (
            <div className="dash-mod">
              <div className="dash-mod-top">
                <span className="dash-mod-emoji">📝</span>
              </div>
              <div className="dash-mod-title">Weekly report</div>
              <div className="dash-mod-desc">Submit your weekly report</div>
            </div>
          )}

          {/* Volunteer Coordinator */}
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

          {/* Director of Programs */}
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

          {/* Shared modules - everyone sees these */}
          <div className="dash-mod" onClick={() => navigate('/mis-horas')} style={{cursor: 'pointer'}}>
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">⏰</span>
            </div>
            <div className="dash-mod-title">My hours</div>
            <div className="dash-mod-desc">View and request cert</div>
          </div>

          <div className="dash-mod">
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

          <div className="dash-mod" onClick={() => navigate('/Checklist')} style={{cursor: 'pointer'}}>
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
          <div className="dash-ann-row">
            <div className="dash-ann-title">Summer camp recap — great work everyone!</div>
            <div className="dash-ann-meta">Posted to All volunteers · 2 days ago</div>
          </div>
          <div className="dash-ann-row">
            <div className="dash-ann-title">New checklist items for tutors this week</div>
            <div className="dash-ann-meta">Posted to Tutors · 5 days ago</div>
          </div>
          <button className="dash-lime-btn">+ New announcement</button>
        </div>

      </div>
    </div>
  )
}

export default Dashboard