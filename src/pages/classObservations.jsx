import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './ClassObservations.css'

function ClassObservations() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tab, setTab] = useState('new')
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)
  const [comunidades, setComunidades] = useState([])
  const [tutores, setTutores] = useState([])
  const [observaciones, setObservaciones] = useState([])
  const [comunidadAbierta, setComunidadAbierta] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const [comunidad, setComunidad] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [queObservaste, setQueObservaste] = useState('')
  const [comoEstuvoTutor, setComoEstuvoTutor] = useState('')
  const [comoRespondieron, setComoRespondieron] = useState('')
  const [areasMejora, setAreasMejora] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)

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

      const { data: coms } = await supabase
        .from('comunidades')
        .select('*')
        .order('nombre')
      setComunidades(coms || [])

      const { data: tuts } = await supabase
        .from('perfiles')
        .select('*')
        .contains('roles', ['tutors'])
      setTutores(tuts || [])

      const { data: obs } = await supabase
        .from('observaciones_clase')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('fecha', { ascending: false })
      setObservaciones(obs || [])
    }
    cargarDatos()
  }, [])

  async function enviarObservacion() {
    if (!comunidad || !queObservaste.trim()) return
    setEnviando(true)
    const tutorSeleccionado = tutores.find(t => t.id === tutorId)
    const { error } = await supabase.from('observaciones_clase').insert({
      user_id: userId,
      nombre_observador: perfil?.nombre,
      comunidad,
      tutor_id: tutorId || null,
      nombre_tutor: tutorSeleccionado?.nombre || null,
      fecha,
      que_observaste: queObservaste,
      como_estuvo_tutor: comoEstuvoTutor,
      como_respondieron_estudiantes: comoRespondieron,
      areas_mejora: areasMejora
    })
    if (!error) {
      setExito(true)
      setTimeout(() => setExito(false), 4000)
      setComunidad('')
      setTutorId('')
      setQueObservaste('')
      setComoEstuvoTutor('')
      setComoRespondieron('')
      setAreasMejora('')
      setFecha(new Date().toISOString().split('T')[0])
      const { data: obs } = await supabase
        .from('observaciones_clase')
        .select('*')
        .eq('user_id', userId)
        .order('fecha', { ascending: false })
      setObservaciones(obs || [])
      setTab('previous')
    }
    setEnviando(false)
  }

  async function eliminarObservacion(id) {
    await supabase.from('observaciones_clase').delete().eq('id', id)
    setObservaciones(observaciones.filter(o => o.id !== id))
  }

  async function marcarLeido(id) {
    await supabase
      .from('observaciones_clase')
      .update({ leido_por_director: true })
      .eq('id', id)
    setObservaciones(observaciones.map(o =>
      o.id === id ? { ...o, leido_por_director: true } : o
    ))
  }

  function formatFecha(fecha) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-HN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const obsConComentario = observaciones.filter(o => o.comentario_admin && !o.leido_por_director).length

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="co-content">
        <button className="co-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="co-title">Class observations</h1>

        <div className="co-tabs">
          <button className={`co-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
            New observation
          </button>
          <button className={`co-tab ${tab === 'previous' ? 'active' : ''}`} onClick={() => setTab('previous')}>
            Previous observations {obsConComentario > 0 && <span className="co-badge">{obsConComentario} new</span>}
          </button>
        </div>

        {tab === 'new' && (
          <div>
            {exito && <div className="co-success">✓ Observation submitted successfully</div>}
            <div className="co-form">
              <div className="co-row2">
                <div className="co-field">
                  <label className="co-label">Community</label>
                  <select className="co-input" value={comunidad} onChange={(e) => setComunidad(e.target.value)}>
                    <option value="">Select community...</option>
                    {comunidades.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre} {c.nivel}</option>
                    ))}
                  </select>
                </div>
                <div className="co-field">
                  <label className="co-label">Tutor observed</label>
                  <select className="co-input" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                    <option value="">Select tutor...</option>
                    {tutores.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="co-field">
                <label className="co-label">Date</label>
                <input className="co-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="co-field">
                <label className="co-label">What did you observe in the class?</label>
                <textarea className="co-textarea" placeholder="Describe what you saw during the class..." value={queObservaste} onChange={(e) => setQueObservaste(e.target.value)} />
              </div>
              <div className="co-field">
                <label className="co-label">How was the tutor?</label>
                <textarea className="co-textarea" placeholder="Feedback on the tutor's performance..." value={comoEstuvoTutor} onChange={(e) => setComoEstuvoTutor(e.target.value)} />
              </div>
              <div className="co-field">
                <label className="co-label">How did the students respond?</label>
                <textarea className="co-textarea" placeholder="Participation, attitude, comprehension..." value={comoRespondieron} onChange={(e) => setComoRespondieron(e.target.value)} />
              </div>
              <div className="co-field">
                <label className="co-label">Areas for improvement</label>
                <textarea className="co-textarea" placeholder="Suggestions or areas to improve..." value={areasMejora} onChange={(e) => setAreasMejora(e.target.value)} />
              </div>
              <button className="co-submit" onClick={enviarObservacion} disabled={enviando || !comunidad || !queObservaste.trim()}>
                {enviando ? 'Submitting...' : 'Submit observation'}
              </button>
            </div>
          </div>
        )}

        {tab === 'previous' && (
          <div>
            {obsConComentario > 0 && (
              <div className="co-admin-alert">
                <p className="co-admin-alert-title">💬 Admin left {obsConComentario} comment{obsConComentario > 1 ? 's' : ''} on your observations</p>
                <p className="co-admin-alert-sub">Open the observation below to read and mark as read.</p>
              </div>
            )}

            {observaciones.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No observations yet.</p>
            )}

            {comunidades.map(c => {
              const obs = observaciones.filter(o => o.comunidad === c.nombre)
              if (obs.length === 0) return null
              const abierta = comunidadAbierta === c.id
              return (
                <div key={c.id} className="co-group">
                  <div className="co-group-header" onClick={() => setComunidadAbierta(abierta ? null : c.id)}>
                    <div className="co-group-left">
                      <span>🎒</span>
                      <span className="co-group-name">{c.nombre} {c.nivel}</span>
                      <span className="co-group-count">{obs.length}</span>
                      {obs.some(o => o.comentario_admin && !o.leido_por_director) && (
                        <span style={{fontSize:'10px', background:'#FCEBEB', color:'#A32D2D', padding:'2px 7px', borderRadius:'4px', fontWeight:600}}>💬 New</span>
                      )}
                    </div>
                    <i className={`ti ti-chevron-down co-chevron ${abierta ? 'open' : ''}`} aria-hidden="true"></i>
                  </div>
                  {abierta && (
                    <div className="co-group-body">
                      {obs.map(o => (
                        <div key={o.id}>
                          <div className="co-obs-row">
                            <div className="co-obs-info" onClick={() => setExpandido(expandido === o.id ? null : o.id)}>
                              <p className="co-obs-fecha">{formatFecha(o.fecha)}</p>
                              <p className="co-obs-tutor">{o.nombre_tutor || 'Sin tutor asignado'}</p>
                              {o.comentario_admin && !o.leido_por_director && (
                                <span style={{fontSize:'10px', color:'#A32D2D', fontWeight:600}}>💬 Admin commented</span>
                              )}
                              {o.comentario_admin && o.leido_por_director && (
                                <span style={{fontSize:'10px', color:'#3B6D11', fontWeight:600}}>✓ Read</span>
                              )}
                            </div>
                            <div style={{display:'flex', gap:'6px'}}>
                              <button className="co-obs-btn" onClick={() => setExpandido(expandido === o.id ? null : o.id)}>
                                {expandido === o.id ? 'Hide' : 'View'}
                              </button>
                              <button
                                onClick={() => eliminarObservacion(o.id)}
                                style={{padding:'5px 8px', borderRadius:'6px', border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:'11px', cursor:'pointer'}}
                              >
                                <i className="ti ti-trash" aria-hidden="true"></i>
                              </button>
                            </div>
                          </div>
                          {expandido === o.id && (
                            <div className="co-obs-detail">
                              {o.que_observaste && (
                                <div className="co-obs-field">
                                  <p className="co-obs-field-label">What was observed</p>
                                  <p className="co-obs-field-value">{o.que_observaste}</p>
                                </div>
                              )}
                              {o.como_estuvo_tutor && (
                                <div className="co-obs-field">
                                  <p className="co-obs-field-label">How was the tutor</p>
                                  <p className="co-obs-field-value">{o.como_estuvo_tutor}</p>
                                </div>
                              )}
                              {o.como_respondieron_estudiantes && (
                                <div className="co-obs-field">
                                  <p className="co-obs-field-label">Student response</p>
                                  <p className="co-obs-field-value">{o.como_respondieron_estudiantes}</p>
                                </div>
                              )}
                              {o.areas_mejora && (
                                <div className="co-obs-field">
                                  <p className="co-obs-field-label">Areas for improvement</p>
                                  <p className="co-obs-field-value">{o.areas_mejora}</p>
                                </div>
                              )}
                              {o.comentario_admin && (
                                <div className="co-obs-field" style={{background:'#EEEDFE', borderRadius:'8px', padding:'10px 12px'}}>
                                  <p className="co-obs-field-label" style={{color:'#3C3489'}}>Admin comment</p>
                                  <p className="co-obs-field-value" style={{color:'#3C3489'}}>{o.comentario_admin}</p>
                                  {!o.leido_por_director && (
                                    <button
                                      onClick={() => marcarLeido(o.id)}
                                      style={{marginTop:'8px', padding:'5px 14px', borderRadius:'999px', border:'none', background:'#3C3489', color:'white', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'Poppins,sans-serif'}}
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                  {o.leido_por_director && (
                                    <p style={{fontSize:'11px', color:'#3C3489', marginTop:'6px', opacity:0.7}}>✓ You marked this as read</p>
                                  )}
                                </div>
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

export default ClassObservations