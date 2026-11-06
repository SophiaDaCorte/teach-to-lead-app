import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import { equiposDe, comunidadesDe, cargarResumen, esVoluntario, supervisa, esParticipante } from '../chat.js'
import '../components/PageBackground.css'
import './Chat.css'

const EN = {
  back: '← Back', chats: '← Chats', title: 'Chat', teams: 'Teams', classes: 'Classes',
  direct: 'Direct messages', newMsg: '+ New message', cancel: 'Cancel',
  empty: 'No messages yet. Say hello!', placeholder: 'Write a message...', send: 'Send',
  search: 'Search for a person...', loading: 'Loading...', you: 'You', today: 'Today',
  yesterday: 'Yesterday', confirmDelete: 'Delete this message?', noChats: 'No chats yet.',
  former: 'Former member', classChat: 'Class chat', noResults: 'No one found.',
  cantSend: "You can't write in this chat.", noDms: 'No direct messages yet.',
  myTutor: 'My tutor', privateMsg: 'Private message', privateTitle: 'Private message',
  studentMsgs: 'Student messages', myStudents: 'My students', people: 'Volunteers',
  supervision: 'Student–tutor chats (read only)', readOnly: 'Read only',
  readOnlyNote: 'You are viewing this chat for supervision. You cannot write here.'
}

const ES = {
  back: '← Atrás', chats: '← Chats', title: 'Chat', teams: 'Equipos', classes: 'Clases',
  direct: 'Mensajes directos', newMsg: '+ Nuevo mensaje', cancel: 'Cancelar',
  empty: 'Aún no hay mensajes. ¡Escribe el primero!', placeholder: 'Escribe un mensaje...', send: 'Enviar',
  search: 'Buscar persona...', loading: 'Cargando...', you: 'Tú', today: 'Hoy',
  yesterday: 'Ayer', confirmDelete: '¿Borrar este mensaje?', noChats: 'Todavía no tienes chats.',
  former: 'Ex miembro', classChat: 'Tu chat de clase', noResults: 'No se encontró a nadie.',
  cantSend: 'No puedes escribir en este chat.', noDms: 'Aún no hay mensajes directos.',
  myTutor: 'Mi tutor', privateMsg: 'Mensaje privado', privateTitle: 'Mensaje privado',
  studentMsgs: 'Mensajes de estudiantes', myStudents: 'Mis estudiantes', people: 'Voluntarios',
  supervision: 'Chats estudiante–tutor (solo lectura)', readOnly: 'Solo lectura',
  readOnlyNote: 'Estás viendo este chat para supervisión. No puedes escribir aquí.'
}

const PRIVADOS = ['dm', 'st', 'tutor']

