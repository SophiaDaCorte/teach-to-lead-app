import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Checklist.css'

function Checklist() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tareas, setTareas] = useState([])
  const [nuevaTarea, setNuevaTarea] = useState("")
  const [userId, setUserId] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [asignadoA, setAsignadoA] = useState([])
  const [tareaAdmin, setTareaAdmin] = useState("")
  const [perfil, setPerfil] = useState(null)
  const [grupoAbierto, setGrupoAbierto] = useState(null)

  useEffect(() => {
    async function cargarTareas() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        setUserId(session.session.user.id)

        const { data } = await supabase
          .from('checklists')
          .select('*')
          .eq('asignado_a', session.session.user.id)
          .order('created_at', { ascending: true })
        setTareas(data || [])

        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single()
        setPerfil(perfilData)

        const { data: usuariosData } = await supabase
          .from('perfiles')
          .select('*')
          .not('roles', 'cs', '{"estudiante"}')
        setUsuarios(usuariosData || [])
      }
    }
    cargarTareas()
  }, [])

  const grupos = {
    Leadership: usuarios.filter(u => u.roles.includes('staff_admin')),
    Staff: usuarios.filter(u =>
      u.roles.includes('staff_regular') ||
      u.roles.includes('volunteer_coordinator') ||
      u.roles.includes('director_of_programs')
    ),
    Marketing: usuarios.filter(u =>
      u.roles.includes('staff_marketing') ||
      u.roles.includes('marketing_interns')
    ),
    Tutors: usuarios.filter(u => u.roles.includes('tutors')),
    Creation: usuarios.filter(u => u.roles.includes('creation')),
  }

  const grupoEmojis = {
    Leadership: '👑',
    Staff: '👥',
    Marketing: '📣',
    Tutors: '🎓',
    Creation: '🎨',
  }

  function togglePersona(id) {
    if (asignadoA.includes(id)) {
      setAsignadoA(asignadoA.filter(a => a !== id))
    } else {
      setAsignadoA([...asignadoA, id])
    }
  }

  async function asignarTarea() {
    if (!tareaAdmin.trim() || asignadoA.length === 0) return
    for (const id of asignadoA) {
      await supabase.from('checklists').insert({
        asignado_a: id,
        creado_por: userId,
        tarea: tareaAdmin
      })
    }
    setTareaAdmin("")
    setAsignadoA([])
  }

  async function agregarTarea() {
    if (!nuevaTarea.trim()) return
    const { data, error } = await supabase
      .from('checklists')
      .insert({ asignado_a: userId, creado_por: userId, tarea: nuevaTarea })
      .select()
    if (!error) {
      setTareas([...tareas, data[0]])
      setNuevaTarea("")
    }
  }

  async function toggleTarea(id, completada) {
    const { data } = await supabase
      .from('checklists')
      .update({ completada: !completada })
      .eq('id', id)
      .select()
    setTareas(tareas.map(t => t.id === id ? data[0] : t))
  }

  async function eliminarTarea(id) {
    await supabase.from('checklists').delete().eq('id', id)
    setTareas(tareas.filter(t => t.id !== id))
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="check-content">
        <button className="check-back" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>

        <h1 className="check-title">My checklist</h1>

        <div className="check-add">
          <input
            className="check-input"
            type="text"
            placeholder="Add a new task..."
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregarTarea()}
          />
          <button className="check-add-btn" onClick={agregarTarea}>+</button>
        </div>

        {perfil && (perfil.roles.includes('staff_admin') || perfil.roles.includes('volunteer_coordinator') || perfil.roles.includes('staff_marketing')) && (
          <div className="acc-wrap">
            <p className="acc-label">
              Assign task to
              {asignadoA.length > 0 && (
                <span style={{marginLeft: '8px', fontSize: '11px', color: '#a9cb5a', fontWeight: '600'}}>
                  {asignadoA.length} selected
                </span>
              )}
            </p>

            {Object.entries(grupos).map(([nombre, personas]) => {
              if (personas.length === 0) return null
              const estaAbierto = grupoAbierto === nombre
              return (
                <div key={nombre} className="acc-group">
                  <div className="acc-header" onClick={() => setGrupoAbierto(estaAbierto ? null : nombre)}>
                    <div className="acc-left">
                      <span className="acc-emoji">{grupoEmojis[nombre]}</span>
                      {nombre}
                      {personas.some(p => asignadoA.includes(p.id)) && (
                        <span style={{fontSize: '10px', background: '#f0f7e6', color: '#a9cb5a', padding: '2px 6px', borderRadius: '4px', fontWeight: '600'}}>
                          {personas.filter(p => asignadoA.includes(p.id)).length} ✓
                        </span>
                      )}
                    </div>
                    <i className={`ti ti-chevron-down acc-chevron ${estaAbierto ? 'open' : ''}`} aria-hidden="true"></i>
                  </div>

                  {estaAbierto && (
                    <div className="acc-body">
                      <div className="acc-all-btn" onClick={() => {
                        const ids = personas.map(p => p.id)
                        const todosSeleccionados = ids.every(id => asignadoA.includes(id))
                        if (todosSeleccionados) {
                          setAsignadoA(asignadoA.filter(a => !ids.includes(a)))
                        } else {
                          setAsignadoA([...new Set([...asignadoA, ...ids])])
                        }
                      }}>
                        <i className="ti ti-users" aria-hidden="true"></i>
                        {personas.every(p => asignadoA.includes(p.id))
                          ? `Deselect all ${nombre.toLowerCase()}`
                          : `Select all ${nombre.toLowerCase()}`}
                      </div>

                      {personas.map(u => (
                        <div
                          key={u.id}
                          className={`acc-person ${asignadoA.includes(u.id) ? 'selected' : ''}`}
                          onClick={() => togglePersona(u.id)}
                        >
                          <div className="acc-avatar" style={{background: '#EEEDFE', color: '#3C3489'}}>
                            {u.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div style={{display:'flex', flexDirection:'column', gap:'1px', alignItems:'flex-start'}}>
                            <span style={{fontSize:'13px', color:'#1a1a1a', lineHeight:'1.2'}}>{u.nombre}</span>
                            <span style={{fontSize:'11px', color:'#aaa', lineHeight:'1.2'}}>{u.titulo}</span>
                          </div>
                          {asignadoA.includes(u.id) && <i className="ti ti-check acc-check" aria-hidden="true"></i>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="task-input">
              <input
                className="check-input"
                type="text"
                placeholder="Task to assign..."
                value={tareaAdmin}
                onChange={(e) => setTareaAdmin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && asignarTarea()}
              />
              <button className="task-btn" onClick={asignarTarea}>
                Assign {asignadoA.length > 0 ? `(${asignadoA.length})` : ''}
              </button>
            </div>
          </div>
        )}

        <div className="check-list">
          {tareas.length === 0 && (
            <p className="check-empty">No tasks yet.</p>
          )}
          {tareas.map((t) => (
            <div key={t.id} className={`check-item ${t.completada ? 'completada' : ''}`}>
              <div className="check-box" onClick={() => toggleTarea(t.id, t.completada)}>
                {t.completada && <i className="ti ti-check" aria-hidden="true"></i>}
              </div>
              <span className="check-tarea" onClick={() => toggleTarea(t.id, t.completada)}>{t.tarea}</span>
              <button className="check-delete" onClick={() => eliminarTarea(t.id)}>
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          ))}
        </div>

        <p className="check-footer">
          {tareas.filter(t => t.completada).length} of {tareas.length} completed
        </p>
      </div>
    </div>
  )
}

export default Checklist