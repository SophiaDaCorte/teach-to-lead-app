import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './ContentHub.css'

function formatFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function esPasado(fechaFin) {
  return new Date(fechaFin + 'T23:59:59') < new Date()
}

function diasDesdeVencimiento(fechaFin) {
  const fin = new Date(fechaFin + 'T23:59:59')
  const hoy = new Date()
  return Math.floor((hoy - fin) / (1000 * 60 * 60 * 24))
}

function ContentHub() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)
  const [esDirector, setEsDirector] = useState(false)
  const [tab, setTab] = useState('active')
  const [temas, setTemas] = useState([])
  const [advertencias, setAdvertencias] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [periodoAbierto, setPeriodoAbierto] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('Reel')
  const [periodoFin, setPeriodoFin] = useState('')
  const [periodoNumero, setPeriodoNumero] = useState(1)
  const [creando, setCreando] = useState(false)

  const [horasInput, setHorasInput] = useState({})
  const [asignandoHoras, setAsignandoHoras] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [notasInput, setNotasInput] = useState('')
  const [razonInput, setRazonInput] = useState('')
  const [subiendo, setSubiendo] = useState(null)
  const [explicando, setExplicando] = useState(null)

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

      const director = perfilData?.roles?.includes('staff_marketing')
      setEsDirector(director)

      await cargarTemas(session.session.user.id, director)
      await cargarAdvertencias(session.session.user.id, director)
    }
    cargarDatos()
  }, [])

  async function cargarTemas(uid, director) {
    const { data } = await supabase
      .from('content_hub')
      .select('*')
      .order('periodo_fin', { ascending: false })

    if (director) {
      setTemas(data || [])
    } else {
      const visibles = (data || []).filter(t =>
        t.estado === 'disponible' || t.reclamado_por === uid
      )
      setTemas(visibles)
    }
  }

  async function cargarAdvertencias(uid, director) {
    let query = supabase.from('advertencias').select('*').order('created_at', { ascending: false })
    if (!director) query = query.eq('user_id', uid)
    const { data } = await query
    setAdvertencias(data || [])
  }

  async function crearTema() {
    if (!titulo.trim() || !periodoFin) return
    setCreando(true)
    await supabase.from('content_hub').insert({
      titulo,
      tipo,
      periodo_fin: periodoFin,
      periodo_numero: periodoNumero,
      creado_por: userId,
      estado: 'disponible'
    })
    setTitulo(''); setTipo('Reel'); setPeriodoFin(''); setPeriodoNumero(1)
    setMostrarForm(false); setCreando(false)
    await cargarTemas(userId, esDirector)
  }

  async function reclamarTema(id) {
    await supabase.from('content_hub').update({
      reclamado_por: userId,
      nombre_reclamado: perfil?.nombre,
      estado: 'reclamado'
    }).eq('id', id)
    await cargarTemas(userId, esDirector)
  }

  async function subirContenido(id, esLate = false) {
    if (!urlInput.trim()) return
    if (esLate && !razonInput.trim()) return
    setSubiendo(id)
    await supabase.from('content_hub').update({
      url_contenido: urlInput,
      notas: notasInput,
      razon_no_subio: esLate ? razonInput : null,
      estado: 'entregado'
    }).eq('id', id)
    setUrlInput(''); setNotasInput(''); setRazonInput(''); setSubiendo(null); setExpandido(null)
    await cargarTemas(userId, esDirector)
  }

  async function explicarNoEntrega(id) {
    if (!razonInput.trim()) return
    await supabase.from('content_hub').update({
      razon_no_subio: razonInput,
      estado: 'explicado'
    }).eq('id', id)
    setRazonInput(''); setExplicando(null)
    await cargarTemas(userId, esDirector)
  }

  async function asignarHoras(id) {
    const horas = Number(horasInput[id]) || 0
    await supabase.from('content_hub').update({ horas_asignadas: horas }).eq('id', id)
    const tema = temas.find(t => t.id === id)
    if (tema?.reclamado_por && horas > 0) {
      const { data: horasData } = await supabase.from('horas').select('*').eq('user_id', tema.reclamado_por).single()
      if (horasData) {
        await supabase.from('horas').update({ content_hrs: horasData.content_hrs + horas }).eq('user_id', tema.reclamado_por)
      }
    }
    setAsignandoHoras(null); setHorasInput({})
    await cargarTemas(userId, esDirector)
  }

  async function eliminarTema(id) {
    const tema = temas.find(t => t.id === id)
    if (tema?.horas_asignadas > 0 && tema?.reclamado_por) {
      const { data: horasData } = await supabase.from('horas').select('*').eq('user_id', tema.reclamado_por).single()
      if (horasData) {
        await supabase.from('horas').update({
          content_hrs: Math.max(0, horasData.content_hrs - tema.horas_asignadas)
        }).eq('user_id', tema.reclamado_por)
      }
    }
    await supabase.from('content_hub').delete().eq('id', id)
    await cargarTemas(userId, esDirector)
  }

  function badgeEstado(estado) {
    if (estado === 'disponible') return <span className="ch-badge badge-available">Available</span>
    if (estado === 'reclamado') return <span className="ch-badge badge-claimed">Claimed</span>
    if (estado === 'entregado') return <span className="ch-badge badge-done">Submitted</span>
    if (estado === 'explicado') return <span className="ch-badge badge-explained">Explained</span>
    return null
  }

  function renderTema(t) {
    const esLate = esPasado(t.periodo_fin) && (t.estado === 'reclamado')
    const diasVencido = esLate ? diasDesdeVencimiento(t.periodo_fin) : 0
    const diasRestantesGracia = Math.max(0, 14 - diasVencido)

    return (
      <div key={t.id} className="ch-card">
        <div className="ch-card-header" onClick={() => setExpandido(expandido === t.id ? null : t.id)}>
          <div className="ch-tipo-badge">{t.tipo}</div>
          <div className="ch-card-info">
            <p className="ch-card-title">{t.titulo}</p>
            <p className="ch-card-sub">
              Period {t.periodo_numero} · Due {formatFecha(t.periodo_fin)}
              {t.nombre_reclamado ? ` · ${t.nombre_reclamado}` : ' · Unclaimed'}
              {esLate && ` · ${diasRestantesGracia} days left`}
            </p>
          </div>
          <div className="ch-card-right">
            {esLate
              ? <span className="ch-badge badge-late">Late</span>
              : badgeEstado(t.estado)
            }
            {esDirector && (
              <button className="ch-delete" onClick={(e) => { e.stopPropagation(); eliminarTema(t.id) }}>
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            )}
            <i className={`ti ${expandido === t.id ? 'ti-chevron-up' : 'ti-chevron-down'} ch-chevron`} aria-hidden="true"></i>
          </div>
        </div>

        {expandido === t.id && (
          <div className="ch-card-body">
            {t.url_contenido && (
              <div className="ch-field-row">
                <p className="ch-field-label">Content link</p>
                <a href={t.url_contenido} target="_blank" rel="noreferrer" className="ch-link">
                  {t.url_contenido} <i className="ti ti-external-link" style={{fontSize:'11px'}} aria-hidden="true"></i>
                </a>
              </div>
            )}
            {t.notas && (
              <div className="ch-field-row">
                <p className="ch-field-label">Notes</p>
                <p className="ch-field-value">{t.notas}</p>
              </div>
            )}
            {t.razon_no_subio && (
              <div className="ch-field-row" style={{background:'#fffbeb', borderRadius:'8px', padding:'10px 12px'}}>
                <p className="ch-field-label" style={{color:'#92400e'}}>
                  {t.estado === 'explicado' ? 'Why not submitted' : 'Late reason'}
                </p>
                <p className="ch-field-value" style={{color:'#92400e'}}>{t.razon_no_subio}</p>
              </div>
            )}
            {t.horas_asignadas > 0 && (
              <div className="ch-field-row">
                <p className="ch-field-label">Hours assigned</p>
                <p className="ch-field-value">{t.horas_asignadas} hrs</p>
              </div>
            )}

            {esDirector && (t.estado === 'entregado' || t.estado === 'explicado') && (
              asignandoHoras === t.id ? (
                <div style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'10px'}}>
                  <input
                    type="number" min="0" placeholder="0"
                    value={horasInput[t.id] || ''}
                    onChange={(e) => setHorasInput({...horasInput, [t.id]: e.target.value})}
                    style={{width:'70px', padding:'6px 10px', border:'0.5px solid #bbf7d0', borderRadius:'6px', fontSize:'13px', fontFamily:'Poppins,sans-serif', color:'#1a1a1a', background:'white'}}
                  />
                  <span style={{fontSize:'11px', color:'#aaa'}}>hrs</span>
                  <button className="ch-save" style={{padding:'6px 14px'}} onClick={() => asignarHoras(t.id)}>Assign</button>
                  <button className="ch-cancel" style={{padding:'6px 10px'}} onClick={() => setAsignandoHoras(null)}>Cancel</button>
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

            {!esDirector && t.estado === 'disponible' && (
              <button className="ch-save" style={{marginTop:'10px'}} onClick={() => reclamarTema(t.id)}>
                Claim this topic
              </button>
            )}

            {!esDirector && t.reclamado_por === userId && t.estado === 'reclamado' && !esLate && (
              <div style={{display:'flex', gap:'8px', marginTop:'10px'}}>
                {subiendo === t.id ? (
                  <div style={{width:'100%'}}>
                    <div className="ch-field" style={{marginBottom:'8px'}}>
                      <label className="ch-label">Content link</label>
                      <input className="ch-input" type="url" placeholder="https://..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
                    </div>
                    <div className="ch-field" style={{marginBottom:'8px'}}>
                      <label className="ch-label">Notes (optional)</label>
                      <input className="ch-input" type="text" placeholder="Any notes..." value={notasInput} onChange={(e) => setNotasInput(e.target.value)} />
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button className="ch-save" onClick={() => subirContenido(t.id, false)} disabled={!urlInput.trim()}>Submit</button>
                      <button className="ch-cancel" onClick={() => setSubiendo(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="ch-save" onClick={() => setSubiendo(t.id)}>Upload content</button>
                )}
              </div>
            )}

            {!esDirector && t.reclamado_por === userId && esLate && (
              <div style={{marginTop:'10px'}}>
                {subiendo === t.id ? (
                  <div>
                    <p style={{fontSize:'12px', color:'#b91c1c', marginBottom:'8px'}}>⚠️ Late submission — you must include a reason and the content link.</p>
                    <div className="ch-field" style={{marginBottom:'8px'}}>
                      <label className="ch-label">Why are you submitting late?</label>
                      <textarea className="ch-textarea" placeholder="Explain what happened..." value={razonInput} onChange={(e) => setRazonInput(e.target.value)} />
                    </div>
                    <div className="ch-field" style={{marginBottom:'8px'}}>
                      <label className="ch-label">Content link</label>
                      <input className="ch-input" type="url" placeholder="https://..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
                    </div>
                    <div className="ch-field" style={{marginBottom:'8px'}}>
                      <label className="ch-label">Notes (optional)</label>
                      <input className="ch-input" type="text" placeholder="Any notes..." value={notasInput} onChange={(e) => setNotasInput(e.target.value)} />
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button className="ch-save" onClick={() => subirContenido(t.id, true)} disabled={!urlInput.trim() || !razonInput.trim()}>Submit late</button>
                      <button className="ch-cancel" onClick={() => setSubiendo(null)}>Cancel</button>
                    </div>
                  </div>
                ) : explicando === t.id ? (
                  <div>
                    <div className="ch-field" style={{marginBottom:'8px'}}>
                      <label className="ch-label">Why couldn't you submit?</label>
                      <textarea className="ch-textarea" placeholder="Explain what happened..." value={razonInput} onChange={(e) => setRazonInput(e.target.value)} />
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button className="ch-save" onClick={() => explicarNoEntrega(t.id)} disabled={!razonInput.trim()}>Send explanation</button>
                      <button className="ch-cancel" onClick={() => setExplicando(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex', gap:'8px'}}>
                    <button className="ch-save" onClick={() => setSubiendo(t.id)}>Submit late</button>
                    <button
                      onClick={() => setExplicando(t.id)}
                      style={{padding:'7px 14px', borderRadius:'999px', border:'0.5px solid #fecaca', background:'#fef2f2', fontSize:'12px', color:'#b91c1c', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:500}}
                    >
                      Couldn't submit
                    </button>
                  </div>
                )}
                <p style={{fontSize:'11px', color:'#b91c1c', marginTop:'8px'}}>
                  {diasDesdeVencimiento(t.periodo_fin) <= 14
                    ? `⚠️ ${Math.max(0, 14 - diasDesdeVencimiento(t.periodo_fin))} days left before this counts as a warning`
                    : '🚨 Grace period expired — this will count as a warning'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const temasActivos = temas.filter(t => !esPasado(t.periodo_fin))
  const temasPasados = temas.filter(t => esPasado(t.periodo_fin) && (t.estado === 'entregado' || t.estado === 'explicado'))
  const temasLate = temas.filter(t => esPasado(t.periodo_fin) && t.estado === 'reclamado')
  const disponibles = temas.filter(t => t.estado === 'disponible' && !esPasado(t.periodo_fin))
  const misTemas = temas.filter(t => t.reclamado_por === userId && !esPasado(t.periodo_fin))
  const misPasados = temas.filter(t => t.reclamado_por === userId && esPasado(t.periodo_fin) && (t.estado === 'entregado' || t.estado === 'explicado'))
  const misLate = temas.filter(t => t.reclamado_por === userId && esPasado(t.periodo_fin) && t.estado === 'reclamado')
  const misAdvertencias = advertencias.filter(a => a.user_id === userId)

  function agruparPorPeriodo(lista) {
    const grupos = {}
    lista.forEach(t => {
      const p = t.periodo_numero || 1
      if (!grupos[p]) grupos[p] = { temas: [], fechaFin: t.periodo_fin }
      grupos[p].temas.push(t)
    })
    return Object.entries(grupos).sort((a, b) => b[0] - a[0])
  }

  const personasConMuchasAdvertencias = (() => {
    const conteo = {}
    advertencias.forEach(a => {
      if (!conteo[a.user_id]) conteo[a.user_id] = { nombre: a.nombre, count: 0 }
      conteo[a.user_id].count++
    })
    return Object.values(conteo).filter(p => p.count >= 3)
  })()

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="ch-content">
        <button className="ch-back" onClick={() => navigate('/dashboard')}>← Back</button>

        <div className="ch-topbar">
          <h1 className="ch-title">Content hub</h1>
          {esDirector && (
            <button className={`ch-new-btn ${mostrarForm ? 'active' : ''}`} onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? 'Cancel' : '+ New topic'}
            </button>
          )}
        </div>

        {esDirector && (
          <div className="ch-stats">
            <div className="ch-stat">
              <div className="ch-stat-n">{temasActivos.length}</div>
              <div className="ch-stat-l">Active</div>
            </div>
            <div className="ch-stat">
              <div className="ch-stat-n" style={{color:'#b91c1c'}}>{temasLate.length}</div>
              <div className="ch-stat-l">Late</div>
            </div>
            <div className="ch-stat">
              <div className="ch-stat-n" style={{color:'#15803d'}}>{temasPasados.length}</div>
              <div className="ch-stat-l">Submitted</div>
            </div>
          </div>
        )}

        {mostrarForm && esDirector && (
          <div className="ch-form">
            <p className="ch-form-title">New topic</p>
            <div className="ch-field">
              <label className="ch-label">Title</label>
              <input className="ch-input" type="text" placeholder="e.g. Reel — Why we teach English in Honduras" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="ch-row2">
              <div className="ch-field">
                <label className="ch-label">Type</label>
                <select className="ch-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option>Reel</option>
                  <option>Post</option>
                  <option>Story</option>
                  <option>TikTok</option>
                </select>
              </div>
              <div className="ch-field">
                <label className="ch-label">Period #</label>
                <input className="ch-input" type="number" min="1" value={periodoNumero} onChange={(e) => setPeriodoNumero(Number(e.target.value))} />
              </div>
              <div className="ch-field">
                <label className="ch-label">Due date</label>
                <input className="ch-input" type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} />
              </div>
            </div>
            <div className="ch-form-btns">
              <button className="ch-save" onClick={crearTema} disabled={creando || !titulo.trim() || !periodoFin}>
                {creando ? 'Creating...' : 'Create topic'}
              </button>
              <button className="ch-cancel" onClick={() => setMostrarForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="ch-tabs">
          {esDirector ? (
            <>
              <button className={`ch-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
                Active {temasActivos.length > 0 && <span className="ch-badge-sm">{temasActivos.length}</span>}
              </button>
              <button className={`ch-tab ${tab === 'late' ? 'active' : ''}`} onClick={() => setTab('late')}>
                Late {temasLate.length > 0 && <span className="ch-badge-sm ch-badge-red">{temasLate.length}</span>}
              </button>
              <button className={`ch-tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>Past</button>
              <button className={`ch-tab ${tab === 'warnings' ? 'active' : ''}`} onClick={() => setTab('warnings')}>
                Warnings {personasConMuchasAdvertencias.length > 0 && <span className="ch-badge-sm ch-badge-red">{personasConMuchasAdvertencias.length}</span>}
              </button>
            </>
          ) : (
            <>
              <button className={`ch-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
                Available {disponibles.length > 0 && <span className="ch-badge-sm">{disponibles.length}</span>}
              </button>
              <button className={`ch-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My topics</button>
              <button className={`ch-tab ${tab === 'late' ? 'active' : ''}`} onClick={() => setTab('late')}>
                Late {misLate.length > 0 && <span className="ch-badge-sm ch-badge-red">{misLate.length}</span>}
              </button>
              <button className={`ch-tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>Past</button>
              <button className={`ch-tab ${tab === 'warnings' ? 'active' : ''}`} onClick={() => setTab('warnings')}>
                Warnings {misAdvertencias.length > 0 && <span className="ch-badge-sm ch-badge-red">{misAdvertencias.length}</span>}
              </button>
            </>
          )}
        </div>

        {tab === 'active' && (
          <div>
            {(esDirector ? temasActivos : disponibles).length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No active topics.</p>
            )}
            {(esDirector ? temasActivos : disponibles).map(t => renderTema(t))}
          </div>
        )}

        {tab === 'mine' && !esDirector && (
          <div>
            {misTemas.length === 0 && <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No topics claimed yet.</p>}
            {misTemas.map(t => renderTema(t))}
          </div>
        )}

        {tab === 'late' && (
          <div>
            {(esDirector ? temasLate : misLate).length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No late submissions.</p>
            )}
            {(esDirector ? temasLate : misLate).map(t => renderTema(t))}
          </div>
        )}

        {tab === 'past' && (
          <div>
            {agruparPorPeriodo(esDirector ? temasPasados : misPasados).length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No past submissions yet.</p>
            )}
            {agruparPorPeriodo(esDirector ? temasPasados : misPasados).map(([periodo, grupo]) => {
              const abierto = periodoAbierto === periodo
              return (
                <div key={periodo} className="ch-card" style={{marginBottom:'8px'}}>
                  <div className="ch-card-header" onClick={() => setPeriodoAbierto(abierto ? null : periodo)}>
                    <div className="ch-tipo-badge">Period {periodo}</div>
                    <div className="ch-card-info">
                      <p className="ch-card-title">Period {periodo}</p>
                      <p className="ch-card-sub">Due {formatFecha(grupo.fechaFin)} · {grupo.temas.length} submission{grupo.temas.length !== 1 ? 's' : ''}</p>
                    </div>
                    <i className={`ti ${abierto ? 'ti-chevron-up' : 'ti-chevron-down'} ch-chevron`} aria-hidden="true"></i>
                  </div>
                  {abierto && (
                    <div style={{borderTop:'0.5px solid #eee', padding:'8px'}}>
                      {grupo.temas.map(t => renderTema(t))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'warnings' && (
          <div>
            {esDirector ? (
              (() => {
                const porPersona = {}
                advertencias.forEach(a => {
                  if (!porPersona[a.user_id]) porPersona[a.user_id] = { nombre: a.nombre, lista: [] }
                  porPersona[a.user_id].lista.push(a)
                })
                return Object.entries(porPersona).length === 0
                  ? <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No warnings.</p>
                  : Object.entries(porPersona).map(([uid, data]) => (
                    <div key={uid} className="ch-card" style={{marginBottom:'8px'}}>
                      <div className="ch-card-header" onClick={() => setExpandido(expandido === uid ? null : uid)}>
                        <div className="ch-avatar">{data.nombre?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
                        <div className="ch-card-info">
                          <p className="ch-card-title">{data.nombre}</p>
                          <p className="ch-card-sub">{data.lista.length} warning{data.lista.length !== 1 ? 's' : ''}</p>
                        </div>
                        {data.lista.length >= 3 && <span className="ch-badge badge-late">🚨 {data.lista.length} warnings</span>}
                        <i className={`ti ${expandido === uid ? 'ti-chevron-up' : 'ti-chevron-down'} ch-chevron`} aria-hidden="true"></i>
                      </div>
                      {expandido === uid && (
                        <div className="ch-card-body">
                          {data.lista.map(a => (
                            <div key={a.id} className="ch-field-row">
                              <p className="ch-field-label">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              <p className="ch-field-value">{a.razon}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              })()
            ) : (
              misAdvertencias.length === 0
                ? <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No warnings.</p>
                : misAdvertencias.map(a => (
                  <div key={a.id} className="ch-card" style={{marginBottom:'8px'}}>
                    <div className="ch-card-header">
                      <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'#b91c1c', flexShrink:0}}></div>
                      <div className="ch-card-info">
                        <p className="ch-card-title">{a.razon}</p>
                        <p className="ch-card-sub">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default ContentHub