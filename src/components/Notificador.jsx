import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { EQUIPOS, esParticipante } from '../chat.js'
import './Notificador.css'

const MAX_VISIBLES = 3
const DURACION = 7000
const CLAVE_DESCARTADO = 'ttl-avisos-descartado'

function recortar(texto, max = 90) {
  const t = (texto || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

function fechaCorta(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })
}

function Notificador() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pathRef = useRef(pathname)
  const contador = useRef(0)
  const esEstRef = useRef(false)
  const misClasesRef = useRef(new Set())
  const [uid, setUid] = useState(null)
  const [esEst, setEsEst] = useState(false)
  const [avisos, setAvisos] = useState([])
  const [pedirPermiso, setPedirPermiso] = useState(false)

  useEffect(() => { pathRef.current = pathname }, [pathname])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      setUid(session?.user.id || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!uid) { setPedirPermiso(false); return }
    const soportado = typeof window !== 'undefined' && 'Notification' in window
    let descartado = false
    try { descartado = localStorage.getItem(CLAVE_DESCARTADO) === '1' } catch (e) {}
    setPedirPermiso(soportado && Notification.permission === 'default' && !descartado)
  }, [uid])

  useEffect(() => {
    if (!uid) return
    let canal = null
    let activo = true

    async function iniciar() {
      const { data: p } = await supabase
        .from('perfiles').select('roles, comunidad, nivel').eq('id', uid).maybeSingle()
      if (!activo) return

      const est = !!p?.roles?.includes('estudiante')
      esEstRef.current = est
      setEsEst(est)

      const { data: comsTutor } = await supabase.from('comunidades').select('id').eq('tutor_id', uid)
      let propias = (comsTutor || []).map(c => `com:${c.id}`)
      if (est && p?.comunidad) {
        const { data: comsEst } = await supabase
          .from('comunidades').select('id').eq('nombre', p.comunidad).eq('nivel', p.nivel)
        propias = propias.concat((comsEst || []).map(c => `com:${c.id}`))
      }
      misClasesRef.current = new Set(propias)
      if (!activo) return

      canal = supabase.channel(`avisos-${uid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes' },
          (pl) => alMensaje(pl.new))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gradebook_notas', filter: `estudiante_id=eq.${uid}` },
          (pl) => alTareaNueva(pl.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gradebook_notas', filter: `estudiante_id=eq.${uid}` },
          (pl) => alCalificada(pl.new))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checklists', filter: `asignado_a=eq.${uid}` },
          (pl) => alChecklist(pl.new))
        .subscribe()
    }

    iniciar()
    return () => {
      activo = false
      if (canal) supabase.removeChannel(canal)
    }
  }, [uid])

  function tr(en, es) { return esEstRef.current ? es : en }

  function quitar(id) { setAvisos(prev => prev.filter(a => a.id !== id)) }

  function escritorio(titulo, cuerpo, destino) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return
    try {
      const n = new Notification(titulo, { body: cuerpo, icon: '/icons/icon-192.png' })
      n.onclick = () => { window.focus(); navigate(destino); n.close() }
    } catch (e) {}
  }

  function avisar({ icono, titulo, cuerpo, destino }) {
    const id = ++contador.current
    setAvisos(prev => [...prev, { id, icono, titulo, cuerpo, destino }].slice(-MAX_VISIBLES))
    setTimeout(() => quitar(id), DURACION)
    escritorio(titulo, cuerpo, destino)
  }

  function alMensaje(m) {
    if (m.user_id === uid) return
    if (!esParticipante(m.canal, uid)) return
    if (pathRef.current === '/chat') return
    if (m.canal.startsWith('com:') && !misClasesRef.current.has(m.canal)) return

    let etiqueta = ''
    if (m.canal.startsWith('team:')) etiqueta = EQUIPOS.find(e => e.clave === m.canal)?.nombre || ''
    else if (m.canal.startsWith('com:')) etiqueta = tr('Class chat', 'Chat de clase')

    const quien = m.nombre || '—'
    avisar({
      icono: '💬',
      titulo: etiqueta ? `${quien} · ${etiqueta}` : quien,
      cuerpo: recortar(m.contenido),
      destino: '/chat'
    })
  }

  async function alTareaNueva(n) {
    const { data: col } = await supabase
      .from('gradebook_columnas').select('titulo, tipo, fecha').eq('id', n.columna_id).maybeSingle()
    if (!col || col.tipo !== 'tarea') return
    avisar({
      icono: '📝',
      titulo: 'Nueva tarea',
      cuerpo: col.fecha ? `${col.titulo} · para el ${fechaCorta(col.fecha)}` : col.titulo,
      destino: '/mis-tareas-clase'
    })
  }

  async function alCalificada(n) {
    if (n.estado !== 'calificado') return
    const { data: col } = await supabase
      .from('gradebook_columnas').select('titulo, max_score').eq('id', n.columna_id).maybeSingle()
    if (!col) return
    const pct = col.max_score ? Math.round((n.nota / col.max_score) * 100) : null
    avisar({
      icono: '✅',
      titulo: 'Te calificaron',
      cuerpo: pct !== null ? `${col.titulo} · ${n.nota}/${col.max_score} (${pct}%)` : col.titulo,
      destino: '/mis-calificaciones'
    })
  }

  function alChecklist(c) {
    if (c.creado_por === uid) return
    avisar({
      icono: '✅',
      titulo: tr('New task', 'Nueva tarea'),
      cuerpo: recortar(c.tarea),
      destino: '/checklist'
    })
  }

  function abrirAviso(a) {
    quitar(a.id)
    navigate(a.destino)
  }

  async function activarPermiso() {
    try { await Notification.requestPermission() } catch (e) {}
    setPedirPermiso(false)
  }

  function descartarPermiso() {
    try { localStorage.setItem(CLAVE_DESCARTADO, '1') } catch (e) {}
    setPedirPermiso(false)
  }

  if (avisos.length === 0 && !pedirPermiso) return null

  return (
    <div className="ntf-stack">
      {pedirPermiso && (
        <div className="ntf-card ntf-ask">
          <span className="ntf-icon">🔔</span>
          <span className="ntf-text">
            <span className="ntf-title">{esEst ? 'Activar avisos' : 'Turn on alerts'}</span>
            <span className="ntf-body">
              {esEst
                ? 'Te avisamos de mensajes y tareas nuevas, aunque estés en otra pestaña.'
                : 'Get alerts for new messages and tasks, even when you are on another tab.'}
            </span>
            <span className="ntf-actions">
              <button className="ntf-btn" onClick={activarPermiso}>{esEst ? 'Activar' : 'Turn on'}</button>
              <button className="ntf-btn ntf-btn-ghost" onClick={descartarPermiso}>{esEst ? 'Ahora no' : 'Not now'}</button>
            </span>
          </span>
        </div>
      )}

      {avisos.map(a => (
        <div
          key={a.id}
          className="ntf-card"
          role="button"
          tabIndex={0}
          onClick={() => abrirAviso(a)}
          onKeyDown={(e) => { if (e.key === 'Enter') abrirAviso(a) }}
        >
          <span className="ntf-icon">{a.icono}</span>
          <span className="ntf-text">
            <span className="ntf-title">{a.titulo}</span>
            <span className="ntf-body">{a.cuerpo}</span>
          </span>
          <button
            className="ntf-close"
            aria-label="Cerrar"
            onClick={(e) => { e.stopPropagation(); quitar(a.id) }}
          >×</button>
        </div>
      ))}
    </div>
  )
}

export default Notificador