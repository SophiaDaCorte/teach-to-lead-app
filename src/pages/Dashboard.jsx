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
            <p className="dash-role">Executive Director · Teach to Lead</p>
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
          <div className="metric">
            <div className="metric-n">24</div>
            <div className="metric-l">Total volunteers</div>
          </div>
          <div className="metric">
            <div className="metric-n">47</div>
            <div className="metric-l">My hours</div>
          </div>
          <div className="metric">
            <div className="metric-n">3</div>
            <div className="metric-l">Cert. requests</div>
          </div>
          <div className="metric">
            <div className="metric-n">2</div>
            <div className="metric-l">Week off requests</div>
          </div>
        </div>

        <p className="dash-sl">Quick access</p>
        <div className="dash-modules">

          <div className="dash-mod">
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">👥</span>
            </div>
            <div className="dash-mod-title">All volunteers</div>
            <div className="dash-mod-desc">View, add and edit all roles</div>
          </div>

          <div className="dash-mod">
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">📜</span>
              <span className="dash-badge badge-new">3 new</span>
            </div>
            <div className="dash-mod-title">Certificates</div>
            <div className="dash-mod-desc">Review and generate</div>
          </div>

          <div className="dash-mod">
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

          <div className="dash-mod">
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">🏖️</span>
              <span className="dash-badge badge-warn">2 new</span>
            </div>
            <div className="dash-mod-title">Week off</div>
            <div className="dash-mod-desc">Review requests</div>
          </div>

          <div className="dash-mod">
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">✅</span>
            </div>
            <div className="dash-mod-title">Checklists</div>
            <div className="dash-mod-desc">Edit anyone's tasks</div>
          </div>

          <div className="dash-mod">
            <div className="dash-mod-top">
              <span className="dash-mod-emoji">📤</span>
            </div>
            <div className="dash-mod-title">Files</div>
            <div className="dash-mod-desc">View all submitted</div>
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