import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './ContentHub.css'

function ContentHub() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)
  const [esDirector, setEsDirector] = useState(false)
  const [tab, setTab] = useState('topics')
  const [temas, setTemas] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('Reel')
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFin, setPeriodoFin] = useState('')
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
    }
    cargarDatos()
  }, [])

  async function cargarTemas(uid, director) {
    let query = supabase
      .from('content_hub')
      .select('*')
      .order('periodo_fin', { ascending: false })

    const { data } = await query
    if (director) {
      setTemas(data || [])
    } else {
      const visibles = (data || []).filter(t =>
        t.estado === 'disponible' || t.reclamado_por === uid
      )
      setTemas(visibles)
    }
  }

  async function crearTema() {
    if (!titulo.trim() || !periodoInicio || !periodoFin) return
    setCreando(true)
    await supabase.from('content_hub').insert({
      titulo,
      tipo,
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
      creado_por: userId,
      estado: 'disponible'
    })
    setTitulo('')
    setTipo('Reel')
    setPeriodoInicio('')
    setPeriodoFin('')
    setMostrarForm(false)
    setCreando(false)
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

  async function subirContenido(id) {
    if (!urlInput.trim()) return
    setSubiendo(id)
    await supabase.from('content_hub').update({
      url_contenido: urlInput,
      notas: notasInput,
      estado: 'entregado'
    }).eq('id', id)
    setUrlInput('')
    setNotasInput('')
    setSubiendo(null)
    setExpandido(null)
    await cargarTemas(userId, esDirector)
  }

  async function explicarNoEntrega(id) {
    if (!razonInput.trim()) return
    await supabase.from('content_hub').update({
      razon_no_subio: razonInput,
      estado: 'explicado'
    }).eq('id', id)
    setRazonInput('')
    setExplicando(null)
    await cargarTemas(userId, esDirector)
  }

  async function asignarHoras(id) {
    const horas = Number(horasInput[id]) || 0
    await supabase.from('content_hub').update({
      horas_asignadas: horas
    }).eq('id', id)

    const tema = temas.find(t => t.id === id)
    if (tema?.reclamado_por && horas > 0) {
      const { data: horasData } = await supabase
        .from('horas')
        .select('*')
        .eq('user_id', tema.reclamado_por)
        .single()
      if (horasData) {
        await supabase.from('horas').update({
          content_hrs: horasData.content_hrs + horas
        }).eq('user_id', tema.reclamado_por)
      }
    }

    setAsignandoHoras(null)
    setHorasInput({})
    await cargarTemas(userId, esDirector)
  }

  async function eliminarTema(id) {
    await supabase.from('content_hub').delete().eq('id', id)
    await cargarTemas(userId, esDirector)
  }

  function formatFecha(f) {
    return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function badgeEstado(estado) {
    if (estado === 'disponible') return <span className="ch-badge badge-available">Available</span>
    if (estado === 'reclamado') return <span className="ch-badge badge-claimed">Claimed</span>
    if (estado === 'entregado') return <span className="ch-badge badge-done">Submitted</span>
    if (estado === 'explicado') return <span className="ch-badge badge-explained">Explained</span>
    return null
  }

  const disponibles = temas.filter(t => t.estado === 'disponible')
  const reclamados = temas.filter(t => t.estado === 'reclamado')
  const entregados = temas.filter(t => t.estado === 'entregado' || t.estado === 'explicado')
  const misTemas = temas.filter(t => t.reclamado_por === userId)

  const temasTab = esDirector
    ? (tab === 'topics' ? temas : tab === 'pending' ? reclamados : entregados)
    : (tab === 'topics' ? disponibles : misTemas)

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
            <button
              className={`ch-new-btn ${mostrarForm ? 'active' : ''}`}
              onClick={() => setMostrarForm(!mostrarForm)}
            >
              {mostrarForm ? 'Cancel' : '+ New topic'}
            </button>
          )}
        </div>

        {esDirector && (
          <div className="ch-stats">
            <div className="ch-stat">
              <div className="ch-stat-n">{disponibles.length}</div>
              <div className="ch-stat-l">Available</div>
            </div>
            <div className="ch-stat">
              <div className="ch-stat-n" style={{color:'#92400e'}}>{reclamados.length}</div>
              <div className="ch-stat-l">Claimed</div>
            </div>
            <div className="ch-stat">
              <div className="ch-stat-n" style={{color:'#15803d'}}>{entregados.length}</div>
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
                <label className="ch-label">Period start</label>
                <input className="ch-input" type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
              </div>
              <div className="ch-field">
                <label className="ch-label">Due date</label>
                <input className="ch-input" type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} />
              </div>
            </div>
            <div className="ch-form-btns">
              <button className="ch-save" onClick={crearTema} disabled={creando || !titulo.trim()}>
                {creando ? 'Creating...' : 'Create topic'}
              </button>
              <button className="ch-cancel" onClick={() => setMostrarForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="ch-tabs">
          {esDirector ? (
            <>
              <button className={`ch-tab ${tab === 'topics' ? 'active' : ''}`} onClick={() => setTab('topics')}>All topics</button>
              <button className={`ch-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
                Claimed {reclamados.length > 0 && <span className="ch-badge-sm">{reclamados.length}</span>}
              </button>
              <button className={`ch-tab ${tab === 'submitted' ? 'active' : ''}`} onClick={() => setTab('submitted')}>Submitted</button>
            </>
          ) : (
            <>
              <button className={`ch-tab ${tab === 'topics' ? 'active' : ''}`} onClick={() => setTab('topics')}>
                Available {disponibles.length > 0 && <span className="ch-badge-sm">{disponibles.length}</span>}
              </button>
              <button className={`ch-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My topics</button>
            </>
          )}
        </div>

        {temasTab.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No topics here yet.</p>
        )}

        {temasTab.map(t => (
          <div key={t.id} className="ch-card">
            <div className="ch-card-header" onClick={() => setExpandido(expandido === t.id ? null : t.id)}>
              <div className="ch-tipo-badge">{t.tipo}</div>
              <div className="ch-card-info">
                <p className="ch-card-title">{t.titulo}</p>
                <p className="ch-card-sub">
                  Due {formatFecha(t.periodo_fin)}
                  {t.nombre_reclamado ? ` · ${t.nombre_reclamado}` : ' · Unclaimed'}
                </p>
              </div>
              <div className="ch-card-right">
                {badgeEstado(t.estado)}
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
                    <p className="ch-field-label" style={{color:'#92400e'}}>Why not submitted</p>
                    <p className="ch-field-value" style={{color:'#92400e'}}>{t.razon_no_subio}</p>
                  </div>
                )}
                {t.horas_asignadas > 0 && (
                  <div className="ch-field-row">
                    <p className="ch-field-label">Hours assigned</p>
                    <p className="ch-field-value">{t.horas_asignadas} hrs</p>
                  </div>
                )}

                {esDirector && t.estado === 'entregado' && (
                  asignandoHoras === t.id ? (
                    <div style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'10px'}}>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
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

                {!esDirector && t.reclamado_por === userId && t.estado === 'reclamado' && (
                  <div>
                    {subiendo === t.id ? (
                      <div style={{marginTop:'10px'}}>
                        <div className="ch-field" style={{marginBottom:'8px'}}>
                          <label className="ch-label">Content link (Google Drive, Instagram, TikTok...)</label>
                          <input className="ch-input" type="url" placeholder="https://..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
                        </div>
                        <div className="ch-field" style={{marginBottom:'8px'}}>
                          <label className="ch-label">Notes (optional)</label>
                          <input className="ch-input" type="text" placeholder="Any notes..." value={notasInput} onChange={(e) => setNotasInput(e.target.value)} />
                        </div>
                        <div style={{display:'flex', gap:'8px'}}>
                          <button className="ch-save" onClick={() => subirContenido(t.id)} disabled={!urlInput.trim()}>Submit content</button>
                          <button className="ch-cancel" onClick={() => setSubiendo(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : explicando === t.id ? (
                      <div style={{marginTop:'10px'}}>
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
                      <div style={{display:'flex', gap:'8px', marginTop:'10px'}}>
                        <button className="ch-save" onClick={() => setSubiendo(t.id)}>Upload content</button>
                        <button
                          onClick={() => setExplicando(t.id)}
                          style={{padding:'7px 14px', borderRadius:'999px', border:'0.5px solid #fecaca', background:'#fef2f2', fontSize:'12px', color:'#b91c1c', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:500}}
                        >
                          Couldn't submit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ContentHub