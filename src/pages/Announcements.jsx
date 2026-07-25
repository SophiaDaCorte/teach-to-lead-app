import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Announcements.css'

function Announcements() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [anuncios, setAnuncios] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [contenido, setContenido] = useState("")
  const [dirigidoA, setDirigidoA] = useState([])

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        setUserId(session.session.user.id)

        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single()
        setPerfil(perfilData)

        const roles = perfilData.roles

        let filtro = []
        if (roles.includes('staff_admin')) {
          filtro = ['all', 'staff', 'marketing', 'tutors', 'creation']
        } else if (roles.includes('staff_marketing')) {
          filtro = ['all', 'marketing']
        } else if (roles.includes('volunteer_coordinator')) {
          filtro = ['all', 'staff', 'tutors', 'creation']
        } else if (roles.includes('staff_regular') || roles.includes('director_of_programs')) {
          filtro = ['all', 'staff']
        } else if (roles.includes('tutors')) {
          filtro = ['all', 'tutors']
        } else if (roles.includes('creation')) {
          filtro = ['all', 'creation']
        } else if (roles.includes('marketing_interns')) {
          filtro = ['all', 'marketing']
        }

        const { data } = await supabase
          .from('announcements')
          .select('*')
          .overlaps('dirigido_a', filtro)
          .order('created_at', { ascending: false })
        setAnuncios(data || [])
      }
    }
    cargarDatos()
  }, [])

  function puedePostear() {
    if (!perfil) return false
    return perfil.roles.includes('staff_admin') ||
      perfil.roles.includes('staff_marketing') ||
      perfil.roles.includes('volunteer_coordinator')
  }

  function gruposDisponibles() {
    if (!perfil) return []
    if (perfil.roles.includes('staff_admin')) {
      return [
        { value: 'all', label: '🌐 Everyone' },
        { value: 'staff', label: '👥 Staff' },
        { value: 'marketing', label: '📣 Marketing' },
        { value: 'tutors', label: '🎓 Tutors' },
        { value: 'creation', label: '🎨 Creation' },
      ]
    }
    if (perfil.roles.includes('staff_marketing')) {
      return [{ value: 'marketing', label: '📣 Marketing' }]
    }
    if (perfil.roles.includes('volunteer_coordinator')) {
      return [
        { value: 'staff', label: '👥 Staff' },
        { value: 'tutors', label: '🎓 Tutors' },
        { value: 'creation', label: '🎨 Creation' },
      ]
    }
    return []
  }

  function toggleGrupo(value) {
    if (dirigidoA.includes(value)) {
      setDirigidoA(dirigidoA.filter(g => g !== value))
    } else {
      setDirigidoA([...dirigidoA, value])
    }
  }

  async function publicarAnuncio() {
    if (!titulo.trim() || !contenido.trim() || dirigidoA.length === 0) return
    const { data, error } = await supabase
      .from('announcements')
      .insert({ creado_por: userId, titulo, contenido, dirigido_a: dirigidoA })
      .select()
    if (!error) {
      setAnuncios([data[0], ...anuncios])
      setTitulo("")
      setContenido("")
      setDirigidoA([])
      setMostrarForm(false)
    }
  }

  async function eliminarAnuncio(id) {
    await supabase.from('announcements').delete().eq('id', id)
    setAnuncios(anuncios.filter(a => a.id !== id))
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  function etiquetaGrupo(grupo) {
    const map = {
      all: '🌐 Everyone',
      staff: '👥 Staff',
      marketing: '📣 Marketing',
      tutors: '🎓 Tutors',
      creation: '🎨 Creation',
    }
    return map[grupo] || grupo
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="ann-content">
        <button className="ann-back" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>

        <div className="ann-topbar">
          <h1 className="ann-title">Announcements</h1>
          {puedePostear() && (
            <button className="ann-new-btn" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? 'Cancel' : '+ New'}
            </button>
          )}
        </div>

        {mostrarForm && (
          <div className="ann-form">
            <input
              className="ann-input"
              type="text"
              placeholder="Title..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <textarea
              className="ann-textarea"
              placeholder="Write your announcement..."
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={4}
            />
            <p className="ann-form-label">Post to:</p>
            <div className="ann-grupos">
              {gruposDisponibles().map(g => (
                <button
                  key={g.value}
                  className={`ann-grupo-btn ${dirigidoA.includes(g.value) ? 'selected' : ''}`}
                  onClick={() => toggleGrupo(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <button className="ann-publish-btn" onClick={publicarAnuncio}>
              Publish announcement
            </button>
          </div>
        )}

        <div className="ann-list">
          {anuncios.length === 0 && (
            <p className="ann-empty">No announcements yet.</p>
          )}
          {anuncios.map((a) => (
            <div key={a.id} className="ann-card">
              <div className="ann-card-top">
                <h2 className="ann-card-title">{a.titulo}</h2>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <span className="ann-fecha">{formatFecha(a.created_at)}</span>
                  {perfil && (perfil.roles.includes('staff_admin') || a.creado_por === userId) && (
                    <button
                      onClick={() => eliminarAnuncio(a.id)}
                      style={{background:'none', border:'none', cursor:'pointer', color:'#E24B4A', fontSize:'14px', padding:'0'}}
                    >
                      <i className="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  )}
                </div>
              </div>
              <p className="ann-card-body">{a.contenido}</p>
              <div className="ann-tags">
                {a.dirigido_a.map(g => (
                  <span key={g} className="ann-tag">{etiquetaGrupo(g)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Announcements