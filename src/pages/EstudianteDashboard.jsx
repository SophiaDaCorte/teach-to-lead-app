import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { cargarResumen } from '../chat.js'
import Campana from '../components/Campana.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './EstudianteDashboard.css'

function EstudianteDashboard() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [claseHoy, setClaseHoy] = useState(null)
  const [faltasNoExcusadas, setFaltasNoExcusadas] = useState(0)
  const [anuncios, setAnuncios] = useState([])
  const [tareasPendientes, setTareasPendientes] = useState(0)
  const [promedio, setPromedio] = useState(100)
  const [asistenciaPct, setAsistenciaPct] = useState(100)
  const [chatSinLeer, setChatSinLeer] = useState(0)
  const [excusaInput, setExcusaInput] = useState('')
  const [enviandoExcusa, setEnviandoExcusa] = useState(false)
  const [excusaEnviada, setExcusaEnviada] = useState(false)
  const [timerExcusa, setTimerExcusa] = useState(300)

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id

      const { data: perfilData } = await supabase
        .from('perfiles').select('*').eq('id', uid).single()
      setPerfil(perfilData)

      const resumen = await cargarResumen(uid)
      setChatSinLeer(resumen.total)

      if (perfilData?.comunidad) {
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const hoy = diasSemana[new Date().getDay()]
        const { data: clases } = await supabase
          .from('clases').select('*')
          .eq('comunidad', perfilData.comunidad).eq('dia_semana', hoy)
        if (clases && clases.length > 0) setClaseHoy(clases[0])
      }

      const { data: asist } = await supabase
        .from('asistencia').select('*').eq('estudiante_id', uid)
      const total = (asist || []).length
      const presentes = (asist || []).filter(a => a.presente).length
      setFaltasNoExcusadas((asist || []).filter(a => !a.presente && !a.excusada).length)
      setAsistenciaPct(total > 0 ? Math.round((presentes / total) * 100) : 100)

      const { data: anunciosData } = await supabase
        .from('announcements').select('*')
        .order('created_at', { ascending: false }).limit(2)
      setAnuncios(anunciosData || [])

      const { data: notasData } = await supabase
        .from('gradebook_notas').select('*').eq('estudiante_id', uid)

      const colIds = [...new Set((notasData || []).map(n => n.columna_id))]
      if (colIds.length > 0) {
        const { data: colsData } = await supabase
          .from('gradebook_columnas').select('*').in('id', colIds)
        const tareaColIds = (colsData || []).filter(c => c.tipo === 'tarea').map(c => c.id)
        setTareasPendientes((notasData || []).filter(n => n.estado === 'missing' && tareaColIds.includes(n.columna_id)).length)

        const calificadas = (notasData || []).filter(n => n.estado === 'calificado')
        if (calificadas.length > 0) {
          const prom = Math.round(calificadas.reduce((sum, n) => {
            const col = (colsData || []).find(c => c.id === n.columna_id)
            return sum + (col ? (n.nota / col.max_score) * 100 : 0)
          }, 0) / calificadas.length)
          setPromedio(prom)
        }
      }
    }
    cargarDatos()
  }, [])

  useEffect(() => {
    if (faltasNoExcusadas === 0) return
    const interval = setInterval(() => {
      setTimerExcusa(prev => { if (prev <= 1) { clearInterval(interval); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(interval)
  }, [faltasNoExcusadas])

  async function enviarExcusa() {
    if (!excusaInput.trim()) return
    setEnviandoExcusa(true)
    const { data: session } = await supabase.auth.getSession()
    const uid = session.session.user.id
    const { data: faltas } = await supabase.from('asistencia').select('*')
      .eq('estudiante_id', uid).eq('presente', false).eq('excusada', false)
      .order('clase_fecha', { ascending: false }).limit(1)
    if (faltas && faltas.length > 0) {
      await supabase.from('asistencia').update({ excusada: true, razon_excusa: excusaInput }).eq('id', faltas[0].id)
      setFaltasNoExcusadas(0)
      setExcusaEnviada(true)
    }
    setEnviandoExcusa(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!perfil) return <p>Cargando...</p>

  const minutos = Math.floor(timerExcusa / 60)
  const segundos = timerExcusa % 60

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="est-content">
        <div className="est-topbar">
          <div>
            <h1 className="est-name">¡Hola, {perfil.nombre}! 👋</h1>
            <p className="est-role">Estudiante · {perfil.comunidad} {perfil.nivel} · Teach to Lead</p>
          </div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <Campana esEstudiante claseBoton="est-signout" />
            <button className="est-signout" onClick={cerrarSesion}>
              <i className="ti ti-logout" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {claseHoy && (
          <div className="est-class-banner">
            <div>
              <p className="est-banner-title">📚 ¡Tienes clase hoy!</p>
              <p className="est-banner-sub">{claseHoy.hora_inicio} — {claseHoy.hora_fin}</p>
            </div>
            {claseHoy.link_clase && (
              <a href={claseHoy.link_clase} target="_blank" rel="noreferrer" className="est-join-btn">
                Entrar a la clase
              </a>
            )}
          </div>
        )}

        {faltasNoExcusadas > 0 && !excusaEnviada && (
          <div className="est-alert">
            <p className="est-alert-title">⚠️ Tienes {faltasNoExcusadas} falta{faltasNoExcusadas > 1 ? 's' : ''} sin excusar</p>
            <p className="est-alert-sub">
              {timerExcusa > 0 ? `Tienes ${minutos}:${segundos.toString().padStart(2,'0')} para enviar una excusa` : 'Tiempo expirado'}
            </p>
            {timerExcusa > 0 && (
              <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
                <input className="est-excuse-input" type="text" placeholder="¿Qué pasó?" value={excusaInput} onChange={(e) => setExcusaInput(e.target.value)} />
                <button className="est-excuse-btn" onClick={enviarExcusa} disabled={enviandoExcusa || !excusaInput.trim()}>Enviar</button>
              </div>
            )}
          </div>
        )}

        {excusaEnviada && (
          <div style={{background:'#f0f7e6', border:'0.5px solid #c0dd97', borderRadius:'12px', padding:'12px 16px', marginBottom:'1.25rem'}}>
            <p style={{fontSize:'13px', fontWeight:600, color:'#3B6D11', margin:0}}>✓ Excusa enviada con éxito</p>
          </div>
        )}

        <div className="est-metrics">
          <div className="est-metric">
            <div className="est-metric-n" style={{color: promedio >= 70 ? '#15803d' : '#b91c1c'}}>{promedio}%</div>
            <div className="est-metric-l">Promedio</div>
          </div>
          {tareasPendientes > 0 && (
            <div className="est-metric">
              <div className="est-metric-n" style={{color:'#b91c1c'}}>{tareasPendientes}</div>
              <div className="est-metric-l">Tareas faltantes</div>
            </div>
          )}
          <div className="est-metric">
            <div className="est-metric-n" style={{color: asistenciaPct >= 80 ? '#15803d' : '#b91c1c'}}>{asistenciaPct}%</div>
            <div className="est-metric-l">Asistencia</div>
          </div>
        </div>

        <p className="est-sl">Mis módulos</p>
        <div className="est-modules">
          <div className="est-mod" onClick={() => navigate('/mis-tareas-clase')} style={{cursor:'pointer'}}>
            <div className="est-mod-top">
              <span className="est-mod-emoji">📝</span>
              {tareasPendientes > 0 && <span className="est-badge">{tareasPendientes}</span>}
            </div>
            <div className="est-mod-title">Mis tareas</div>
            <div className="est-mod-desc">Entregar y ver tareas</div>
          </div>
          <div className="est-mod" onClick={() => navigate('/mis-calificaciones')} style={{cursor:'pointer'}}>
            <div className="est-mod-top"><span className="est-mod-emoji">📊</span></div>
            <div className="est-mod-title">Mis calificaciones</div>
            <div className="est-mod-desc">Ver todas mis notas</div>
          </div>
          <div className="est-mod" onClick={() => navigate('/chat')} style={{cursor:'pointer'}}>
            <div className="est-mod-top">
              <span className="est-mod-emoji">💬</span>
              {chatSinLeer > 0 && <span className="est-badge">{chatSinLeer}</span>}
            </div>
            <div className="est-mod-title">Chat</div>
            <div className="est-mod-desc">Tu clase y tu tutor</div>
          </div>
          <div className="est-mod" onClick={() => navigate('/mi-libro')} style={{cursor:'pointer'}}>
            <div className="est-mod-top"><span className="est-mod-emoji">📖</span></div>
            <div className="est-mod-title">Mi libro</div>
            <div className="est-mod-desc">Descargar mi libro</div>
          </div>
          <div className="est-mod" onClick={() => navigate('/mi-horario')} style={{cursor:'pointer'}}>
            <div className="est-mod-top"><span className="est-mod-emoji">🗓️</span></div>
            <div className="est-mod-title">Mi horario</div>
            <div className="est-mod-desc">Ver horario de clases</div>
          </div>
          <div className="est-mod" onClick={() => navigate('/mis-faltas')} style={{cursor:'pointer'}}>
            <div className="est-mod-top">
              <span className="est-mod-emoji">📅</span>
              {faltasNoExcusadas > 0 && <span className="est-badge">{faltasNoExcusadas}</span>}
            </div>
            <div className="est-mod-title">Mis faltas</div>
            <div className="est-mod-desc">Ver mi asistencia</div>
          </div>
          <div className="est-mod" onClick={() => navigate('/announcements')} style={{cursor:'pointer'}}>
            <div className="est-mod-top"><span className="est-mod-emoji">📢</span></div>
            <div className="est-mod-title">Anuncios</div>
            <div className="est-mod-desc">Noticias de TTL</div>
          </div>
        </div>

        <p className="est-sl">Últimos anuncios</p>
        <div className="est-card">
          {anuncios.length === 0 && <p style={{fontSize:'13px', color:'#aaa', textAlign:'center', padding:'1rem 0'}}>No hay anuncios aún.</p>}
          {anuncios.map((a) => (
            <div key={a.id} className="est-ann-row">
              <div className="est-ann-title">{a.titulo}</div>
              <div className="est-ann-meta">{new Date(a.created_at).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default EstudianteDashboard