function iniciales(nombre) {
  return (nombre || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function Chat() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [canales, setCanales] = useState([])
  const [personas, setPersonas] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [misComunidades, setMisComunidades] = useState([])
  const [ultimo, setUltimo] = useState({})
  const [sinLeer, setSinLeer] = useState({})
  const [abierto, setAbierto] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [cargandoMsgs, setCargandoMsgs] = useState(false)
  const [listo, setListo] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [filtro, setFiltro] = useState('')
  const abiertoRef = useRef(null)
  const msgsRef = useRef(null)

  const roles = perfil?.roles || []
  const esEst = roles.includes('estudiante')
  const esTutor = roles.includes('tutors')
  const esAdmin = roles.includes('staff_admin')
  const L = esEst ? ES : EN
  const loc = esEst ? 'es-HN' : 'en-US'

  useEffect(() => { abiertoRef.current = abierto }, [abierto])

  useEffect(() => {
    async function iniciar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id
      setUserId(uid)

      const { data: p } = await supabase.from('perfiles').select('*').eq('id', uid).single()
      setPerfil(p)
      const r = p?.roles || []
      const estudiante = r.includes('estudiante')
      const textos = estudiante ? ES : EN

      const equipos = equiposDe(r).map(e => ({
        clave: e.clave, nombre: e.nombre, desc: e.desc, emoji: e.emoji, tipo: 'equipo'
      }))
      const coms = await comunidadesDe(p, uid)
      const clases = coms.map(c => ({
        clave: `com:${c.id}`, nombre: `${c.nombre} ${c.nivel}`, desc: textos.classChat, emoji: '🎒', tipo: 'clase'
      }))

      let tutorFila = []
      if (estudiante && coms.length > 0 && coms[0].tutor_id) {
        const tutorId = coms[0].tutor_id
        const { data: t } = await supabase.from('perfiles').select('nombre').eq('id', tutorId).maybeSingle()
        tutorFila = [{
          clave: `st:${uid}:${tutorId}`, nombre: t?.nombre || textos.myTutor,
          desc: textos.privateMsg, emoji: '🧑‍🏫', tipo: 'tutor'
        }]
      }
      setCanales([...equipos, ...clases, ...tutorFila])

      if (!estudiante) {
        setMisComunidades(coms.filter(c => c.tutor_id === uid))

        if (esVoluntario(r)) {
          const { data: gente } = await supabase
            .from('perfiles').select('id, nombre, titulo, roles').order('nombre')
          setPersonas((gente || []).filter(x => x.id !== uid && esVoluntario(x.roles || [])))
        }

        let lista = []
        if (supervisa(r)) {
          const { data } = await supabase
            .from('perfiles').select('id, nombre, comunidad, nivel')
            .contains('roles', ['estudiante'])
          lista = data || []
        } else if (r.includes('tutors')) {
          for (const c of coms) {
            const { data } = await supabase
              .from('perfiles').select('id, nombre, comunidad, nivel')
              .contains('roles', ['estudiante'])
              .eq('comunidad', c.nombre).eq('nivel', c.nivel)
            lista = lista.concat(data || [])
          }
        }
        setAlumnos(lista)
      }

      const resumen = await cargarResumen(uid)
      setUltimo(resumen.ultimo)
      setSinLeer(resumen.sinLeer)
      setListo(true)
    }
    iniciar()
  }, [])

  useEffect(() => {
    if (!userId) return
    const sub = supabase.channel(`chat-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes' },
        (payload) => alRecibir(payload.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_mensajes' },
        (payload) => setMensajes(prev => prev.filter(m => m.id !== payload.old?.id)))
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [userId])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [mensajes, abierto])

  function alRecibir(m) {
    setUltimo(prev => ({ ...prev, [m.canal]: m }))
    if (m.canal === abiertoRef.current) {
      setMensajes(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
      if (m.user_id !== userId) marcarLeido(m.canal, m.created_at)
    } else if (m.user_id !== userId && esParticipante(m.canal, userId)) {
      setSinLeer(prev => ({ ...prev, [m.canal]: (prev[m.canal] || 0) + 1 }))
    }
  }

  async function marcarLeido(clave, referencia) {
    if (!referencia || !esParticipante(clave, userId)) return
    setSinLeer(prev => ({ ...prev, [clave]: 0 }))
    await supabase.from('chat_lecturas').upsert(
      { user_id: userId, canal: clave, leido_en: referencia },
      { onConflict: 'user_id,canal' }
    )
  }

  async function abrirCanal(clave) {
    setError('')
    setAbierto(clave)
    abiertoRef.current = clave
    setMensajes([])
    setCargandoMsgs(true)
    const { data } = await supabase
      .from('chat_mensajes').select('*')
      .eq('canal', clave)
      .order('created_at', { ascending: false })
      .limit(100)
    const lista = (data || []).reverse()
    setMensajes(lista)
    setCargandoMsgs(false)
    if (lista.length > 0) await marcarLeido(clave, lista[lista.length - 1].created_at)
  }

  function abrirDm(otroId) {
    const clave = `dm:${[userId, otroId].sort().join(':')}`
    setBuscando(false)
    setFiltro('')
    abrirCanal(clave)
  }

  function abrirSt(estudianteId) {
    setBuscando(false)
    setFiltro('')
    abrirCanal(`st:${estudianteId}:${userId}`)
  }

  async function enviar() {
    const t = texto.trim()
    if (!t || enviando || !abierto) return
    setEnviando(true); setError('')
    const { data, error: e } = await supabase.from('chat_mensajes')
      .insert({ canal: abierto, user_id: userId, nombre: perfil?.nombre || null, contenido: t })
      .select().single()
    if (e) {
      setError(e.code === '42501' ? L.cantSend : e.message)
    } else {
      setTexto('')
      setMensajes(prev => prev.some(x => x.id === data.id) ? prev : [...prev, data])
      setUltimo(prev => ({ ...prev, [abierto]: data }))
      await marcarLeido(abierto, data.created_at)
    }
    setEnviando(false)
  }

  async function borrar(m) {
    if (!window.confirm(L.confirmDelete)) return
    const { error: e } = await supabase.from('chat_mensajes').delete().eq('id', m.id)
    if (e) { setError(e.message); return }
    setMensajes(prev => prev.filter(x => x.id !== m.id))
  }

  const nombres = {}
  personas.forEach(x => { nombres[x.id] = x.nombre })
  alumnos.forEach(x => { nombres[x.id] = x.nombre })
  if (userId) nombres[userId] = perfil?.nombre

  function infoCanal(clave) {
    const c = canales.find(x => x.clave === clave)
    if (c) return c

    if (clave.startsWith('dm:')) {
      const otroId = clave.split(':').slice(1).find(id => id !== userId)
      const p = personas.find(x => x.id === otroId)
      return { clave, nombre: p ? p.nombre : L.former, desc: p?.titulo || '', emoji: null, tipo: 'dm' }
    }

    if (clave.startsWith('st:')) {
      const [, a, b] = clave.split(':')
      if (a === userId || b === userId) {
        const otro = a === userId ? b : a
        return { clave, nombre: nombres[otro] || (esEst ? L.myTutor : L.former), desc: L.privateMsg, emoji: null, tipo: 'st' }
      }
      return {
        clave, nombre: `${nombres[a] || L.former} ↔ ${nombres[b] || L.former}`,
        desc: L.readOnly, emoji: '👁️', tipo: 'sup', soloLectura: true
      }
    }

    return { clave, nombre: clave, desc: '', emoji: '💬', tipo: 'otro' }
  }

  function hora(ts) {
    const d = new Date(ts)
    if (d.toDateString() === new Date().toDateString()) {
      return d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' })
  }

  function etiquetaDia(ts) {
    const d = new Date(ts)
    const hoy = new Date()
    const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
    if (d.toDateString() === hoy.toDateString()) return L.today
    if (d.toDateString() === ayer.toDateString()) return L.yesterday
    return d.toLocaleDateString(loc, { weekday: 'long', month: 'short', day: 'numeric' })
  }

  function renderFila(info) {
    const m = ultimo[info.clave]
    const n = sinLeer[info.clave] || 0
    let vista = ''
    if (m) {
      const privado = PRIVADOS.includes(info.tipo)
      const quien = m.user_id === userId
        ? `${L.you}: `
        : (privado ? '' : `${(m.nombre || '').split(' ')[0]}: `)
      vista = quien + m.contenido
    }
    return (
      <button key={info.clave} className="cht-row" onClick={() => abrirCanal(info.clave)}>
        <span className="cht-avatar">{info.emoji || iniciales(info.nombre)}</span>
        <span className="cht-info">
          <span className="cht-name">{info.nombre}</span>
          <span className="cht-preview">{vista || info.desc}</span>
        </span>
        <span className="cht-side">
          {m && <span className="cht-hora">{hora(m.created_at)}</span>}
          {n > 0 && <span className="cht-badge">{n > 99 ? '99+' : n}</span>}
        </span>
      </button>
    )
  }

  if (!perfil || !listo) {
    return (
      <div className="page-wrapper">
        <div className="cht-content"><p className="cht-empty">{perfil ? L.loading : 'Loading...'}</p></div>
      </div>
    )
  }

  const porReciente = (a, b) => new Date(ultimo[b]?.created_at || 0) - new Date(ultimo[a]?.created_at || 0)

  const equipos = canales.filter(c => c.tipo === 'equipo')
  const clases = canales.filter(c => c.tipo === 'clase')
  const tutores = canales.filter(c => c.tipo === 'tutor')

  const dmClaves = Object.keys(ultimo).filter(k => k.startsWith('dm:'))
  if (abierto && abierto.startsWith('dm:') && !dmClaves.includes(abierto)) dmClaves.push(abierto)
  dmClaves.sort(porReciente)

  const stTodos = Object.keys(ultimo).filter(k => k.startsWith('st:'))
  const stMios = stTodos.filter(k => esParticipante(k, userId))
  if (abierto && abierto.startsWith('st:') && esParticipante(abierto, userId) && !esEst && !stMios.includes(abierto)) stMios.push(abierto)
  stMios.sort(porReciente)
  const stSupervision = supervisa(roles) ? stTodos.filter(k => !esParticipante(k, userId)).sort(porReciente) : []

  const personasFiltradas = personas.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
  const misAlumnos = alumnos.filter(s => misComunidades.some(c => c.nombre === s.comunidad && c.nivel === s.nivel))
  const alumnosFiltrados = misAlumnos.filter(s => s.nombre.toLowerCase().includes(filtro.toLowerCase()))

  const atras = esEst ? '/estudiantes' : '/dashboard'
  const infoAbierto = abierto ? infoCanal(abierto) : null
  const esPrivado = infoAbierto ? PRIVADOS.includes(infoAbierto.tipo) : false
  let diaPrevio = null

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="cht-content">

        {!abierto && (
          <>
            <button className="cht-back" onClick={() => navigate(atras)}>{L.back}</button>
            <h1 className="cht-title">{L.title}</h1>

            {equipos.length > 0 && <p className="cht-section">{L.teams}</p>}
            {equipos.map(renderFila)}

            {clases.length > 0 && <p className="cht-section">{L.classes}</p>}
            {clases.map(renderFila)}

            {tutores.length > 0 && <p className="cht-section">{L.privateTitle}</p>}
            {tutores.map(renderFila)}

            {esTutor && stMios.length > 0 && (
              <>
                <p className="cht-section">{L.studentMsgs}</p>
                {stMios.map(k => renderFila(infoCanal(k)))}
              </>
            )}

            {!esEst && (
              <>
                <div className="cht-section-row">
                  <p className="cht-section" style={{ margin: 0 }}>{L.direct}</p>
                  <button className="cht-new" onClick={() => { setBuscando(!buscando); setFiltro('') }}>
                    {buscando ? L.cancel : L.newMsg}
                  </button>
                </div>

                {buscando && (
                  <div className="cht-panel">
                    <input
                      className="cht-search" type="text" autoFocus
                      placeholder={L.search} value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                    {alumnosFiltrados.length === 0 && personasFiltradas.length === 0 && (
                      <p className="cht-empty" style={{ margin: '10px 0 0' }}>{L.noResults}</p>
                    )}

                    {alumnosFiltrados.length > 0 && <p className="cht-panel-label">{L.myStudents}</p>}
                    {alumnosFiltrados.map(s => (
                      <button key={s.id} className="cht-row cht-row-flat" onClick={() => abrirSt(s.id)}>
                        <span className="cht-avatar">{iniciales(s.nombre)}</span>
                        <span className="cht-info">
                          <span className="cht-name">{s.nombre}</span>
                          <span className="cht-preview">{s.comunidad} {s.nivel}</span>
                        </span>
                      </button>
                    ))}

                    {alumnosFiltrados.length > 0 && personasFiltradas.length > 0 && (
                      <p className="cht-panel-label">{L.people}</p>
                    )}
                    {personasFiltradas.map(p => (
                      <button key={p.id} className="cht-row cht-row-flat" onClick={() => abrirDm(p.id)}>
                        <span className="cht-avatar">{iniciales(p.nombre)}</span>
                        <span className="cht-info">
                          <span className="cht-name">{p.nombre}</span>
                          <span className="cht-preview">{p.titulo}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {dmClaves.length === 0 && !buscando && <p className="cht-empty" style={{ margin: '8px 0 0' }}>{L.noDms}</p>}
                {dmClaves.map(k => renderFila(infoCanal(k)))}

                {stSupervision.length > 0 && (
                  <>
                    <p className="cht-section">{L.supervision}</p>
                    {stSupervision.map(k => renderFila(infoCanal(k)))}
                  </>
                )}
              </>
            )}

            {canales.length === 0 && dmClaves.length === 0 && <p className="cht-empty">{L.noChats}</p>}
          </>
        )}

        {abierto && (
          <div className="cht-conv">
            <div className="cht-head">
              <button className="cht-head-back" onClick={() => { setAbierto(null); setError('') }}>{L.chats}</button>
              <span className="cht-avatar cht-avatar-sm">{infoAbierto.emoji || iniciales(infoAbierto.nombre)}</span>
              <span className="cht-info">
                <span className="cht-name">{infoAbierto.nombre}</span>
                {infoAbierto.desc && <span className="cht-preview">{infoAbierto.desc}</span>}
              </span>
            </div>

            <div className="cht-msgs" ref={msgsRef}>
              {cargandoMsgs && <p className="cht-empty">{L.loading}</p>}
              {!cargandoMsgs && mensajes.length === 0 && <p className="cht-empty">{L.empty}</p>}

              {mensajes.map(m => {
                const dia = new Date(m.created_at).toDateString()
                const separador = dia !== diaPrevio
                diaPrevio = dia
                const mio = m.user_id === userId
                return (
                  <div key={m.id} style={{ display: 'contents' }}>
                    {separador && <div className="cht-day">{etiquetaDia(m.created_at)}</div>}
                    <div className={`cht-msg ${mio ? 'mine' : ''}`}>
                      {!mio && !esPrivado && <span className="cht-who">{m.nombre || '—'}</span>}
                      <div className="cht-bubble">{m.contenido}</div>
                      <span className="cht-time">
                        {new Date(m.created_at).toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' })}
                        {(mio || esAdmin) && (
                          <button className="cht-del" onClick={() => borrar(m)} aria-label="Delete message">
                            <i className="ti ti-trash" aria-hidden="true"></i>
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {error && <p className="cht-error">{error}</p>}

            {infoAbierto.soloLectura ? (
              <p className="cht-readonly">{L.readOnlyNote}</p>
            ) : (
              <div className="cht-compose">
                <textarea
                  className="cht-input" rows={1} maxLength={2000}
                  placeholder={L.placeholder} value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
                  }}
                />
                <button className="cht-send" onClick={enviar} disabled={enviando || !texto.trim()}>{L.send}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat