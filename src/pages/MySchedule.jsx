import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { cargarComunidadesTutor } from '../tutor.js'
import SelectorComunidad from '../components/SelectorComunidad.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './MySchedule.css'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function MySchedule() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [comunidades, setComunidades] = useState([])
  const [comunidadSeleccionada, setComunidadSeleccionada] = useState(null)
  const [clases, setClases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [dia, setDia] = useState('Lunes')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [link, setLink] = useState('')

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id
      setUserId(uid)

      const { data: p } = await supabase.from('perfiles').select('roles').eq('id', uid).maybeSingle()
      const coms = await cargarComunidadesTutor(uid, p?.roles || [])
      setComunidades(coms)

      if (coms.length > 0) {
        const primera = coms.find(c => c.esMia) || coms[0]
        setComunidadSeleccionada(primera)
        await cargarClases(primera.nombre)
      }
      setCargando(false)
    }
    cargarDatos()
  }, [])

  async function cargarClases(nombre) {
    const { data } = await supabase.from('clases').select('*').eq('comunidad', nombre)
    setClases(data || [])
  }

  async function cambiarComunidad(comId) {
    const com = comunidades.find(c => c.id === comId)
    if (!com) return
    setComunidadSeleccionada(com)
    setMostrarForm(false); setEditando(null); resetForm()
    await cargarClases(com.nombre)
  }

  function resetForm() { setDia('Lunes'); setHoraInicio(''); setHoraFin(''); setLink(''); setError('') }

  async function guardarClase() {
    if (!horaInicio || !horaFin || !comunidadSeleccionada) return
    if (horaFin <= horaInicio) { setError('The end time must be after the start time.'); return }
    setGuardando(true); setError('')
    let resultado
    if (editando) {
      resultado = await supabase.from('clases').update({
        dia_semana: dia, hora_inicio: horaInicio, hora_fin: horaFin, link_clase: link || null
      }).eq('id', editando.id)
    } else {
      resultado = await supabase.from('clases').insert({
        comunidad: comunidadSeleccionada.nombre, dia_semana: dia,
        hora_inicio: horaInicio, hora_fin: horaFin, link_clase: link || null,
        tutor_id: comunidadSeleccionada.tutor_id || userId
      })
    }
    if (resultado.error) { setError(resultado.error.message); setGuardando(false); return }
    setEditando(null); setMostrarForm(false)
    resetForm()
    setGuardando(false)
    await cargarClases(comunidadSeleccionada.nombre)
  }

  async function eliminarClase(id) {
    if (!window.confirm('Delete this class time?')) return
    await supabase.from('clases').delete().eq('id', id)
    setClases(clases.filter(c => c.id !== id))
  }

  function abrirEditar(c) {
    setEditando(c); setDia(c.dia_semana)
    setHoraInicio((c.hora_inicio || '').slice(0, 5)); setHoraFin((c.hora_fin || '').slice(0, 5))
    setLink(c.link_clase || ''); setError('')
    setMostrarForm(false)
  }

  function formatHora(h) {
    if (!h) return '—'
    const [hour, min] = h.split(':')
    const h12 = Number(hour) % 12 || 12
    const ampm = Number(hour) < 12 ? 'AM' : 'PM'
    return `${h12}:${min} ${ampm}`
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="ms-content">
        <button className="ms-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <div className="ms-topbar">
          <h1 className="ms-title">My schedule</h1>
          {comunidadSeleccionada && (
            <button className={`ms-new-btn ${mostrarForm ? 'active' : ''}`} onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); resetForm() }}>
              {mostrarForm ? 'Cancel' : '+ Add class'}
            </button>
          )}
        </div>

        {cargando && <p style={{color:'#aaa', fontSize:'14px'}}>Loading...</p>}

        {!cargando && comunidades.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No community assigned yet.</p>
        )}

        {comunidades.length > 1 && (
          <div style={{marginBottom:'1.25rem'}}>
            <label className="ms-label">Community</label>
            <SelectorComunidad
              className="ms-input"
              comunidades={comunidades}
              valor={comunidadSeleccionada?.id}
              onChange={cambiarComunidad}
              style={{maxWidth:'340px'}}
            />
          </div>
        )}

        {comunidadSeleccionada && !comunidadSeleccionada.esMia && (
          <div style={{background:'#EEEDFE', border:'0.5px solid #c7d2fe', borderRadius:'10px', padding:'10px 14px', marginBottom:'1rem'}}>
            <p style={{fontSize:'12px', color:'#3C3489', margin:0, fontWeight:500}}>
              👁️ You're editing {comunidadSeleccionada.tutor_nombre ? `${comunidadSeleccionada.tutor_nombre}'s` : 'an unassigned'} schedule as staff.
            </p>
          </div>
        )}

        {comunidadSeleccionada && <p style={{fontSize:'13px', color:'#aaa', margin:'0 0 1.25rem'}}>{comunidadSeleccionada.nombre} · {comunidadSeleccionada.nivel}</p>}

        {(mostrarForm || editando) && (
          <div className="ms-form">
            <p className="ms-form-title">{editando ? 'Editing class' : 'New class'}</p>
            <div className="ms-row3">
              <div className="ms-field">
                <label className="ms-label">Day</label>
                <select className="ms-input" value={dia} onChange={(e) => setDia(e.target.value)}>
                  {DIAS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="ms-field">
                <label className="ms-label">Start time</label>
                <input className="ms-input" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
              </div>
              <div className="ms-field">
                <label className="ms-label">End time</label>
                <input className="ms-input" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
              </div>
            </div>
            <div className="ms-field">
              <label className="ms-label">Class link (Zoom, Meet...)</label>
              <input className="ms-input" type="url" placeholder="https://zoom.us/..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            {error && <p style={{fontSize:'12px', color:'#b91c1c', margin:'0 0 8px'}}>{error}</p>}
            <div className="ms-form-btns">
              <button className="ms-save" onClick={guardarClase} disabled={guardando || !horaInicio || !horaFin}>
                {guardando ? 'Saving...' : editando ? 'Save changes' : 'Add class'}
              </button>
              <button className="ms-cancel" onClick={() => { setMostrarForm(false); setEditando(null); resetForm() }}>Cancel</button>
            </div>
          </div>
        )}

        {comunidadSeleccionada && clases.length === 0 && !mostrarForm && !editando && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No classes scheduled yet. Add one above.</p>
        )}

        {DIAS.map(d => {
          const clasesDelDia = clases.filter(c => c.dia_semana === d)
          if (clasesDelDia.length === 0) return null
          return (
            <div key={d} className="ms-card" style={{marginBottom:'8px'}}>
              <div style={{padding:'10px 16px', borderBottom:'0.5px solid #eee'}}>
                <p style={{fontSize:'13px', fontWeight:600, color:'#1a1a1a', margin:0}}>{d}</p>
              </div>
              {clasesDelDia.map(c => (
                <div key={c.id} style={{padding:'10px 16px', borderBottom:'0.5px solid #f5f5f5', display:'flex', alignItems:'center', gap:'10px'}}>
                  <div style={{flex:1}}>
                    <p style={{fontSize:'13px', fontWeight:500, color:'#1a1a1a', margin:0}}>{formatHora(c.hora_inicio)} — {formatHora(c.hora_fin)}</p>
                    {c.link_clase && <a href={c.link_clase} target="_blank" rel="noreferrer" style={{fontSize:'11px', color:'#2d2a86', wordBreak:'break-all'}}>{c.link_clase}</a>}
                  </div>
                  <button onClick={() => abrirEditar(c)} style={{padding:'4px 7px', borderRadius:'6px', border:'0.5px solid #eee', background:'none', color:'#555', fontSize:'13px', cursor:'pointer'}}>
                    <i className="ti ti-edit" aria-hidden="true"></i>
                  </button>
                  <button onClick={() => eliminarClase(c.id)} style={{padding:'4px 7px', borderRadius:'6px', border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:'13px', cursor:'pointer'}}>
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MySchedule