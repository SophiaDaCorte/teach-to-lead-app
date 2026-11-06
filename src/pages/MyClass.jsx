import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { cargarComunidadesTutor } from '../tutor.js'
import SelectorComunidad from '../components/SelectorComunidad.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './MyClass.css'

const DIAS_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function MyClass() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [comunidades, setComunidades] = useState([])
  const [comunidadSeleccionada, setComunidadSeleccionada] = useState(null)
  const [estudiantes, setEstudiantes] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [columnas, setColumnas] = useState([])
  const [notas, setNotas] = useState([])
  const [clases, setClases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('attendance')
  const [gradebookTab, setGradebookTab] = useState('tareas')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [columnaAbierta, setColumnaAbierta] = useState(null)
  const [mostrarFormColumna, setMostrarFormColumna] = useState(false)
  const [razonExcusa, setRazonExcusa] = useState({})
  const [notasInput, setNotasInput] = useState({})

  const [cTitulo, setCTitulo] = useState('')
  const [cTipo, setCTipo] = useState('actividad')
  const [cMaxScore, setCMaxScore] = useState(100)
  const [cFecha, setCFecha] = useState('')

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id
      setUserId(uid)

      const { data: p } = await supabase.from('perfiles').select('roles').eq('id', uid).maybeSingle()
      const coms = await cargarComunidadesTutor(uid, p?.roles || [])
      setComunidades(coms)

      if (coms.length > 0) {
        const primera = coms.find(c => c.esMia) || coms[0]
        setComunidadSeleccionada(primera)
        await cargarEstudiantes(primera)
        await cargarClases(primera.nombre)
      }
      setCargando(false)
    }
    cargarDatos()
  }, [])

  async function cargarClases(nombre) {
    const { data } = await supabase.from('clases').select('*').eq('comunidad', nombre)
    setClases(data || [])
  }

  async function cargarEstudiantes(com) {
    const { data: ests } = await supabase.from('perfiles').select('*')
      .eq('comunidad', com.nombre).eq('nivel', com.nivel).contains('roles', ['estudiante'])
    setEstudiantes(ests || [])

    const ids = (ests || []).map(e => e.id)
    if (ids.length > 0) {
      const { data: asist } = await supabase.from('asistencia').select('*').in('estudiante_id', ids)
      setAsistencias(asist || [])
      const { data: notasData } = await supabase.from('gradebook_notas').select('*').in('estudiante_id', ids)
      setNotas(notasData || [])
    } else { setAsistencias([]); setNotas([]) }

    const { data: cols } = await supabase.from('gradebook_columnas').select('*')
      .eq('comunidad', com.nombre).order('created_at', { ascending: true })
    setColumnas(cols || [])
  }

  async function cambiarComunidad(comId) {
    const com = comunidades.find(c => c.id === comId)
    if (!com) return
    setComunidadSeleccionada(com)
    setColumnaAbierta(null)
    await cargarEstudiantes(com)
    await cargarClases(com.nombre)
  }

  async function recargar() {
    if (comunidadSeleccionada) {
      await cargarEstudiantes(comunidadSeleccionada)
      await cargarClases(comunidadSeleccionada.nombre)
    }
  }

  const diaFecha = DIAS_JS[new Date(fecha + 'T12:00:00').getDay()]
  const esClase = clases.some(c => c.dia_semana === diaFecha)

  async function guardarAsistencia(estudianteId, tipo, razon = null) {
    if (!esClase) return
    const existing = asistencias.find(a => a.estudiante_id === estudianteId && a.clase_fecha === fecha)
    const data = {
      estudiante_id: estudianteId, clase_fecha: fecha,
      presente: tipo === 'presente', excusada: tipo === 'excusada',
      razon_excusa: tipo === 'excusada' ? razon : null, creado_por: userId
    }
    if (existing) { await supabase.from('asistencia').update(data).eq('id', existing.id) }
    else { await supabase.from('asistencia').insert(data) }
    const ids = estudiantes.map(e => e.id)
    const { data: asist } = await supabase.from('asistencia').select('*').in('estudiante_id', ids)
    setAsistencias(asist || [])
  }

  async function crearColumna() {
    if (!cTitulo.trim() || !comunidadSeleccionada) return
    const { data: col } = await supabase.from('gradebook_columnas').insert({
      comunidad: comunidadSeleccionada.nombre, titulo: cTitulo, tipo: cTipo,
      max_score: cMaxScore, fecha: cFecha || null,
      tutor_id: comunidadSeleccionada.tutor_id || userId
    }).select().single()

    if (col && estudiantes.length > 0) {
      await supabase.from('gradebook_notas').insert(
        estudiantes.map(e => ({ columna_id: col.id, estudiante_id: e.id, nombre_estudiante: e.nombre, estado: 'missing' }))
      )
    }
    setCTitulo(''); setCTipo('actividad'); setCMaxScore(100); setCFecha('')
    setMostrarFormColumna(false)
    await recargar()
  }

  async function guardarNota(notaId) {
    const nota = Number(notasInput[notaId])
    if (isNaN(nota)) return
    await supabase.from('gradebook_notas').update({ nota, estado: 'calificado', updated_at: new Date().toISOString() }).eq('id', notaId)
    const ids = estudiantes.map(e => e.id)
    const { data: notasData } = await supabase.from('gradebook_notas').select('*').in('estudiante_id', ids)
    setNotas(notasData || [])
    setNotasInput({})
  }

  async function eliminarColumna(id) {
    await supabase.from('gradebook_notas').delete().eq('columna_id', id)
    await supabase.from('gradebook_columnas').delete().eq('id', id)
    setColumnas(columnas.filter(c => c.id !== id))
    setNotas(notas.filter(n => n.columna_id !== id))
  }

  function getAsistencia(estudianteId) {
    return asistencias.find(a => a.estudiante_id === estudianteId && a.clase_fecha === fecha)
  }

  function formatFecha(f) {
    if (!f) return '—'
    return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function badgeNota(estado) {
    if (estado === 'missing') return <span className="mc-badge badge-missing">Missing</span>
    if (estado === 'entregado') return <span className="mc-badge badge-submitted">Submitted</span>
    if (estado === 'calificado') return <span className="mc-badge badge-graded">Graded</span>
  }

  const presentesHoy = estudiantes.filter(e => getAsistencia(e.id)?.presente).length
  const tareas = columnas.filter(c => c.tipo === 'tarea')
  const actividades = columnas.filter(c => c.tipo === 'actividad')

  function renderColumna(col) {
    const abierta = columnaAbierta === col.id
    const notasCol = notas.filter(n => n.columna_id === col.id)
    const missing = notasCol.filter(n => n.estado === 'missing').length
    const entregado = notasCol.filter(n => n.estado === 'entregado').length
    const calificado = notasCol.filter(n => n.estado === 'calificado').length

    return (
      <div key={col.id} className="mc-card" style={{marginBottom:'8px'}}>
        <div className="mc-card-header" onClick={() => setColumnaAbierta(abierta ? null : col.id)}>
          <div style={{flex:1}}>
            <p style={{fontSize:'13px', fontWeight:500, color:'#1a1a1a', margin:'0 0 2px'}}>{col.titulo}</p>
            <p style={{fontSize:'11px', color:'#aaa', margin:0}}>
              {formatFecha(col.fecha)} · Max {col.max_score} · {missing} missing · {entregado} submitted · {calificado} graded
            </p>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
            <button style={{padding:'4px 7px', borderRadius:'6px', border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:'13px', cursor:'pointer'}}
              onClick={(e) => { e.stopPropagation(); eliminarColumna(col.id) }}>
              <i className="ti ti-trash" aria-hidden="true"></i>
            </button>
            <i className={`ti ${abierta ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{fontSize:'14px', color:'#aaa'}} aria-hidden="true"></i>
          </div>
        </div>
        {abierta && (
          <div style={{borderTop:'0.5px solid #eee'}}>
            {notasCol.map(n => (
              <div key={n.id} style={{padding:'10px 16px', borderBottom:'0.5px solid #f5f5f5', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                <div className="mc-avatar" style={{width:'28px', height:'28px', fontSize:'10px'}}>
                  {n.nombre_estudiante?.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1, minWidth:'100px'}}>
                  <p style={{fontSize:'13px', fontWeight:500, margin:0}}>{n.nombre_estudiante}</p>
                  {n.url_entregado && (
                    <a href={n.url_entregado} target="_blank" rel="noreferrer" style={{fontSize:'11px', color:'#2d2a86'}}>
                      View submission <i className="ti ti-external-link" style={{fontSize:'10px'}} aria-hidden="true"></i>
                    </a>
                  )}
                </div>
                {badgeNota(n.estado)}
                {n.estado === 'calificado' && (
                  <span style={{fontSize:'13px', fontWeight:600, color:'#15803d'}}>{n.nota}/{col.max_score} ({Math.round((n.nota/col.max_score)*100)}%)</span>
                )}
                <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                  <input
                    type="number" min="0" max={col.max_score} placeholder="—"
                    value={notasInput[n.id] || ''}
                    onChange={(e) => setNotasInput({...notasInput, [n.id]: e.target.value})}
                    style={{width:'55px', padding:'5px 8px', border:'0.5px solid #eee', borderRadius:'6px', fontSize:'12px', fontFamily:'Poppins,sans-serif', color:'#1a1a1a', background:'white'}}
                  />
                  <button onClick={() => guardarNota(n.id)} disabled={!notasInput[n.id]}
                    style={{padding:'5px 10px', borderRadius:'6px', border:'none', background:'#a9cb5a', color:'#1a1a1a', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif'}}>
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="mc-content">
        <button className="mc-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="mc-title">My class</h1>

        {cargando && <p style={{color:'#aaa', fontSize:'14px'}}>Loading...</p>}

        {!cargando && comunidades.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No community assigned yet.</p>
        )}

        {comunidades.length > 0 && (
          <>
            {comunidades.length > 1 && (
              <div style={{marginBottom:'1.25rem'}}>
                <label className="mc-label">Select community</label>
                <SelectorComunidad
                  className="mc-input"
                  comunidades={comunidades}
                  valor={comunidadSeleccionada?.id}
                  onChange={cambiarComunidad}
                  style={{maxWidth:'340px'}}
                />
              </div>
            )}

            {comunidadSeleccionada && !comunidadSeleccionada.esMia && (
              <div style={{background:'#EEEDFE', border:'0.5px solid #c7d2fe', borderRadius:'10px', padding:'10px 14px', marginBottom:'1rem'}}>
                <p style={{fontSize:'12px', color:'#3C3489', margin:0, fontWeight:500}}>
                  👁️ You're viewing {comunidadSeleccionada.tutor_nombre ? `${comunidadSeleccionada.tutor_nombre}'s` : 'an unassigned'} class as staff. Changes you make are saved for that class.
                </p>
              </div>
            )}

            {comunidadSeleccionada && (
              <p className="mc-sub">{comunidadSeleccionada.nombre} · {comunidadSeleccionada.nivel} · {estudiantes.length} students</p>
            )}

            <div className="mc-tabs">
              <button className={`mc-tab ${tab === 'attendance' ? 'active' : ''}`} onClick={() => setTab('attendance')}>Attendance</button>
              <button className={`mc-tab ${tab === 'gradebook' ? 'active' : ''}`} onClick={() => setTab('gradebook')}>Gradebook</button>
            </div>

            {tab === 'attendance' && (
              <div>
                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'1rem'}}>
                  <input className="mc-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{width:'auto'}} />
                  <span style={{fontSize:'13px', color:'#aaa'}}>{presentesHoy}/{estudiantes.length} present</span>
                </div>

                {!esClase && (
                  <div style={{background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:'10px', padding:'10px 14px', marginBottom:'1rem'}}>
                    <p style={{fontSize:'13px', color:'#92400e', margin:0, fontWeight:500}}>
                      ⚠️ No class on {diaFecha} — attendance disabled.
                    </p>
                    <p style={{fontSize:'11px', color:'#92400e', margin:'4px 0 0', opacity:0.8}}>
                      {clases.length > 0
                        ? `Class days: ${[...new Set(clases.map(c => c.dia_semana))].join(', ')}`
                        : 'Set up the schedule in My Schedule to enable attendance.'}
                    </p>
                  </div>
                )}

                {estudiantes.length === 0 && <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'2rem'}}>No students in this community.</p>}

                {estudiantes.map(e => {
                  const asist = getAsistencia(e.id)
                  return (
                    <div key={e.id} className="mc-card" style={{marginBottom:'6px', opacity: esClase ? 1 : 0.5}}>
                      <div className="mc-card-row">
                        <div className="mc-avatar">{e.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
                        <div className="mc-info"><p className="mc-name">{e.nombre}</p></div>
                        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                          <button onClick={() => guardarAsistencia(e.id, 'presente')} className={`mc-att-btn ${asist?.presente ? 'mc-att-present' : ''}`} disabled={!esClase}>Present</button>
                          <button onClick={() => guardarAsistencia(e.id, 'ausente')} className={`mc-att-btn ${asist && !asist.presente && !asist.excusada ? 'mc-att-absent' : ''}`} disabled={!esClase}>Absent</button>
                          <button onClick={() => setRazonExcusa(prev => ({...prev, [e.id]: prev[e.id] === undefined ? '' : undefined}))} className={`mc-att-btn ${asist?.excusada ? 'mc-att-excused' : ''}`} disabled={!esClase}>Excused</button>
                        </div>
                      </div>
                      {razonExcusa[e.id] !== undefined && (
                        <div style={{padding:'8px 12px', borderTop:'0.5px solid #eee', display:'flex', gap:'8px'}}>
                          <input className="mc-input" type="text" placeholder="Reason..." style={{flex:1}} value={razonExcusa[e.id]} onChange={(ev) => setRazonExcusa(prev => ({...prev, [e.id]: ev.target.value}))} />
                          <button className="mc-save" style={{padding:'6px 14px'}} onClick={() => { guardarAsistencia(e.id, 'excusada', razonExcusa[e.id]); setRazonExcusa(prev => ({...prev, [e.id]: undefined})) }}>Save</button>
                        </div>
                      )}
                      {asist?.excusada && asist?.razon_excusa && (
                        <div style={{padding:'6px 16px', borderTop:'0.5px solid #eee'}}>
                          <p style={{fontSize:'11px', color:'#3C3489', margin:0}}>Excused: {asist.razon_excusa}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'gradebook' && (
              <div>
                <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'1rem'}}>
                  <button className="mc-new-btn" onClick={() => setMostrarFormColumna(!mostrarFormColumna)}>
                    {mostrarFormColumna ? 'Cancel' : '+ New column'}
                  </button>
                </div>

                {mostrarFormColumna && (
                  <div className="mc-form">
                    <p className="mc-form-title">New column</p>
                    <div className="mc-row2">
                      <div className="mc-field">
                        <label className="mc-label">Title</label>
                        <input className="mc-input" type="text" placeholder="e.g. Quiz 1" value={cTitulo} onChange={(e) => setCTitulo(e.target.value)} />
                      </div>
                      <div className="mc-field">
                        <label className="mc-label">Type</label>
                        <select className="mc-input" value={cTipo} onChange={(e) => setCTipo(e.target.value)}>
                          <option value="tarea">Tarea (students submit)</option>
                          <option value="actividad">Activity (teacher grades only)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mc-row2">
                      <div className="mc-field">
                        <label className="mc-label">Max score</label>
                        <input className="mc-input" type="number" min="1" value={cMaxScore} onChange={(e) => setCMaxScore(Number(e.target.value))} />
                      </div>
                      <div className="mc-field">
                        <label className="mc-label">Date</label>
                        <input className="mc-input" type="date" value={cFecha} onChange={(e) => setCFecha(e.target.value)} />
                      </div>
                    </div>
                    <div className="mc-form-btns">
                      <button className="mc-save" onClick={crearColumna} disabled={!cTitulo.trim()}>Create</button>
                      <button className="mc-cancel" onClick={() => setMostrarFormColumna(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                <div style={{display:'flex', gap:'4px', background:'#f9f9f9', borderRadius:'8px', padding:'4px', marginBottom:'1.25rem'}}>
                  {['tareas', 'actividades'].map(t => (
                    <button key={t} onClick={() => setGradebookTab(t)}
                      style={{flex:1, padding:'6px 10px', borderRadius:'6px', border: gradebookTab === t ? '0.5px solid #eee' : 'none', background: gradebookTab === t ? 'white' : 'none', fontSize:'12px', color: gradebookTab === t ? '#1a1a1a' : '#888', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight: gradebookTab === t ? 500 : 400, textTransform:'capitalize'}}>
                      {t === 'tareas' ? `Tareas (${tareas.length})` : `Actividades (${actividades.length})`}
                    </button>
                  ))}
                </div>

                {gradebookTab === 'tareas' && (
                  <div>
                    {tareas.length === 0 && <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'2rem'}}>No tareas yet.</p>}
                    {tareas.map(col => renderColumna(col))}
                  </div>
                )}

                {gradebookTab === 'actividades' && (
                  <div>
                    {actividades.length === 0 && <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'2rem'}}>No activities yet.</p>}
                    {actividades.map(col => renderColumna(col))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MyClass