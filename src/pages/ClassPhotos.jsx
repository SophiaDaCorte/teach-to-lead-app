import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './StudentPages.css'
import './ClassPhotos.css'

const MAX_MB = 8
const DIAS_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function formatFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatHora(h) {
  if (!h) return ''
  const [hour, min] = h.split(':')
  const h12 = Number(hour) % 12 || 12
  return `${h12}:${min} ${Number(hour) < 12 ? 'AM' : 'PM'}`
}

function formatEnvio(ts) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function claveGrupo(f) {
  return f.envio_id || `${f.fecha}|${f.tutor_id}|${f.comunidad}`
}

function duracionSugerida(inicio, fin) {
  if (!inicio || !fin) return ''
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  const horas = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60
  if (!(horas > 0)) return ''
  return String(Math.round(horas * 2) / 2)
}

function ClassPhotos() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [esTutor, setEsTutor] = useState(false)
  const [esRevisor, setEsRevisor] = useState(false)
  const [listo, setListo] = useState(false)
  const [comunidades, setComunidades] = useState([])
  const [filtro, setFiltro] = useState('')
  const [fotos, setFotos] = useState([])
  const [tab, setTab] = useState('nuevas')
  const [horasInput, setHorasInput] = useState({})
  const [editandoHoras, setEditandoHoras] = useState(null)
  const [errorRevision, setErrorRevision] = useState('')

  const [comunidadSubida, setComunidadSubida] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivos, setArchivos] = useState([])
  const [inputKey, setInputKey] = useState(0)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id
      setUserId(uid)

      const { data: perfilData } = await supabase.from('perfiles').select('*').eq('id', uid).single()
      setPerfil(perfilData)

      const tutor = !!perfilData?.roles?.includes('tutors')
      const revisor = !!(perfilData?.roles?.includes('staff_admin') || perfilData?.roles?.includes('volunteer_coordinator'))
      setEsTutor(tutor)
      setEsRevisor(revisor)

      const { data: coms } = await supabase.from('comunidades').select('*').order('nombre')
      setComunidades(coms || [])

      const mias = (coms || []).filter(c => c.tutor_id === uid)
      if (mias.length > 0) setComunidadSubida(mias[0].nombre)

      setListo(true)
    }
    cargar()
  }, [])

  useEffect(() => {
    if (listo) cargarFotos()
  }, [listo, filtro])

  useEffect(() => {
    async function autollenarHora() {
      if (!esTutor || !comunidadSubida || !fecha) return
      const dia = DIAS_JS[new Date(fecha + 'T12:00:00').getDay()]
      const { data } = await supabase
        .from('clases').select('*')
        .eq('comunidad', comunidadSubida).eq('dia_semana', dia)
        .order('hora_inicio').limit(1)
      if (data && data.length > 0) {
        setHoraInicio((data[0].hora_inicio || '').slice(0, 5))
        setHoraFin((data[0].hora_fin || '').slice(0, 5))
      } else {
        setHoraInicio(''); setHoraFin('')
      }
    }
    autollenarHora()
  }, [esTutor, comunidadSubida, fecha])

  async function cargarFotos() {
    let q = supabase.from('fotos_clase').select('*').order('created_at', { ascending: false })
    if (!esRevisor) q = q.eq('tutor_id', userId)
    if (filtro) q = q.eq('comunidad', filtro)
    const { data } = await q
    setFotos(data || [])
  }

  async function ajustarHoras(tutorId, delta) {
    if (!tutorId || !delta) return
    const { data: fila } = await supabase.from('horas').select('*').eq('user_id', tutorId).maybeSingle()
    if (fila) {
      const { error: e } = await supabase.from('horas')
        .update({ content_hrs: Math.max(0, Number(fila.content_hrs || 0) + delta) })
        .eq('user_id', tutorId)
      return e
    }
    if (delta > 0) {
      const { error: e } = await supabase.from('horas').insert({ user_id: tutorId, content_hrs: delta, meeting_hrs: 0 })
      return e
    }
  }

  function elegirArchivos(e) {
    const lista = Array.from(e.target.files || [])
    const validos = lista.filter(f => f.type.startsWith('image/') && f.size <= MAX_MB * 1024 * 1024)
    setError(validos.length < lista.length ? `Some files were skipped. Only images up to ${MAX_MB} MB are allowed.` : '')
    setArchivos(validos)
  }

  async function subir() {
    if (archivos.length === 0 || !comunidadSubida || !horaInicio || !horaFin) return
    setSubiendo(true); setError(''); setExito('')
    const envioId = crypto.randomUUID()
    let subidas = 0

    for (let i = 0; i < archivos.length; i++) {
      const f = archivos[i]
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const ruta = `${userId}/${Date.now()}_${i}.${ext}`

      const { error: errSubida } = await supabase.storage.from('fotos-clase').upload(ruta, f, { contentType: f.type })
      if (errSubida) { setError(errSubida.message); continue }

      const { data: urlData } = supabase.storage.from('fotos-clase').getPublicUrl(ruta)
      const { error: errDb } = await supabase.from('fotos_clase').insert({
        envio_id: envioId,
        comunidad: comunidadSubida,
        tutor_id: userId,
        nombre_tutor: perfil?.nombre || null,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        descripcion: descripcion.trim() || null,
        url: urlData.publicUrl,
        ruta,
        revisado: false,
        horas_asignadas: 0
      })
      if (errDb) {
        await supabase.storage.from('fotos-clase').remove([ruta])
        setError(errDb.message)
        continue
      }
      subidas++
    }

    if (subidas > 0) {
      setExito(`Submitted ${subidas} photo${subidas > 1 ? 's' : ''} to staff`)
      setTimeout(() => setExito(''), 4000)
    }
    setArchivos([]); setDescripcion(''); setInputKey(k => k + 1)
    await cargarFotos()
    setSubiendo(false)
  }

  function horasDe(grupo) {
    return horasInput[grupo.key] ?? duracionSugerida(grupo.hora_inicio, grupo.hora_fin)
  }

  async function aprobar(grupo) {
    setErrorRevision('')
    const horas = Number(horasDe(grupo))
    if (isNaN(horas) || horas < 0) { setErrorRevision('Enter a valid number of hours.'); return }
    const ids = grupo.fotos.map(f => f.id)
    const { error: e1 } = await supabase.from('fotos_clase').update({
      revisado: true,
      horas_asignadas: horas,
      revisado_por: userId,
      fecha_revision: new Date().toISOString()
    }).in('id', ids)
    if (e1) { setErrorRevision(e1.message); return }
    const e2 = await ajustarHoras(grupo.tutor_id, horas)
    if (e2) setErrorRevision(e2.message)
    setHorasInput(prev => { const c = { ...prev }; delete c[grupo.key]; return c })
    await cargarFotos()
  }

  async function guardarEdicionHoras(grupo) {
    setErrorRevision('')
    const nuevas = Number(horasInput[grupo.key])
    if (isNaN(nuevas) || nuevas < 0) { setErrorRevision('Enter a valid number of hours.'); return }
    const delta = nuevas - grupo.horas
    const { error: e1 } = await supabase.from('fotos_clase')
      .update({ horas_asignadas: nuevas })
      .in('id', grupo.fotos.map(f => f.id))
    if (e1) { setErrorRevision(e1.message); return }
    const e2 = await ajustarHoras(grupo.tutor_id, delta)
    if (e2) setErrorRevision(e2.message)
    setEditandoHoras(null)
    setHorasInput(prev => { const c = { ...prev }; delete c[grupo.key]; return c })
    await cargarFotos()
  }

  async function reabrir(grupo) {
    setErrorRevision('')
    const { error: e1 } = await supabase.from('fotos_clase').update({
      revisado: false,
      horas_asignadas: 0,
      revisado_por: null,
      fecha_revision: null
    }).in('id', grupo.fotos.map(f => f.id))
    if (e1) { setErrorRevision(e1.message); return }
    const e2 = await ajustarHoras(grupo.tutor_id, -grupo.horas)
    if (e2) setErrorRevision(e2.message)
    await cargarFotos()
  }

  async function eliminarEnvio(grupo) {
    if (grupo.revisado && grupo.horas > 0) {
      await ajustarHoras(grupo.tutor_id, -grupo.horas)
    }
    const rutas = grupo.fotos.map(f => f.ruta).filter(Boolean)
    if (rutas.length > 0) await supabase.storage.from('fotos-clase').remove(rutas)
    await supabase.from('fotos_clase').delete().in('id', grupo.fotos.map(f => f.id))
    await cargarFotos()
  }

  const mapa = {}
  fotos.forEach(f => {
    const k = claveGrupo(f)
    if (!mapa[k]) mapa[k] = { key: k, fotos: [] }
    mapa[k].fotos.push(f)
  })
  const grupos = Object.values(mapa).map(g => {
    const p = g.fotos[0]
    return {
      ...g,
      fecha: p.fecha,
      comunidad: p.comunidad,
      tutor_id: p.tutor_id,
      nombre_tutor: p.nombre_tutor,
      hora_inicio: p.hora_inicio,
      hora_fin: p.hora_fin,
      descripcion: p.descripcion,
      creado: p.created_at,
      horas: Number(p.horas_asignadas || 0),
      revisado: g.fotos.every(f => f.revisado)
    }
  }).sort((a, b) => new Date(b.creado) - new Date(a.creado))

  const nuevas = grupos.filter(g => !g.revisado)
  const revisadas = grupos.filter(g => g.revisado)
  const visibles = esRevisor ? (tab === 'nuevas' ? nuevas : revisadas) : grupos
  const misComunidades = comunidades.filter(c => c.tutor_id === userId)

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="sp-content">
        <button className="sp-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="sp-title">Class photos</h1>

        {esTutor && misComunidades.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No community assigned yet.</p>
        )}

        {esTutor && misComunidades.length > 0 && (
          <div className="cp-form">
            <p className="cp-form-title">Submit class photos</p>
            <div className="cp-row2">
              <div className="cp-field">
                <label className="cp-label">Community</label>
                <select className="cp-input" value={comunidadSubida} onChange={(e) => setComunidadSubida(e.target.value)}>
                  {misComunidades.map(c => <option key={c.id} value={c.nombre}>{c.nombre} {c.nivel}</option>)}
                </select>
              </div>
              <div className="cp-field">
                <label className="cp-label">Class date</label>
                <input className="cp-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
            <div className="cp-row2">
              <div className="cp-field">
                <label className="cp-label">Start time</label>
                <input className="cp-input" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
              </div>
              <div className="cp-field">
                <label className="cp-label">End time</label>
                <input className="cp-input" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
              </div>
            </div>
            {(!horaInicio || !horaFin) && (
              <p style={{fontSize:'11px', color:'#92400e', margin:'0 0 10px'}}>
                No class scheduled on this day in My schedule. Enter the class time manually.
              </p>
            )}
            <div className="cp-field">
              <label className="cp-label">Description (optional)</label>
              <input className="cp-input" type="text" placeholder="e.g. Group activity" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
            <div className="cp-field">
              <label className="cp-label">Photos (up to {MAX_MB} MB each)</label>
              <input key={inputKey} type="file" accept="image/*" multiple onChange={elegirArchivos} style={{fontSize:'13px'}} />
              {archivos.length > 0 && <p style={{fontSize:'11px', color:'#aaa', margin:'6px 0 0'}}>{archivos.length} selected</p>}
            </div>
            {error && <p style={{fontSize:'12px', color:'#b91c1c', margin:'0 0 8px'}}>{error}</p>}
            {exito && <p style={{fontSize:'12px', color:'#3B6D11', fontWeight:600, margin:'0 0 8px'}}>✓ {exito}</p>}
            <button className="sp-save" onClick={subir} disabled={subiendo || archivos.length === 0 || !horaInicio || !horaFin}>
              {subiendo ? 'Submitting...' : 'Submit to staff'}
            </button>
          </div>
        )}

        {esRevisor && (
          <div style={{display:'flex', gap:'12px', alignItems:'flex-end', flexWrap:'wrap', marginBottom:'1rem'}}>
            <div className="cp-tabs" style={{flex:1, minWidth:'220px', marginBottom:0}}>
              <button className={`cp-tab ${tab === 'nuevas' ? 'active' : ''}`} onClick={() => setTab('nuevas')}>
                New {nuevas.length > 0 && <span className="cp-badge cp-badge-new">{nuevas.length}</span>}
              </button>
              <button className={`cp-tab ${tab === 'revisadas' ? 'active' : ''}`} onClick={() => setTab('revisadas')}>
                Reviewed
              </button>
            </div>
            <div>
              <label className="cp-label">Community</label>
              <select className="cp-input" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{minWidth:'180px'}}>
                <option value="">All communities</option>
                {comunidades.map(c => <option key={c.id} value={c.nombre}>{c.nombre} {c.nivel}</option>)}
              </select>
            </div>
          </div>
        )}

        {errorRevision && <p style={{fontSize:'12px', color:'#b91c1c', margin:'0 0 10px'}}>{errorRevision}</p>}

        {esTutor && !esRevisor && grupos.length > 0 && (
          <p className="cp-section">My submissions</p>
        )}

        {visibles.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'2rem'}}>
            {esRevisor ? (tab === 'nuevas' ? 'No new submissions.' : 'Nothing reviewed yet.') : 'No submissions yet.'}
          </p>
        )}

        {visibles.map(g => (
          <div key={g.key} className="sp-card" style={{marginBottom:'10px'}}>
            <div className="cp-card-head">
              <div style={{flex:1, minWidth:'180px'}}>
                <p style={{fontSize:'13px', fontWeight:600, color:'#1a1a1a', margin:0}}>
                  {g.comunidad} · {formatFecha(g.fecha)}
                </p>
                <p style={{fontSize:'11px', color:'#aaa', margin:'2px 0 0'}}>
                  {g.hora_inicio ? `${formatHora(g.hora_inicio)} – ${formatHora(g.hora_fin)} · ` : ''}
                  {g.fotos.length} photo{g.fotos.length > 1 ? 's' : ''}
                  {g.nombre_tutor ? ` · ${g.nombre_tutor}` : ''}
                  {` · Sent ${formatEnvio(g.creado)}`}
                  {g.descripcion ? ` · ${g.descripcion}` : ''}
                </p>
              </div>
              <div className="cp-actions">
                <span className={`cp-badge ${g.revisado ? 'cp-badge-ok' : 'cp-badge-new'}`}>
                  {g.revisado ? 'Reviewed' : 'Pending'}
                </span>
                {g.revisado && g.horas > 0 && (
                  <span className="cp-badge cp-badge-hrs">+{g.horas} hrs</span>
                )}
                {esRevisor && g.revisado && editandoHoras !== g.key && (
                  <>
                    <button className="cp-btn-ghost" onClick={() => { setEditandoHoras(g.key); setHorasInput(prev => ({ ...prev, [g.key]: String(g.horas) })) }}>Edit hours</button>
                    <button className="cp-btn-ghost" onClick={() => reabrir(g)}>Mark as new</button>
                  </>
                )}
                {(esRevisor || g.tutor_id === userId) && (
                  <button className="cp-btn-del" onClick={() => eliminarEnvio(g)} aria-label="Delete submission">
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </div>

            {esRevisor && !g.revisado && (
              <div className="cp-hours-row">
                <label className="cp-label" style={{margin:0}}>Volunteer hours</label>
                <input
                  className="cp-hours-input"
                  type="number" min="0" step="0.5"
                  value={horasDe(g)}
                  onChange={(e) => setHorasInput(prev => ({ ...prev, [g.key]: e.target.value }))}
                />
                <button className="cp-btn-ok" onClick={() => aprobar(g)}>Approve and add hours</button>
              </div>
            )}

            {esRevisor && g.revisado && editandoHoras === g.key && (
              <div className="cp-hours-row">
                <label className="cp-label" style={{margin:0}}>Volunteer hours</label>
                <input
                  className="cp-hours-input"
                  type="number" min="0" step="0.5"
                  value={horasInput[g.key] ?? ''}
                  onChange={(e) => setHorasInput(prev => ({ ...prev, [g.key]: e.target.value }))}
                />
                <button className="cp-btn-ok" onClick={() => guardarEdicionHoras(g)}>Save</button>
                <button className="cp-btn-ghost" onClick={() => setEditandoHoras(null)}>Cancel</button>
              </div>
            )}

            <div className="cp-grid">
              {g.fotos.map(foto => (
                <div key={foto.id} className="cp-thumb">
                  <a href={foto.url} target="_blank" rel="noreferrer">
                    <img src={foto.url} alt={foto.descripcion || 'Class photo'} loading="lazy" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClassPhotos