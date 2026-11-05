import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './MyFiles.css'

const BUCKET = 'archivos'
const MAX_MB = 25

function limpiarNombre(n) {
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
}

function formatTamano(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${Math.round(b / 1024)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function formatFecha(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function icono(a) {
  const n = (a.nombre || '').toLowerCase()
  const t = a.tipo || ''
  if (t.startsWith('image/')) return '🖼️'
  if (n.endsWith('.pdf')) return '📕'
  if (/\.(docx?|txt)$/.test(n)) return '📝'
  if (/\.(xlsx?|csv)$/.test(n)) return '📊'
  if (/\.(pptx?)$/.test(n)) return '📽️'
  if (/\.(mp4|mov)$/.test(n)) return '🎬'
  return '📎'
}

function MyFiles() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carpetas, setCarpetas] = useState([])
  const [archivos, setArchivos] = useState([])
  const [personas, setPersonas] = useState([])
  const [actual, setActual] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [armando, setArmando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [nuevaCarpeta, setNuevaCarpeta] = useState(null)
  const [panel, setPanel] = useState(null)
  const [destino, setDestino] = useState('')
  const [inputKey, setInputKey] = useState(0)

  useEffect(() => {
    async function iniciar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id
      setUserId(uid)

      const { data: p } = await supabase.from('perfiles').select('*').eq('id', uid).single()
      setPerfil(p)

      await cargarTodo(uid)

      const { data: gente } = await supabase.from('perfiles').select('id, nombre, titulo, roles').order('nombre')
      setPersonas((gente || []).filter(x =>
        x.id !== uid && !x.roles.includes('estudiante') && !x.roles.includes('inactivo')
      ))
      setCargando(false)
    }
    iniciar()
  }, [])

  async function cargarTodo(uid = userId) {
    const { data: c } = await supabase.from('carpetas').select('*').eq('owner_id', uid).order('nombre')
    const { data: a } = await supabase.from('archivos').select('*').eq('owner_id', uid).order('created_at', { ascending: false })
    setCarpetas(c || [])
    setArchivos(a || [])
  }

  function mostrarAviso(texto) {
    setAviso(texto)
    setTimeout(() => setAviso(''), 4000)
  }

  function rutaCarpeta(id) {
    const partes = []
    let c = carpetas.find(x => x.id === id)
    let guardia = 0
    while (c && guardia < 20) {
      partes.unshift(c)
      c = carpetas.find(x => x.id === c.parent_id)
      guardia++
    }
    return partes
  }

  function descendientes(id) {
    const ids = [id]
    let i = 0
    while (i < ids.length) {
      carpetas.filter(c => c.parent_id === ids[i]).forEach(c => ids.push(c.id))
      i++
    }
    return ids
  }

  async function crearCarpeta() {
    const nombre = (nuevaCarpeta || '').trim()
    if (!nombre) return
    const { error: e } = await supabase.from('carpetas').insert({ owner_id: userId, parent_id: actual, nombre })
    if (e) { setError(e.message); return }
    setNuevaCarpeta(null)
    await cargarTodo()
  }

  async function subir(ev) {
    const lista = Array.from(ev.target.files || [])
    if (lista.length === 0) return
    setSubiendo(true); setError('')
    let ok = 0
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i]
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`"${f.name}" is larger than ${MAX_MB} MB and was skipped.`)
        continue
      }
      const ruta = `${userId}/${Date.now()}_${i}_${limpiarNombre(f.name)}`
      const { error: e1 } = await supabase.storage.from(BUCKET).upload(ruta, f, { contentType: f.type || 'application/octet-stream' })
      if (e1) { setError(e1.message); continue }
      const { error: e2 } = await supabase.from('archivos').insert({
        owner_id: userId, carpeta_id: actual, nombre: f.name, ruta, tamano: f.size, tipo: f.type || null
      })
      if (e2) {
        await supabase.storage.from(BUCKET).remove([ruta])
        setError(e2.message)
        continue
      }
      ok++
    }
    if (ok > 0) mostrarAviso(`${ok} file${ok > 1 ? 's' : ''} uploaded`)
    setInputKey(k => k + 1)
    await cargarTodo()
    setSubiendo(false)
  }

  async function abrir(a, descargar = false) {
    setError('')
    const w = descargar ? null : window.open('', '_blank')
    const { data, error: e } = await supabase.storage.from(BUCKET)
      .createSignedUrl(a.ruta, 120, descargar ? { download: a.nombre } : undefined)
    if (e || !data) {
      if (w) w.close()
      setError(e?.message || 'Could not open the file.')
      return
    }
    if (descargar) window.location.href = data.signedUrl
    else if (w) w.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  async function borrarArchivo(a) {
    if (!window.confirm(`Delete "${a.nombre}"?`)) return
    await supabase.storage.from(BUCKET).remove([a.ruta])
    await supabase.from('archivos').delete().eq('id', a.id)
    await cargarTodo()
  }

  async function borrarCarpeta(c) {
    const ids = descendientes(c.id)
    const dentro = archivos.filter(a => ids.includes(a.carpeta_id))
    const aviso1 = dentro.length > 0
      ? `Delete "${c.nombre}" and the ${dentro.length} file${dentro.length > 1 ? 's' : ''} inside?`
      : `Delete the folder "${c.nombre}"?`
    if (!window.confirm(aviso1)) return
    const rutas = dentro.map(a => a.ruta)
    if (rutas.length > 0) await supabase.storage.from(BUCKET).remove(rutas)
    if (dentro.length > 0) await supabase.from('archivos').delete().in('id', dentro.map(a => a.id))
    await supabase.from('carpetas').delete().in('id', ids)
    if (ids.includes(actual)) setActual(c.parent_id)
    await cargarTodo()
  }

  async function renombrar(tipo, item) {
    const nuevo = window.prompt('New name', item.nombre)
    if (!nuevo || !nuevo.trim() || nuevo.trim() === item.nombre) return
    await supabase.from(tipo === 'carpeta' ? 'carpetas' : 'archivos').update({ nombre: nuevo.trim() }).eq('id', item.id)
    await cargarTodo()
  }

  async function mover() {
    const { tipo, item } = panel
    const nuevoPadre = destino === '' ? null : destino
    const { error: e } = tipo === 'archivo'
      ? await supabase.from('archivos').update({ carpeta_id: nuevoPadre }).eq('id', item.id)
      : await supabase.from('carpetas').update({ parent_id: nuevoPadre }).eq('id', item.id)
    if (e) { setError(e.message); return }
    setPanel(null)
    mostrarAviso('Moved')
    await cargarTodo()
  }

  async function enviar() {
    const { item } = panel
    const persona = personas.find(p => p.id === destino)
    if (!persona) return
    setError('')
    const nuevaRuta = `${persona.id}/${Date.now()}_${limpiarNombre(item.nombre)}`
    const { error: e1 } = await supabase.storage.from(BUCKET).copy(item.ruta, nuevaRuta)
    if (e1) { setError(e1.message); return }
    const { error: e2 } = await supabase.from('archivos').insert({
      owner_id: persona.id, carpeta_id: null, nombre: item.nombre, ruta: nuevaRuta,
      tamano: item.tamano, tipo: item.tipo, de_nombre: perfil?.nombre || null
    })
    if (e2) {
      await supabase.storage.from(BUCKET).remove([nuevaRuta])
      setError(e2.message)
      return
    }
    setPanel(null)
    mostrarAviso(`Sent a copy to ${persona.nombre}`)
  }

  async function asegurarCarpeta(nombre, padreId) {
    let q = supabase.from('carpetas').select('id').eq('owner_id', userId).eq('nombre', nombre)
    q = padreId ? q.eq('parent_id', padreId) : q.is('parent_id', null)
    const { data: existente } = await q.limit(1)
    if (existente && existente.length > 0) return existente[0].id
    const { data: nueva, error: e } = await supabase.from('carpetas')
      .insert({ owner_id: userId, parent_id: padreId, nombre }).select('id').single()
    if (e) throw e
    return nueva.id
  }

  async function armarCarpetas() {
    setArmando(true); setError('')
    try {
      const roles = perfil?.roles || []
      await asegurarCarpeta('Documents', null)

      if (roles.includes('tutors')) {
        const { data: coms } = await supabase.from('comunidades').select('*').eq('tutor_id', userId)
        for (const c of coms || []) {
          const raiz = await asegurarCarpeta(`${c.nombre} ${c.nivel}`, null)
          await asegurarCarpeta('Class documents', raiz)
          const { data: ests } = await supabase.from('perfiles').select('nombre')
            .eq('comunidad', c.nombre).eq('nivel', c.nivel).contains('roles', ['estudiante'])
          for (const s of ests || []) await asegurarCarpeta(s.nombre, raiz)
        }
      }

      if (roles.includes('marketing_interns') || roles.includes('staff_marketing')) {
        const contenido = await asegurarCarpeta('My content', null)
        const mes = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        await asegurarCarpeta(mes, contenido)
      }

      if (roles.includes('creation')) {
        await asegurarCarpeta('My projects', null)
      }

      await cargarTodo()
      mostrarAviso('Folders are ready')
    } catch (e) {
      setError(e.message || 'Could not create the folders.')
    }
    setArmando(false)
  }

  const migas = rutaCarpeta(actual)
  const carpetasAqui = carpetas.filter(c => c.parent_id === actual)
  const archivosAqui = archivos.filter(a => a.carpeta_id === actual)
  const vacio = carpetas.length === 0 && archivos.length === 0

  function contar(id) {
    return carpetas.filter(c => c.parent_id === id).length + archivos.filter(a => a.carpeta_id === id).length
  }

  const excluir = panel?.tipo === 'carpeta' ? descendientes(panel.item.id) : []
  const opcionesDestino = panel?.accion === 'mover'
    ? carpetas
        .filter(c => !excluir.includes(c.id))
        .map(c => ({ id: c.id, etiqueta: rutaCarpeta(c.id).map(x => x.nombre).join(' / ') }))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta))
    : []

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="mf-content">
        <button className="mf-back" onClick={() => navigate('/dashboard')}>← Back</button>

        <div className="mf-topbar">
          <h1 className="mf-title">My files</h1>
          <div className="mf-actions">
            <button className="mf-btn-ghost" onClick={armarCarpetas} disabled={armando || cargando}>
              {armando ? 'Setting up...' : 'Set up folders'}
            </button>
            <button className="mf-btn-ghost" onClick={() => setNuevaCarpeta(nuevaCarpeta === null ? '' : null)}>
              + New folder
            </button>
            <label className={`mf-btn ${subiendo ? 'mf-disabled' : ''}`}>
              {subiendo ? 'Uploading...' : 'Upload files'}
              <input key={inputKey} type="file" multiple onChange={subir} disabled={subiendo} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div className="mf-crumbs">
          <button className="mf-crumb" onClick={() => setActual(null)}>My files</button>
          {migas.map(m => (
            <span key={m.id}>
              <span className="mf-sep">/</span>
              <button className="mf-crumb" onClick={() => setActual(m.id)}>{m.nombre}</button>
            </span>
          ))}
        </div>

        {error && <p className="mf-error">{error}</p>}
        {aviso && <p className="mf-ok">✓ {aviso}</p>}

        {nuevaCarpeta !== null && (
          <div className="mf-panel">
            <p className="mf-panel-title">New folder{migas.length > 0 ? ` in ${migas[migas.length - 1].nombre}` : ''}</p>
            <div className="mf-panel-row">
              <input
                className="mf-input" type="text" placeholder="Folder name" autoFocus
                value={nuevaCarpeta}
                onChange={(e) => setNuevaCarpeta(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') crearCarpeta() }}
              />
              <button className="mf-btn" onClick={crearCarpeta} disabled={!nuevaCarpeta.trim()}>Create</button>
              <button className="mf-btn-ghost" onClick={() => setNuevaCarpeta(null)}>Cancel</button>
            </div>
          </div>
        )}

        {panel && (
          <div className="mf-panel">
            <p className="mf-panel-title">
              {panel.accion === 'mover' ? 'Move' : 'Send a copy of'} "{panel.item.nombre}"
            </p>
            <div className="mf-panel-row">
              {panel.accion === 'mover' ? (
                <select className="mf-input" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  <option value="">My files (main folder)</option>
                  {opcionesDestino.map(o => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
                </select>
              ) : (
                <select className="mf-input" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  <option value="">Choose a person...</option>
                  {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.titulo ? ` · ${p.titulo}` : ''}</option>)}
                </select>
              )}
              <button
                className="mf-btn"
                onClick={panel.accion === 'mover' ? mover : enviar}
                disabled={panel.accion === 'enviar' && !destino}
              >
                {panel.accion === 'mover' ? 'Move here' : 'Send'}
              </button>
              <button className="mf-btn-ghost" onClick={() => setPanel(null)}>Cancel</button>
            </div>
            {panel.accion === 'enviar' && (
              <p className="mf-hint">They get their own copy. If you delete yours later, theirs stays.</p>
            )}
          </div>
        )}

        {cargando && <p className="mf-empty">Loading...</p>}

        {!cargando && vacio && (
          <div className="mf-empty-card">
            <p className="mf-empty-title">Your space is empty</p>
            <p className="mf-empty-sub">
              Tap "Set up folders" to create your starter folders, or upload your first file.
            </p>
          </div>
        )}

        {!cargando && !vacio && carpetasAqui.length === 0 && archivosAqui.length === 0 && (
          <p className="mf-empty">This folder is empty.</p>
        )}

        {carpetasAqui.map(c => (
          <div key={c.id} className="mf-row">
            <button className="mf-item" onClick={() => setActual(c.id)}>
              <span className="mf-icon">📁</span>
              <span className="mf-info">
                <span className="mf-name">{c.nombre}</span>
                <span className="mf-meta">{contar(c.id)} item{contar(c.id) !== 1 ? 's' : ''}</span>
              </span>
            </button>
            <div className="mf-row-actions">
              <button className="mf-mini" onClick={() => renombrar('carpeta', c)}>Rename</button>
              <button className="mf-mini" onClick={() => { setPanel({ accion: 'mover', tipo: 'carpeta', item: c }); setDestino('') }}>Move</button>
              <button className="mf-mini mf-mini-del" onClick={() => borrarCarpeta(c)} aria-label="Delete folder">
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        ))}

        {archivosAqui.map(a => (
          <div key={a.id} className="mf-row">
            <button className="mf-item" onClick={() => abrir(a)}>
              <span className="mf-icon">{icono(a)}</span>
              <span className="mf-info">
                <span className="mf-name">{a.nombre}</span>
                <span className="mf-meta">
                  {[formatTamano(a.tamano), formatFecha(a.created_at), a.de_nombre ? `From ${a.de_nombre}` : ''].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
            <div className="mf-row-actions">
              <button className="mf-mini" onClick={() => abrir(a, true)}>Download</button>
              <button className="mf-mini" onClick={() => { setPanel({ accion: 'enviar', tipo: 'archivo', item: a }); setDestino('') }}>Send</button>
              <button className="mf-mini" onClick={() => { setPanel({ accion: 'mover', tipo: 'archivo', item: a }); setDestino('') }}>Move</button>
              <button className="mf-mini" onClick={() => renombrar('archivo', a)}>Rename</button>
              <button className="mf-mini mf-mini-del" onClick={() => borrarArchivo(a)} aria-label="Delete file">
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyFiles