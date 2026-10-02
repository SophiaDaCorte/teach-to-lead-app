import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './AdminReports.css'

function formatWeek(dateStr) {
  const start = new Date(dateStr + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 4)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function formatFecha(fecha) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function AdminReports() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tab, setTab] = useState('pending')
  const [reportes, setReportes] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [aprobando, setAprobando] = useState(null)
  const [horasInput, setHorasInput] = useState('0')
  const [observaciones, setObservaciones] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [comunidadAbierta, setComunidadAbierta] = useState(null)
  const [obsExpandida, setObsExpandida] = useState(null)
  const [comentando, setComentando] = useState(null)
  const [comentarioInput, setComentarioInput] = useState('')
  const [guardandoComentario, setGuardandoComentario] = useState(false)

  useEffect(() => {
    cargarReportes()
    cargarObservaciones()
    cargarComunidades()
  }, [])

  async function cargarReportes() {
    const { data } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('created_at', { ascending: false })
    setReportes(data || [])
  }

  async function cargarObservaciones() {
    const { data } = await supabase
      .from('observaciones_clase')
      .select('*')
      .order('fecha', { ascending: false })
    setObservaciones(data || [])
  }

  async function cargarComunidades() {
    const { data } = await supabase
      .from('comunidades')
      .select('*')
      .order('nombre')
    setComunidades(data || [])
  }

  function iniciarAprobacion(r) {
    setAprobando(r.id)
    setHorasInput('0')
  }

  async function confirmarAprobacion(r) {
    const horasExtra = Number(horasInput) || 0
    const horasAutomaticas = r.enviado_a_tiempo ? 2 : 1
    const totalAgregar = horasAutomaticas + horasExtra

    await supabase
      .from('weekly_reports')
      .update({ estado: 'aprobado' })
      .eq('id', r.id)

    const { data: horasData } = await supabase
      .from('horas')
      .select('*')
      .eq('user_id', r.user_id)
      .single()

    if (horasData) {
      await supabase
        .from('horas')
        .update({ content_hrs: horasData.content_hrs + totalAgregar })
        .eq('user_id', r.user_id)
    }

    setAprobando(null)
    setHorasInput('0')
    await cargarReportes()
  }

  async function eliminarReporte(id) {
    await supabase.from('weekly_reports').delete().eq('id', id)
    await cargarReportes()
  }

  async function guardarComentario(obs) {
    if (!comentarioInput.trim()) return
    setGuardandoComentario(true)
    await supabase
      .from('observaciones_clase')
      .update({
        comentario_admin: comentarioInput,
        fecha_comentario: new Date().toISOString(),
        leido_por_director: false
      })
      .eq('id', obs.id)
    setComentando(null)
    setComentarioInput('')
    setGuardandoComentario(false)
    await cargarObservaciones()
  }

  async function eliminarObservacion(id) {
    await supabase.from('observaciones_clase').delete().eq('id', id)
    setObservaciones(observaciones.filter(o => o.id !== id))
  }

  const filtrados = reportes.filter(r =>
    tab === 'pending' ? r.estado === 'pendiente' : r.estado === 'aprobado'
  )
  const pendingCount = reportes.filter(r => r.estado === 'pendiente').length
  const obsUnread = observaciones.filter(o => o.comentario_admin && !o.leido_por_director).length

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="ar-content">
        <button className="ar-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="ar-title">Reports & observations</h1>

        <div className="ar-tabs">
          <button className={`ar-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending {pendingCount > 0 && <span className="ar-badge">{pendingCount}</span>}
          </button>
          <button className={`ar-tab ${tab === 'approved' ? 'active' : ''}`} onClick={() => setTab('approved')}>
            Approved
          </button>
          <button className={`ar-tab ${tab === 'observations' ? 'active' : ''}`} onClick={() => setTab('observations')}>
            Observations {obsUnread > 0 && <span className="ar-badge">{obsUnread} unread</span>}
          </button>
        </div>

        {(tab === 'pending' || tab === 'approved') && (
          <div>
            <div className="ar-stats">
              <div className="ar-stat">
                <div className="ar-stat-n pending">{pendingCount}</div>
                <div className="ar-stat-l">Pending</div>
              </div>
              <div className="ar-stat">
                <div className="ar-stat-n approved">{reportes.filter(r => r.estado === 'aprobado').length}</div>
                <div className="ar-stat-l">Approved</div>
              </div>
            </div>

            {filtrados.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>
                No {tab === 'pending' ? 'pending' : 'approved'} reports.
              </p>
            )}

            {filtrados.map(r => (
              <div key={r.id} className="ar-card">
                <div className="ar-card-header" onClick={() => setExpandido(expandido === r.id ? null : r.id)}>
                  <div className="ar-avatar">
                    {r.nombre_voluntario?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="ar-info">
                    <p className="ar-name">{r.nombre_voluntario}</p>
                    <p className="ar-week">{formatWeek(r.semana_inicio)} · {r.enviado_a_tiempo ? '+2 hrs auto' : '+1 hr auto'}</p>
                  </div>
                  <div className="ar-actions">
                    {r.estado === 'pendiente' && (
                      aprobando === r.id ? (
                        <div style={{display:'flex', alignItems:'center', gap:'6px'}} onClick={e => e.stopPropagation()}>
                          <span style={{fontSize:'11px', color:'#aaa', whiteSpace:'nowrap'}}>+{r.enviado_a_tiempo ? '2' : '1'} auto</span>
                          <input
                            type="number"
                            min="0"
                            value={horasInput}
                            onChange={(e) => setHorasInput(e.target.value)}
                            style={{width:'48px', padding:'4px 8px', border:'0.5px solid #bbf7d0', borderRadius:'6px', fontSize:'13px', textAlign:'center', fontFamily:'Poppins,sans-serif', color:'#1a1a1a', background:'white'}}
                          />
                          <span style={{fontSize:'11px', color:'#aaa'}}>extra</span>
                          <button className="ar-approve" onClick={(e) => { e.stopPropagation(); confirmarAprobacion(r) }}>
                            <i className="ti ti-check" aria-hidden="true"></i> Confirm
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setAprobando(null) }} style={{background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:'13px', padding:'0'}}>✕</button>
                        </div>
                      ) : (
                        <button className="ar-approve" onClick={(e) => { e.stopPropagation(); iniciarAprobacion(r) }}>
                          <i className="ti ti-check" aria-hidden="true"></i> Approve
                        </button>
                      )
                    )}
                    <button className="ar-delete" onClick={(e) => { e.stopPropagation(); eliminarReporte(r.id) }}>
                      <i className="ti ti-trash" aria-hidden="true"></i>
                    </button>
                    <i className={`ti ${expandido === r.id ? 'ti-chevron-up' : 'ti-chevron-down'} ar-chevron`} aria-hidden="true"></i>
                  </div>
                </div>

                {expandido === r.id && (
                  <div className="ar-card-body">
                    <div className="ar-field">
                      <p className="ar-field-label">What they worked on</p>
                      <p className="ar-field-value">{r.que_hice || '—'}</p>
                    </div>
                    <div className="ar-field">
                      <p className="ar-field-label">Checklist completed</p>
                      <p className="ar-field-value">{r.checklist_completado || '—'}</p>
                    </div>
                    {r.desafios && (
                      <div className="ar-field">
                        <p className="ar-field-label">Challenges</p>
                        <p className="ar-field-value">{r.desafios}</p>
                      </div>
                    )}
                    <div className="ar-field">
                      <p className="ar-field-label">Focus for next week</p>
                      <p className="ar-field-value">{r.proxima_semana || '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'observations' && (
          <div>
            {observaciones.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No observations yet.</p>
            )}

            {comunidades.map(c => {
              const obs = observaciones.filter(o => o.comunidad === c.nombre)
              if (obs.length === 0) return null
              const abierta = comunidadAbierta === c.id
              return (
                <div key={c.id} className="ar-card" style={{marginBottom:'8px'}}>
                  <div className="ar-card-header" onClick={() => setComunidadAbierta(abierta ? null : c.id)}>
                    <div className="ar-avatar">🎒</div>
                    <div className="ar-info">
                      <p className="ar-name">{c.nombre} {c.nivel}</p>
                      <p className="ar-week">{obs.length} observation{obs.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className="ar-actions">
                      {obs.some(o => o.comentario_admin && !o.leido_por_director) && (
                        <span style={{fontSize:'10px', background:'#fffbeb', color:'#92400e', padding:'2px 6px', borderRadius:'4px', fontWeight:600}}>Unread</span>
                      )}
                      <i className={`ti ${abierta ? 'ti-chevron-up' : 'ti-chevron-down'} ar-chevron`} aria-hidden="true"></i>
                    </div>
                  </div>

                  {abierta && (
                    <div>
                      {obs.map(o => (
                        <div key={o.id} style={{borderTop:'0.5px solid #eee'}}>
                          <div className="ar-card-header" onClick={() => setObsExpandida(obsExpandida === o.id ? null : o.id)}>
                            <div className="ar-avatar" style={{width:'28px', height:'28px', fontSize:'10px'}}>
                              {o.nombre_observador?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                            <div className="ar-info">
                              <p className="ar-name" style={{fontSize:'12px'}}>{o.nombre_observador}</p>
                              <p className="ar-week">{formatFecha(o.fecha)} · {o.nombre_tutor || 'Sin tutor'}</p>
                              {o.comentario_admin && !o.leido_por_director && (
                                <span style={{fontSize:'10px', color:'#92400e', fontWeight:600}}>Pending read</span>
                              )}
                              {o.comentario_admin && o.leido_por_director && (
                                <span style={{fontSize:'10px', color:'#15803d', fontWeight:600}}>✓ Read by director</span>
                              )}
                            </div>
                            <div className="ar-actions">
                              <button className="ar-delete" onClick={(e) => { e.stopPropagation(); eliminarObservacion(o.id) }}>
                                <i className="ti ti-trash" aria-hidden="true"></i>
                              </button>
                              <i className={`ti ${obsExpandida === o.id ? 'ti-chevron-up' : 'ti-chevron-down'} ar-chevron`} aria-hidden="true"></i>
                            </div>
                          </div>

                          {obsExpandida === o.id && (
                            <div className="ar-card-body">
                              {o.que_observaste && (
                                <div className="ar-field">
                                  <p className="ar-field-label">What was observed</p>
                                  <p className="ar-field-value">{o.que_observaste}</p>
                                </div>
                              )}
                              {o.como_estuvo_tutor && (
                                <div className="ar-field">
                                  <p className="ar-field-label">How was the tutor</p>
                                  <p className="ar-field-value">{o.como_estuvo_tutor}</p>
                                </div>
                              )}
                              {o.como_respondieron_estudiantes && (
                                <div className="ar-field">
                                  <p className="ar-field-label">Student response</p>
                                  <p className="ar-field-value">{o.como_respondieron_estudiantes}</p>
                                </div>
                              )}
                              {o.areas_mejora && (
                                <div className="ar-field">
                                  <p className="ar-field-label">Areas for improvement</p>
                                  <p className="ar-field-value">{o.areas_mejora}</p>
                                </div>
                              )}

                              {o.comentario_admin && (
                                <div className="ar-field" style={{background:'#EEEDFE', borderRadius:'8px', padding:'10px 12px'}}>
                                  <p className="ar-field-label" style={{color:'#3C3489'}}>Your comment</p>
                                  <p className="ar-field-value" style={{color:'#3C3489'}}>{o.comentario_admin}</p>
                                  <p style={{fontSize:'11px', color:'#3C3489', margin:'6px 0 0', opacity:0.7}}>
                                    {o.leido_por_director ? '✓ Read by director' : 'Not yet read'}
                                  </p>
                                </div>
                              )}

                              {comentando === o.id ? (
                                <div style={{marginTop:'10px'}}>
                                  <textarea
                                    style={{width:'100%', minHeight:'72px', padding:'8px 12px', border:'0.5px solid #eee', borderRadius:'8px', fontFamily:'Poppins,sans-serif', fontSize:'13px', resize:'vertical', outline:'none', boxSizing:'border-box', color:'#1a1a1a', background:'white', colorScheme:'light'}}
                                    placeholder="Write your comment..."
                                    value={comentarioInput}
                                    onChange={(e) => setComentarioInput(e.target.value)}
                                  />
                                  <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
                                    <button
                                      onClick={() => guardarComentario(o)}
                                      disabled={guardandoComentario || !comentarioInput.trim()}
                                      style={{padding:'7px 16px', borderRadius:'999px', border:'none', background:'#a9cb5a', color:'#1a1a1a', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'Poppins,sans-serif'}}
                                    >
                                      {guardandoComentario ? 'Saving...' : 'Save comment'}
                                    </button>
                                    <button
                                      onClick={() => { setComentando(null); setComentarioInput('') }}
                                      style={{padding:'7px 12px', borderRadius:'999px', border:'0.5px solid #eee', background:'none', fontSize:'12px', color:'#aaa', cursor:'pointer', fontFamily:'Poppins,sans-serif'}}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setComentando(o.id); setComentarioInput(o.comentario_admin || '') }}
                                  style={{marginTop:'10px', padding:'6px 14px', borderRadius:'999px', border:'0.5px solid #eee', background:'none', fontSize:'12px', color:'#2d2a86', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:500}}
                                >
                                  {o.comentario_admin ? '✏️ Edit comment' : '💬 Add comment'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminReports