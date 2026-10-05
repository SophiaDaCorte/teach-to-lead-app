import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './MyProjects.css'

function esPasado(fecha) {
  if (!fecha) return false
  return new Date(fecha + 'T23:59:59') < new Date()
}

function diasDesdeVencimiento(fecha) {
  if (!fecha) return 0
  const fin = new Date(fecha + 'T23:59:59')
  return Math.floor((new Date() - fin) / (1000 * 60 * 60 * 24))
}

function formatFecha(f) {
  if (!f) return '—'
  return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function MyProjects() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [tab, setTab] = useState('projects')
  const [proyectos, setProyectos] = useState([])
  const [tareas, setTareas] = useState([])
  const [proyectoAbierto, setProyectoAbierto] = useState(null)
  const [expandidoTarea, setExpandidoTarea] = useState(null)
  const [mostrarFormProyecto, setMostrarFormProyecto] = useState(false)
  const [mostrarFormTarea, setMostrarFormTarea] = useState(null)
  const [editandoProyecto, setEditandoProyecto] = useState(null)
  const [linkInput, setLinkInput] = useState({})
  const [razonInput, setRazonInput] = useState({})
  const [horasInput, setHorasInput] = useState({})
  const [asignandoHoras, setAsignandoHoras] = useState(null)
  const [submittingLate, setSubmittingLate] = useState(null)

  const [pTitulo, setPTitulo] = useState('')
  const [pTipo, setPTipo] = useState('Libro')
  const [pDescripcion, setPDescripcion] = useState('')
  const [pCanva, setPCanva] = useState('')
  const [pDueDate, setPDueDate] = useState('')

  const [tTitulo, setTTitulo] = useState('')
  const [tRequirements, setTRequirements] = useState('')
  const [tCanva, setTCanva] = useState('')
  const [tDueDate, setTDueDate] = useState('')

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      setUserId(session.session.user.id)

      const { data: perfilData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.session.user.id)
        .single()
      setPerfil(perfilData)

      const admin = perfilData?.roles?.includes('staff_admin') || perfilData?.roles?.includes('volunteer_coordinator')
      setEsAdmin(admin)

      await cargarProyectos()
      await cargarTareas(session.session.user.id, admin)
    }
    cargarDatos()
  }, [])

  async function cargarProyectos() {
    const { data } = await supabase.from('proyectos').select('*').order('created_at', { ascending: false })
    setProyectos(data || [])
  }

  async function cargarTareas(uid, admin) {
    const { data } = await supabase.from('proyecto_tareas').select('*').order('created_at', { ascending: true })
    const todas = data || []

    // Auto-reset tasks past 7 days grace period
    for (const t of todas) {
      if (t.estado === 'en progreso' && esPasado(t.due_date) && diasDesdeVencimiento(t.due_date) > 7) {
        await supabase.from('advertencias').insert({
          user_id: t.asignado_a,
          nombre: t.nombre_asignado,
          tema_id: null,
          razon: `Did not complete task on time: "${t.titulo}"`
        })
        await supabase.from('proyecto_tareas').update({
          asignado_a: null,
          nombre_asignado: null,
          estado: 'disponible',
          razon_late: null,
          url_entregado: null
        }).eq('id', t.id)
      }
    }

    // Reload after auto-reset
    const { data: updated } = await supabase.from('proyecto_tareas').select('*').order('created_at', { ascending: true })
    setTareas(updated || [])
  }

  function resetFormProyecto() {
    setPTitulo(''); setPTipo('Libro'); setPDescripcion(''); setPCanva(''); setPDueDate('')
  }

  function resetFormTarea() {
    setTTitulo(''); setTRequirements(''); setTCanva(''); setTDueDate('')
  }

  async function guardarProyecto() {
    if (!pTitulo.trim()) return
    if (editandoProyecto) {
      await supabase.from('proyectos').update({
        titulo: pTitulo, tipo: pTipo, descripcion: pDescripcion, link_canva: pCanva, due_date: pDueDate || null
      }).eq('id', editandoProyecto.id)
      setEditandoProyecto(null)
    } else {
      await supabase.from('proyectos').insert({
        titulo: pTitulo, tipo: pTipo, descripcion: pDescripcion, link_canva: pCanva, due_date: pDueDate || null, creado_por: userId
      })
      setMostrarFormProyecto(false)
    }
    resetFormProyecto()
    await cargarProyectos()
  }

  async function eliminarProyecto(id) {
    await supabase.from('proyecto_tareas').delete().eq('proyecto_id', id)
    await supabase.from('proyectos').delete().eq('id', id)
    await cargarProyectos()
    await cargarTareas(userId, esAdmin)
  }

  async function guardarTarea(proyectoId) {
    if (!tTitulo.trim()) return
    await supabase.from('proyecto_tareas').insert({
      proyecto_id: proyectoId, titulo: tTitulo, requirements: tRequirements,
      link_canva: tCanva, due_date: tDueDate || null, creado_por: userId
    })
    setMostrarFormTarea(null)
    resetFormTarea()
    await cargarTareas(userId, esAdmin)
  }

  async function eliminarTarea(id) {
    const tarea = tareas.find(t => t.id === id)
    if (tarea?.horas_asignadas > 0 && tarea?.asignado_a) {
      const { data: horasData } = await supabase.from('horas').select('*').eq('user_id', tarea.asignado_a).single()
      if (horasData) {
        await supabase.from('horas').update({
          content_hrs: Math.max(0, horasData.content_hrs - tarea.horas_asignadas)
        }).eq('user_id', tarea.asignado_a)
      }
    }
    await supabase.from('proyecto_tareas').delete().eq('id', id)
    await cargarTareas(userId, esAdmin)
  }

  async function reclamarTarea(id) {
    await supabase.from('proyecto_tareas').update({
      asignado_a: userId, nombre_asignado: perfil?.nombre, estado: 'en progreso'
    }).eq('id', id)
    await cargarTareas(userId, esAdmin)
  }

  async function completarTarea(id) {
    const url = linkInput[id] || ''
    if (!url.trim()) return
    await supabase.from('proyecto_tareas').update({
      url_entregado: url, estado: 'completado'
    }).eq('id', id)
    setLinkInput({...linkInput, [id]: ''})
    await cargarTareas(userId, esAdmin)
  }

  async function subirLate(id) {
    const url = linkInput[id] || ''
    const razon = razonInput[id] || ''
    if (!url.trim() || !razon.trim()) return
    setSubmittingLate(id)
    await supabase.from('proyecto_tareas').update({
      url_entregado: url,
      razon_late: razon,
      estado: 'completado'
    }).eq('id', id)
    setLinkInput({...linkInput, [id]: ''})
    setRazonInput({...razonInput, [id]: ''})
    setSubmittingLate(null)
    await cargarTareas(userId, esAdmin)
  }

  async function asignarHoras(id) {
    const horas = Number(horasInput[id]) || 0
    await supabase.from('proyecto_tareas').update({ horas_asignadas: horas }).eq('id', id)
    const tarea = tareas.find(t => t.id === id)
    if (tarea?.asignado_a && horas > 0) {
      const { data: horasData } = await supabase.from('horas').select('*').eq('user_id', tarea.asignado_a).single()
      if (horasData) {
        await supabase.from('horas').update({
          content_hrs: horasData.content_hrs + horas
        }).eq('user_id', tarea.asignado_a)
      }
    }
    setAsignandoHoras(null)
    setHorasInput({})
    await cargarTareas(userId, esAdmin)
  }

  function badgeEstado(estado, esLate) {
    if (esLate) return <span className="mp-badge badge-late">Late</span>
    if (estado === 'disponible') return <span className="mp-badge badge-available">Available</span>
    if (estado === 'en progreso') return <span className="mp-badge badge-progress">In progress</span>
    if (estado === 'completado') return <span className="mp-badge badge-done">Done</span>
  }

  function renderTarea(t, enProyecto = false) {
    const esLate = t.estado === 'en progreso' && esPasado(t.due_date)
    const diasLate = esLate ? diasDesdeVencimiento(t.due_date) : 0
    const diasRestantes = Math.max(0, 7 - diasLate)
    const esMia = t.asignado_a === userId

    return (
      <div key={t.id} className={enProyecto ? 'mp-tarea' : 'mp-card'}>
        <div
          className={enProyecto ? 'mp-tarea-header' : 'mp-card-header'}
          onClick={() => setExpandidoTarea(expandidoTarea === t.id ? null : t.id)}
        >
          <div className={enProyecto ? 'mp-tarea-info' : 'mp-card-info'}>
            <p className={enProyecto ? 'mp-tarea-title' : 'mp-card-title'}>{t.titulo}</p>
            <p className={enProyecto ? 'mp-tarea-sub' : 'mp-card-sub'}>
              {t.nombre_asignado || 'Unclaimed'} · Due {formatFecha(t.due_date)}
              {esLate && ` · ${diasRestantes} days left`}
              {t.horas_asignadas > 0 && ` · ${t.horas_asignadas} hrs`}
            </p>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
            {badgeEstado(t.estado, esLate)}
            {esAdmin && (
              <button className="mp-delete-btn" style={{padding:'3px 6px'}} onClick={(e) => { e.stopPropagation(); eliminarTarea(t.id) }}>
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            )}
            <i className={`ti ${expandidoTarea === t.id ? 'ti-chevron-up' : 'ti-chevron-down'} mp-chevron`} aria-hidden="true"></i>
          </div>
        </div>

        {expandidoTarea === t.id && (
          <div className={enProyecto ? 'mp-tarea-body' : 'mp-card-body'}>
            {t.requirements && (
              <div className="mp-field-row" style={{marginBottom:'8px'}}>
                <p className="mp-field-label">Requirements</p>
                <p className="mp-field-value">{t.requirements}</p>
              </div>
            )}
            {t.link_canva && (
              <div className="mp-field-row" style={{marginBottom:'8px'}}>
                <p className="mp-field-label">Canva</p>
                <a href={t.link_canva} target="_blank" rel="noreferrer" style={{fontSize:'13px', color:'#2d2a86'}}>
                  Open Canva <i className="ti ti-external-link" style={{fontSize:'11px'}} aria-hidden="true"></i>
                </a>
              </div>
            )}
            {t.nombre_asignado && (
              <div className="mp-field-row" style={{marginBottom:'8px'}}>
                <p className="mp-field-label">Assigned to</p>
                <p className="mp-field-value">{t.nombre_asignado}</p>
              </div>
            )}
            {t.url_entregado && (
              <div className="mp-field-row" style={{marginBottom:'8px'}}>
                <p className="mp-field-label">Submitted work</p>
                <a href={t.url_entregado} target="_blank" rel="noreferrer" style={{fontSize:'13px', color:'#2d2a86', wordBreak:'break-all'}}>
                  {t.url_entregado} <i className="ti ti-external-link" style={{fontSize:'11px'}} aria-hidden="true"></i>
                </a>
              </div>
            )}
            {t.razon_late && (
              <div className="mp-field-row" style={{marginBottom:'8px', background:'#fffbeb', borderRadius:'8px', padding:'10px 12px'}}>
                <p className="mp-field-label" style={{color:'#92400e'}}>Late reason</p>
                <p className="mp-field-value" style={{color:'#92400e'}}>{t.razon_late}</p>
              </div>
            )}
            {t.horas_asignadas > 0 && (
              <div className="mp-field-row" style={{marginBottom:'8px'}}>
                <p className="mp-field-label">Hours assigned</p>
                <p className="mp-field-value">{t.horas_asignadas} hrs</p>
              </div>
            )}

            {esAdmin && t.estado === 'completado' && (
              asignandoHoras === t.id ? (
                <div style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'10px'}}>
                  <input
                    type="number" min="0" placeholder="0"
                    value={horasInput[t.id] || ''}
                    onChange={(e) => setHorasInput({...horasInput, [t.id]: e.target.value})}
                    style={{width:'70px', padding:'6px 10px', border:'0.5px solid #bbf7d0', borderRadius:'6px', fontSize:'13px', fontFamily:'Poppins,sans-serif', color:'#1a1a1a', background:'white'}}
                  />
                  <span style={{fontSize:'11px', color:'#aaa'}}>hrs</span>
                  <button className="mp-save" style={{padding:'6px 14px'}} onClick={() => asignarHoras(t.id)}>Assign</button>
                  <button className="mp-cancel" style={{padding:'6px 10px'}} onClick={() => setAsignandoHoras(null)}>Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => { setAsignandoHoras(t.id); setHorasInput({...horasInput, [t.id]: t.horas_asignadas || ''}) }}
                  style={{marginTop:'10px', padding:'6px 14px', borderRadius:'999px', border:'0.5px solid #bbf7d0', background:'#f0fdf4', fontSize:'12px', color:'#15803d', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:500}}
                >
                  {t.horas_asignadas > 0 ? '✏️ Edit hours' : '+ Assign hours'}
                </button>
              )
            )}

            {!esAdmin && t.estado === 'disponible' && (
              <button className="mp-save" style={{marginTop:'8px'}} onClick={() => reclamarTarea(t.id)}>
                Claim this task
              </button>
            )}

            {!esAdmin && esMia && t.estado === 'en progreso' && !esLate && (
              <div style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'8px'}}>
                <input
                  className="mp-input"
                  type="url"
                  placeholder="Submit your work link..."
                  value={linkInput[t.id] || ''}
                  onChange={(e) => setLinkInput({...linkInput, [t.id]: e.target.value})}
                  style={{flex:1}}
                />
                <button
                  className="mp-save"
                  style={{padding:'7px 14px', whiteSpace:'nowrap'}}
                  onClick={() => completarTarea(t.id)}
                  disabled={!linkInput[t.id]?.trim()}
                >
                  Mark done
                </button>
              </div>
            )}

            {!esAdmin && esMia && esLate && (
              <div style={{marginTop:'10px'}}>
                <p style={{fontSize:'12px', color:'#b91c1c', marginBottom:'8px'}}>
                  ⚠️ This task is late — {diasRestantes} days left before it goes back to available and you get a warning.
                </p>
                <div className="mp-field" style={{marginBottom:'8px'}}>
                  <label className="mp-label">Why are you submitting late?</label>
                  <textarea
                    className="mp-textarea"
                    placeholder="Explain what happened..."
                    value={razonInput[t.id] || ''}
                    onChange={(e) => setRazonInput({...razonInput, [t.id]: e.target.value})}
                    style={{minHeight:'60px'}}
                  />
                </div>
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <input
                    className="mp-input"
                    type="url"
                    placeholder="Submit your work link..."
                    value={linkInput[t.id] || ''}
                    onChange={(e) => setLinkInput({...linkInput, [t.id]: e.target.value})}
                    style={{flex:1}}
                  />
                  <button
                    className="mp-save"
                    style={{padding:'7px 14px', whiteSpace:'nowrap'}}
                    onClick={() => subirLate(t.id)}
                    disabled={!linkInput[t.id]?.trim() || !razonInput[t.id]?.trim() || submittingLate === t.id}
                  >
                    Submit late
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const tareasLate = esAdmin
    ? tareas.filter(t => t.estado === 'en progreso' && esPasado(t.due_date))
    : tareas.filter(t => t.asignado_a === userId && t.estado === 'en progreso' && esPasado(t.due_date))

  const tareasCompletadas = esAdmin
    ? tareas.filter(t => t.estado === 'completado')
    : tareas.filter(t => t.estado === 'completado' && t.asignado_a === userId)

  const misTareas = tareas.filter(t => t.asignado_a === userId && t.estado === 'en progreso' && !esPasado(t.due_date))

  function tareasDeProyecto(proyectoId) {
    if (esAdmin) return tareas.filter(t => t.proyecto_id === proyectoId)
    return tareas.filter(t => t.proyecto_id === proyectoId && (t.estado === 'disponible' || t.asignado_a === userId))
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="mp-content">
        <button className="mp-back" onClick={() => navigate('/dashboard')}>← Back</button>

        <div className="mp-topbar">
          <h1 className="mp-title">Projects</h1>
          {esAdmin && (
            <button
              className={`mp-new-btn ${mostrarFormProyecto ? 'active' : ''}`}
              onClick={() => { setMostrarFormProyecto(!mostrarFormProyecto); setEditandoProyecto(null); resetFormProyecto() }}
            >
              {mostrarFormProyecto ? 'Cancel' : '+ New project'}
            </button>
          )}
        </div>

        <div className="mp-tabs">
          <button className={`mp-tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
            Projects <span className="mp-tab-count">{proyectos.length}</span>
          </button>
          {!esAdmin && (
            <button className={`mp-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
              My tasks {misTareas.length > 0 && <span className="mp-badge-sm">{misTareas.length}</span>}
            </button>
          )}
          <button className={`mp-tab ${tab === 'late' ? 'active' : ''}`} onClick={() => setTab('late')}>
            Late {tareasLate.length > 0 && <span className="mp-badge-sm mp-badge-red">{tareasLate.length}</span>}
          </button>
          <button className={`mp-tab ${tab === 'done' ? 'active' : ''}`} onClick={() => setTab('done')}>
            Done {tareasCompletadas.length > 0 && <span className="mp-badge-sm">{tareasCompletadas.length}</span>}
          </button>
        </div>

        {tab === 'projects' && (
          <div>
            {mostrarFormProyecto && (
              <div className="mp-form">
                <p className="mp-form-title">New project</p>
                <div className="mp-row2">
                  <div className="mp-field">
                    <label className="mp-label">Title</label>
                    <input className="mp-input" type="text" placeholder="e.g. TTL Storybook Vol. 1" value={pTitulo} onChange={(e) => setPTitulo(e.target.value)} />
                  </div>
                  <div className="mp-field">
                    <label className="mp-label">Type</label>
                    <select className="mp-input" value={pTipo} onChange={(e) => setPTipo(e.target.value)}>
                      <option>Libro</option>
                      <option>Poster</option>
                      <option>Flyer</option>
                      <option>Infographic</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="mp-field">
                  <label className="mp-label">Description</label>
                  <textarea className="mp-textarea" placeholder="Describe the project..." value={pDescripcion} onChange={(e) => setPDescripcion(e.target.value)} />
                </div>
                <div className="mp-row2">
                  <div className="mp-field">
                    <label className="mp-label">Canva link</label>
                    <input className="mp-input" type="url" placeholder="https://canva.com/..." value={pCanva} onChange={(e) => setPCanva(e.target.value)} />
                  </div>
                  <div className="mp-field">
                    <label className="mp-label">Due date</label>
                    <input className="mp-input" type="date" value={pDueDate} onChange={(e) => setPDueDate(e.target.value)} />
                  </div>
                </div>
                <div className="mp-form-btns">
                  <button className="mp-save" onClick={guardarProyecto} disabled={!pTitulo.trim()}>Create project</button>
                  <button className="mp-cancel" onClick={() => { setMostrarFormProyecto(false); resetFormProyecto() }}>Cancel</button>
                </div>
              </div>
            )}

            {editandoProyecto && (
              <div className="mp-form">
                <p className="mp-form-title">Editing — {editandoProyecto.titulo}</p>
                <div className="mp-row2">
                  <div className="mp-field">
                    <label className="mp-label">Title</label>
                    <input className="mp-input" type="text" value={pTitulo} onChange={(e) => setPTitulo(e.target.value)} />
                  </div>
                  <div className="mp-field">
                    <label className="mp-label">Type</label>
                    <select className="mp-input" value={pTipo} onChange={(e) => setPTipo(e.target.value)}>
                      <option>Libro</option>
                      <option>Poster</option>
                      <option>Flyer</option>
                      <option>Infographic</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="mp-field">
                  <label className="mp-label">Description</label>
                  <textarea className="mp-textarea" value={pDescripcion} onChange={(e) => setPDescripcion(e.target.value)} />
                </div>
                <div className="mp-row2">
                  <div className="mp-field">
                    <label className="mp-label">Canva link</label>
                    <input className="mp-input" type="url" value={pCanva} onChange={(e) => setPCanva(e.target.value)} />
                  </div>
                  <div className="mp-field">
                    <label className="mp-label">Due date</label>
                    <input className="mp-input" type="date" value={pDueDate} onChange={(e) => setPDueDate(e.target.value)} />
                  </div>
                </div>
                <div className="mp-form-btns">
                  <button className="mp-save" onClick={guardarProyecto}>Save changes</button>
                  <button className="mp-cancel" onClick={() => { setEditandoProyecto(null); resetFormProyecto() }}>Cancel</button>
                </div>
              </div>
            )}

            {proyectos.length === 0 && !mostrarFormProyecto && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No projects yet.</p>
            )}

            {proyectos.map(p => {
              const abierto = proyectoAbierto === p.id
              const tareasProy = tareasDeProyecto(p.id)
              const disponibles = tareasProy.filter(t => t.estado === 'disponible').length
              const enProgreso = tareasProy.filter(t => t.estado === 'en progreso').length
              const completadas = tareasProy.filter(t => t.estado === 'completado').length
              const lates = tareasProy.filter(t => t.estado === 'en progreso' && esPasado(t.due_date)).length

              return (
                <div key={p.id} className="mp-card">
                  <div className="mp-card-header" onClick={() => setProyectoAbierto(abierto ? null : p.id)}>
                    <div className="mp-tipo-badge">{p.tipo}</div>
                    <div className="mp-card-info">
                      <p className="mp-card-title">{p.titulo}</p>
                      <p className="mp-card-sub">
                        Due {formatFecha(p.due_date)} · {disponibles} available · {enProgreso} in progress · {completadas} done
                        {lates > 0 && ` · ${lates} late`}
                      </p>
                    </div>
                    <div className="mp-card-right">
                      {lates > 0 && <span className="mp-badge badge-late">🚨 {lates}</span>}
                      {esAdmin && (
                        <>
                          <button className="mp-edit-btn" onClick={(e) => {
                            e.stopPropagation()
                            setEditandoProyecto(p)
                            setPTitulo(p.titulo); setPTipo(p.tipo); setPDescripcion(p.descripcion || '')
                            setPCanva(p.link_canva || ''); setPDueDate(p.due_date || '')
                            setMostrarFormProyecto(false)
                          }}>
                            <i className="ti ti-edit" aria-hidden="true"></i>
                          </button>
                          <button className="mp-delete-btn" onClick={(e) => { e.stopPropagation(); eliminarProyecto(p.id) }}>
                            <i className="ti ti-trash" aria-hidden="true"></i>
                          </button>
                        </>
                      )}
                      <i className={`ti ${abierto ? 'ti-chevron-up' : 'ti-chevron-down'} mp-chevron`} aria-hidden="true"></i>
                    </div>
                  </div>

                  {abierto && (
                    <div className="mp-card-body">
                      {p.descripcion && (
                        <div className="mp-field-row" style={{marginBottom:'10px'}}>
                          <p className="mp-field-label">Description</p>
                          <p className="mp-field-value">{p.descripcion}</p>
                        </div>
                      )}
                      {p.link_canva && (
                        <div className="mp-field-row" style={{marginBottom:'12px'}}>
                          <p className="mp-field-label">Canva</p>
                          <a href={p.link_canva} target="_blank" rel="noreferrer" style={{fontSize:'13px', color:'#2d2a86'}}>
                            Open Canva <i className="ti ti-external-link" style={{fontSize:'11px'}} aria-hidden="true"></i>
                          </a>
                        </div>
                      )}
                      {esAdmin && (
                        <div style={{marginBottom:'10px'}}>
                          <button className="mp-save" style={{fontSize:'12px', padding:'6px 14px'}} onClick={() => { setMostrarFormTarea(p.id); resetFormTarea() }}>
                            + Add task
                          </button>
                        </div>
                      )}
                      {mostrarFormTarea === p.id && (
                        <div className="mp-form" style={{marginBottom:'10px'}}>
                          <p className="mp-form-title">New task</p>
                          <div className="mp-field">
                            <label className="mp-label">Task title</label>
                            <input className="mp-input" type="text" placeholder="e.g. Pages 1–5 illustrations" value={tTitulo} onChange={(e) => setTTitulo(e.target.value)} />
                          </div>
                          <div className="mp-field">
                            <label className="mp-label">Requirements</label>
                            <textarea className="mp-textarea" placeholder="What needs to be done..." value={tRequirements} onChange={(e) => setTRequirements(e.target.value)} />
                          </div>
                          <div className="mp-row2">
                            <div className="mp-field">
                              <label className="mp-label">Canva link (optional)</label>
                              <input className="mp-input" type="url" placeholder="https://canva.com/..." value={tCanva} onChange={(e) => setTCanva(e.target.value)} />
                            </div>
                            <div className="mp-field">
                              <label className="mp-label">Due date</label>
                              <input className="mp-input" type="date" value={tDueDate} onChange={(e) => setTDueDate(e.target.value)} />
                            </div>
                          </div>
                          <div className="mp-form-btns">
                            <button className="mp-save" onClick={() => guardarTarea(p.id)} disabled={!tTitulo.trim()}>Add task</button>
                            <button className="mp-cancel" onClick={() => { setMostrarFormTarea(null); resetFormTarea() }}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {tareasProy.length === 0 && (
                        <p style={{fontSize:'12px', color:'#aaa', textAlign:'center', padding:'1rem 0'}}>No tasks yet.</p>
                      )}
                      {tareasProy.map(t => renderTarea(t, true))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'mine' && !esAdmin && (
          <div>
            {misTareas.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No tasks in progress.</p>
            )}
            {misTareas.map(t => renderTarea(t, false))}
          </div>
        )}

        {tab === 'late' && (
          <div>
            {tareasLate.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No late tasks.</p>
            )}
            {tareasLate.map(t => renderTarea(t, false))}
          </div>
        )}

        {tab === 'done' && (
          <div>
            {tareasCompletadas.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>Nothing completed yet.</p>
            )}
            {tareasCompletadas.map(t => renderTarea(t, false))}
          </div>
        )}

      </div>
    </div>
  )
}

export default MyProjects