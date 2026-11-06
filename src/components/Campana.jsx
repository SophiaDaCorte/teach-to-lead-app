import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import './Campana.css'

const ICONOS = {
  calificacion: '📊', tarea: '📝', checklist: '✅', week_off: '🏖️',
  certificado: '📜', horas: '⏰', anuncio: '📢'
}

const TEXTO = {
  en: {
    title: 'Notifications', all: 'Mark all as read', empty: "You're all caught up.",
    soon: 'Coming due', now: 'now', yesterday: 'Yesterday', remove: 'Remove',
    hoy: 'due today', manana: 'due tomorrow',
    en: (n) => `due in ${n} days`, atraso: (n) => `${n} day${n > 1 ? 's' : ''} overdue`
  },
  es: {
    title: 'Avisos', all: 'Marcar todo como leído', empty: 'Estás al día.',
    soon: 'Por vencer', now: 'ahora', yesterday: 'Ayer', remove: 'Quitar',
    hoy: 'vence hoy', manana: 'vence mañana',
    en: (n) => `vence en ${n} días`, atraso: (n) => `venció hace ${n} día${n > 1 ? 's' : ''}`
  }
}

function hace(ts, T, loc) {
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (min < 1) return T.now
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  if (h < 48) return T.yesterday
  return new Date(ts).toLocaleDateString(loc, { month: 'short', day: 'numeric' })
}

function Campana({ esEstudiante = false, claseBoton = 'dash-icon-btn' }) {
  const navigate = useNavigate()
  const T = esEstudiante ? TEXTO.es : TEXTO.en
  const loc = esEstudiante ? 'es-HN' : 'en-US'
  const ref = useRef(null)
  const [uid, setUid] = useState(null)
  const [items, setItems] = useState([])
  const [proximas, setProximas] = useState([])
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const id = session.session.user.id
      setUid(id)

      const limite = new Date(Date.now() - 60 * 86400000).toISOString()
      await supabase.from('notificaciones').delete().eq('user_id', id).lt('created_at', limite)

      const { data } = await supabase
        .from('notificaciones').select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
      setItems(data || [])

      if (esEstudiante) await cargarProximas(id)
    }
    cargar()
  }, [])

  async function cargarProximas(id) {
    const { data: notas } = await supabase
      .from('gradebook_notas').select('columna_id')
      .eq('estudiante_id', id).eq('estado', 'missing')
    const colIds = (notas || []).map(n => n.columna_id)
    if (colIds.length === 0) { setProximas([]); return }

    const { data: cols } = await supabase
      .from('gradebook_columnas').select('id, titulo, fecha, tipo')
      .in('id', colIds).eq('tipo', 'tarea').not('fecha', 'is', null)

    const hoy = new Date(); hoy.setHours(12, 0, 0, 0)
    const lista = (cols || [])
      .map(c => ({ ...c, dias: Math.round((new Date(c.fecha + 'T12:00:00') - hoy) / 86400000) }))
      .filter(c => c.dias <= 2 && c.dias >= -30)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 5)
    setProximas(lista)
  }

  useEffect(() => {
    if (!uid) return
    const sub = supabase.channel(`campana-${uid}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${uid}` },
        (pl) => setItems(prev => prev.some(x => x.id === pl.new.id) ? prev : [pl.new, ...prev].slice(0, 50)))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${uid}` },
        (pl) => setItems(prev => prev.map(x => x.id === pl.new.id ? pl.new : x)))
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [uid])

  useEffect(() => {
    if (!abierto) return
    function fuera(e) { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    function tecla(e) { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const sinLeer = items.filter(n => !n.leida).length

  async function abrirItem(n) {
    if (!n.leida) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x))
      await supabase.from('notificaciones').update({ leida: true }).eq('id', n.id)
    }
    setAbierto(false)
    navigate(n.destino || '/dashboard')
  }

  async function marcarTodas() {
    setItems(prev => prev.map(x => ({ ...x, leida: true })))
    await supabase.from('notificaciones').update({ leida: true }).eq('user_id', uid).eq('leida', false)
  }

  async function quitar(e, n) {
    e.stopPropagation()
    setItems(prev => prev.filter(x => x.id !== n.id))
    await supabase.from('notificaciones').delete().eq('id', n.id)
  }

  function textoVencimiento(dias) {
    if (dias < 0) return T.atraso(Math.abs(dias))
    if (dias === 0) return T.hoy
    if (dias === 1) return T.manana
    return T.en(dias)
  }

  return (
    <div className="cmp-wrap" ref={ref}>
      <button
        className={claseBoton}
        aria-label={T.title}
        onClick={() => setAbierto(!abierto)}
        style={{ position: 'relative' }}
      >
        <i className="ti ti-bell" aria-hidden="true"></i>
        {sinLeer > 0 && <span className="cmp-badge">{sinLeer > 99 ? '99+' : sinLeer}</span>}
      </button>

      {abierto && (
        <div className="cmp-panel" role="dialog" aria-label={T.title}>
          <div className="cmp-head">
            <span className="cmp-title">{T.title}</span>
            {sinLeer > 0 && <button className="cmp-link" onClick={marcarTodas}>{T.all}</button>}
          </div>

          {proximas.length > 0 && (
            <>
              <p className="cmp-section">{T.soon}</p>
              {proximas.map(c => (
                <div
                  key={c.id} className="cmp-item" role="button" tabIndex={0}
                  onClick={() => { setAbierto(false); navigate('/mis-tareas-clase') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setAbierto(false); navigate('/mis-tareas-clase') } }}
                >
                  <span className="cmp-icon">⏳</span>
                  <span className="cmp-text">
                    <span className="cmp-item-title">{c.titulo}</span>
                    <span className={`cmp-body ${c.dias < 0 ? 'cmp-late' : ''}`}>{textoVencimiento(c.dias)}</span>
                  </span>
                </div>
              ))}
            </>
          )}

          {items.length === 0 && proximas.length === 0 && <p className="cmp-empty">{T.empty}</p>}

          {items.map(n => (
            <div
              key={n.id}
              className={`cmp-item ${n.leida ? '' : 'unread'}`}
              role="button" tabIndex={0}
              onClick={() => abrirItem(n)}
              onKeyDown={(e) => { if (e.key === 'Enter') abrirItem(n) }}
            >
              <span className="cmp-icon">{ICONOS[n.tipo] || '🔔'}</span>
              <span className="cmp-text">
                <span className="cmp-item-title">{n.titulo}</span>
                {n.cuerpo && <span className="cmp-body">{n.cuerpo}</span>}
                <span className="cmp-time">{hace(n.created_at, T, loc)}</span>
              </span>
              <button className="cmp-x" aria-label={T.remove} onClick={(e) => quitar(e, n)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Campana