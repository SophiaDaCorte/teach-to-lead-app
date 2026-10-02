import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './EstudianteDashboard.css'

function EstudianteDashboard() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)
  const [claseHoy, setClaseHoy] = useState(null)
  const [faltasSinExcusar, setFaltasSinExcusar] = useState([])
  const [anuncios, setAnuncios] = useState([])
  const [razonesExcusa, setRazonesExcusa] = useState({})

  const DIAS = {
    0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miércoles',
    4: 'jueves', 5: 'viernes', 6: 'sábado'
  }

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

      if (perfilData?.comunidad) {
        const hoy = DIAS[new Date().getDay()]
        const { data: claseData } = await supabase
          .from('clases')
          .select('*, tutor:tutor_id(nombre)')
          .eq('comunidad', perfilData.comunidad)
          .eq('dia_semana', hoy)
          .single()
        setClaseHoy(claseData || null)
      }

      const { data: faltas } = await supabase
        .from('asistencia')
        .select('*')
        .eq('estudiante_id', session.session.user.id)
        .eq('presente', false)
        .eq('excusada', false)
      setFaltasSinExcusar(faltas || [])

      const { data: anunciosData } = await supabase
        .from('announcements')
        .select('*')
        .overlaps('dirigido_a', ['all', 'estudiantes'])
        .order('created_at', { ascending: false })
        .limit(3)
      setAnuncios(anunciosData || [])
    }
    cargarDatos()
  }, [])

  async function enviarExcusa(faltaId) {
    const razon = razonesExcusa[faltaId]
    if (!razon?.trim()) return
    await supabase
      .from('asistencia')
      .update({ excusada: true, razon_excusa: razon })
      .eq('id', faltaId)
    setFaltasSinExcusar(faltasSinExcusar.filter(f => f.id !== faltaId))
  }

  function diasRestantes(fecha) {
    const limite = new Date(fecha)
    limite.setDate(limite.getDate() + 3)
    const hoy = new Date()
    const diff = Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  function formatFecha(fecha) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-HN', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
  }

  function formatAnuncio(fecha) {
    const diff = Math.floor((new Date() - new Date(fecha)) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Hace 1 día'
    return `Hace ${diff} días`
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!perfil) return <p style={{fontFamily:'Poppins,sans-serif', padding:'2rem', color:'#aaa'}}>Cargando...</p>

  const comunidadLabel = perfil.comunidad && perfil.nivel
    ? `${perfil.comunidad} ${perfil.nivel}`
    : perfil.comunidad || null

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="est-content">
        <div className="est-topbar">
          <div>
            <h1 className="est-name">Hola, {perfil.nombre} 👋</h1>
            <p className="est-sub">
              Estudiante{comunidadLabel ? ` · ${comunidadLabel}` : ''} · Teach to Lead
            </p>
          </div>
          <button className="est-signout" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>

        {claseHoy && (
          <div className="est-clase-banner">
            <div className="est-clase-dot"></div>
            <div className="est-clase-info">
              <p className="est-clase-titulo">Clase de inglés — hoy {claseHoy.hora_inicio} – {claseHoy.hora_fin}</p>
              <p className="est-clase-detalle">con {claseHoy.tutor?.nombre || 'tu profesora'}{comunidadLabel ? ` · ${comunidadLabel}` : ''}</p>
            </div>
            {claseHoy.link_clase && (
              <a href={claseHoy.link_clase} target="_blank" rel="noreferrer" className="est-clase-btn">
                Unirse
              </a>
            )}
          </div>
        )}

        {faltasSinExcusar.map(falta => (
          <div key={falta.id} className="est-falta-alert">
            <div className="est-falta-header">
              <p className="est-falta-title">⚠️ Tienes una falta sin excusar</p>
              <span className="est-falta-badge">{diasRestantes(falta.clase_fecha)} días para excusarla</span>
            </div>
            <div className="est-falta-row">
              <span className="est-falta-fecha">{formatFecha(falta.clase_fecha)}</span>
              <input
                className="est-falta-input"
                type="text"
                placeholder="Escribe el motivo de tu falta..."
                value={razonesExcusa[falta.id] || ''}
                onChange={(e) => setRazonesExcusa({...razonesExcusa, [falta.id]: e.target.value})}
              />
              <button className="est-falta-send" onClick={() => enviarExcusa(falta.id)}>Enviar</button>
            </div>
            <p className="est-falta-timer">
              Tienes hasta el {(() => {
                const d = new Date(falta.clase_fecha)
                d.setDate(d.getDate() + 3)
                return d.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })
              })()} para excusar esta falta.
            </p>
          </div>
        ))}

        <div className="est-metrics">
          <div className="est-metric">
            <div className="est-metric-n" style={{color:'#3B6D11'}}>—</div>
            <div className="est-metric-l">Promedio</div>
          </div>
          <div className="est-metric">
            <div className="est-metric-n">—</div>
            <div className="est-metric-l">Tareas pendientes</div>
          </div>
          <div className="est-metric">
            <div className="est-metric-n" style={{color:'#3B6D11'}}>—</div>
            <div className="est-metric-l">Asistencia</div>
          </div>
        </div>

        <p className="est-sl">Acceso rápido</p>
        <div className="est-modules">
          <div className="est-mod">
            <div className="est-mod-top">
              <span className="est-mod-emoji">📚</span>
            </div>
            <div className="est-mod-title">Mis tareas</div>
            <div className="est-mod-desc">Ver y entregar tareas</div>
          </div>

          <div className="est-mod">
            <div className="est-mod-top">
              <span className="est-mod-emoji">⭐</span>
            </div>
            <div className="est-mod-title">Mis calificaciones</div>
            <div className="est-mod-desc">Ver notas por materia</div>
          </div>

          <div className="est-mod">
            <div className="est-mod-top">
              <span className="est-mod-emoji">📖</span>
            </div>
            <div className="est-mod-title">Mi libro</div>
            <div className="est-mod-desc">Libro de inglés online</div>
          </div>

          <div className="est-mod">
            <div className="est-mod-top">
              <span className="est-mod-emoji">🗓️</span>
            </div>
            <div className="est-mod-title">Horario</div>
            <div className="est-mod-desc">Ver horario completo</div>
          </div>

          <div className="est-mod">
            <div className="est-mod-top">
              <span className="est-mod-emoji">💬</span>
            </div>
            <div className="est-mod-title">Chat</div>
            <div className="est-mod-desc">Hablar con tu comunidad</div>
          </div>

          <div className="est-mod">
            <div className="est-mod-top">
              <span className="est-mod-emoji">📋</span>
              {faltasSinExcusar.length > 0 && (
                <span className="est-badge badge-warn">{faltasSinExcusar.length} falta{faltasSinExcusar.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="est-mod-title">Mis faltas</div>
            <div className="est-mod-desc">Ver y excusar ausencias</div>
          </div>
        </div>

        <p className="est-sl">Anuncios de tu profesora</p>
        <div className="est-card">
          {anuncios.length === 0 && (
            <p style={{fontSize:'13px', color:'#aaa', textAlign:'center', padding:'1rem 0'}}>No hay anuncios todavía.</p>
          )}
          {anuncios.map(a => (
            <div key={a.id} className="est-ann-row">
              <p className="est-ann-title">{a.titulo}</p>
              <p className="est-ann-meta">{formatAnuncio(a.created_at)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default EstudianteDashboard