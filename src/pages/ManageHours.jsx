import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './ManageHours.css'

function ManageHours() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [voluntarios, setVoluntarios] = useState([])
  const [grupoAbierto, setGrupoAbierto] = useState(null)
  const [editando, setEditando] = useState(null)
  const [contentAdd, setContentAdd] = useState(0)
  const [meetingAdd, setMeetingAdd] = useState(0)

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single()
        setPerfil(perfilData)

        const { data: perfilesData } = await supabase
          .from('perfiles')
          .select('*')
          .not('roles', 'cs', '{"estudiante"}')

        const { data: horasData } = await supabase
          .from('horas')
          .select('*')

        const combinado = perfilesData.map(p => ({
          ...p,
          horas: horasData.find(h => h.user_id === p.id) || { content_hrs: 0, meeting_hrs: 0, total_hrs: 0 }
        }))

        setVoluntarios(combinado)
      }
    }
    cargarDatos()
  }, [])

  function gruposVisibles() {
    if (!perfil) return {}
    const roles = perfil.roles
    const todos = {
      Leadership: voluntarios.filter(u => u.roles.includes('staff_admin')),
      Staff: voluntarios.filter(u =>
        u.roles.includes('staff_regular') ||
        u.roles.includes('volunteer_coordinator') ||
        u.roles.includes('director_of_programs')
      ),
      Marketing: voluntarios.filter(u =>
        u.roles.includes('staff_marketing') ||
        u.roles.includes('marketing_interns')
      ),
      Tutors: voluntarios.filter(u => u.roles.includes('tutors')),
      Creation: voluntarios.filter(u => u.roles.includes('creation')),
    }
    if (roles.includes('staff_admin')) return todos
    if (roles.includes('volunteer_coordinator')) return { Tutors: todos.Tutors, Creation: todos.Creation }
    if (roles.includes('staff_marketing')) return { Marketing: todos.Marketing }
    return {}
  }

  const grupoEmojis = {
    Leadership: '👑', Staff: '👥', Marketing: '📣', Tutors: '🎓', Creation: '🎨'
  }

  function abrirEdicion(voluntario) {
    setEditando(voluntario)
    setContentAdd(0)
    setMeetingAdd(0)
  }

  async function agregarHoras() {
    if (!editando) return
    const nuevasContent = editando.horas.content_hrs + Number(contentAdd)
    const nuevasMeeting = editando.horas.meeting_hrs + Number(meetingAdd)

    const { data, error } = await supabase
      .from('horas')
      .update({ content_hrs: nuevasContent, meeting_hrs: nuevasMeeting })
      .eq('user_id', editando.id)
      .select()
      .single()

    if (!error) {
      setVoluntarios(voluntarios.map(v =>
        v.id === editando.id ? { ...v, horas: data } : v
      ))
      setEditando(null)
    }
  }

  const grupos = gruposVisibles()

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="mh-content">
        <button className="mh-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="mh-title">Manage hours</h1>

        {editando && (
          <div className="mh-panel">
            <div className="mh-panel-header">
              <div className="mh-panel-avatar">
                {editando.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <p className="mh-panel-name">{editando.nombre}</p>
                <p className="mh-panel-sub">{editando.titulo} · Adding hours</p>
              </div>
            </div>

            <div className="mh-current-row">
              <div className="mh-curr"><div className="mh-curr-n">{editando.horas.content_hrs}</div><div className="mh-curr-l">Current content</div></div>
              <div className="mh-curr"><div className="mh-curr-n">{editando.horas.meeting_hrs}</div><div className="mh-curr-l">Current meeting</div></div>
              <div className="mh-curr mh-curr-total"><div className="mh-curr-n">{editando.horas.total_hrs}</div><div className="mh-curr-l">Current total</div></div>
            </div>

            <div className="mh-divider"><div className="mh-divider-line"></div><span className="mh-divider-text">Hours to add</span><div className="mh-divider-line"></div></div>

            <div className="mh-add-fields">
              <div className="mh-field">
                <label>Content hrs</label>
                <input type="number" min="0" value={contentAdd} onChange={(e) => setContentAdd(e.target.value)} />
              </div>
              <div className="mh-field">
                <label>Meeting hrs</label>
                <input type="number" min="0" value={meetingAdd} onChange={(e) => setMeetingAdd(e.target.value)} />
              </div>
            </div>

            <div className="mh-preview">
              <span className="mh-preview-label">New total after adding</span>
              <span className="mh-preview-total">{editando.horas.total_hrs + Number(contentAdd) + Number(meetingAdd)} hrs</span>
            </div>

            <div className="mh-btns">
              <button className="mh-save" onClick={agregarHoras}>Add hours</button>
              <button className="mh-cancel" onClick={() => setEditando(null)}>Cancel</button>
            </div>
          </div>
        )}

        {Object.entries(grupos).map(([nombre, personas]) => {
          if (personas.length === 0) return null
          const abierto = grupoAbierto === nombre
          return (
            <div key={nombre} className="mh-group">
              <div className="mh-group-header" onClick={() => setGrupoAbierto(abierto ? null : nombre)}>
                <div className="mh-group-left">
                  <span>{grupoEmojis[nombre]}</span>
                  <span className="mh-group-name">{nombre}</span>
                  <span className="mh-group-count">{personas.length}</span>
                </div>
                <i className={`ti ti-chevron-down mh-chevron ${abierto ? 'open' : ''}`} aria-hidden="true"></i>
              </div>

              {abierto && (
                <div className="mh-group-body">
                  {personas.map(u => (
                    <div key={u.id} className={`mh-row ${editando?.id === u.id ? 'editing' : ''}`}>
                      <div className="mh-avatar">
                        {u.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div className="mh-info">
                        <p className="mh-name">{u.nombre}</p>
                        <p className="mh-role">{u.titulo}</p>
                      </div>
                      <div className="mh-total-badge">
                        <div className="mh-total-n">{u.horas.total_hrs}</div>
                        <div className="mh-total-l">Total hrs</div>
                      </div>
                      <button className="mh-add-btn" onClick={() => abrirEdicion(u)}>
                        <i className="ti ti-plus" aria-hidden="true"></i> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ManageHours