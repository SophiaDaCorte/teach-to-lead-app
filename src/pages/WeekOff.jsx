import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './WeekOff.css'

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(String(fecha).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Badge({ estado }) {
  const map = {
    pendiente: { label: 'Pending', cls: 'badge-pending' },
    aprobado: { label: 'Approved', cls: 'badge-approved' },
    rechazado: { label: 'Rejected', cls: 'badge-rejected' },
  }
  const { label, cls } = map[estado] || { label: estado, cls: '' }
  return <span className={`wo-badge ${cls}`}>{label}</span>
}

const estiloBasura = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#E24B4A', fontSize: '15px', padding: '4px'
}

function WeekOff() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tab, setTab] = useState('request')
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)

  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [razon, setRazon] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  const [misRequests, setMisRequests] = useState([])
  const [todasRequests, setTodasRequests] = useState([])

  const esAdmin = !!perfil?.roles?.includes('staff_admin')

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id
      setUserId(uid)

      const { data: perfilData } = await supabase
        .from('perfiles').select('*').eq('id', uid).single()
      setPerfil(perfilData)

      await cargarSolicitudes(uid, !!perfilData?.roles?.includes('staff_admin'))
    }
    cargarDatos()
  }, [])

  async function cargarSolicitudes(uid, admin) {
    const { data: mis } = await supabase
      .from('solicitudes_week_off').select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setMisRequests(mis || [])

    if (admin) {
      const { data: todas } = await supabase
        .from('solicitudes_week_off').select('*')
        .order('created_at', { ascending: false })
      setTodasRequests(todas || [])
    }
  }

  async function enviarRequest() {
    if (!fechaInicio || !fechaFin) return
    if (fechaFin < fechaInicio) {
      setError('The end date must be after the start date.')
      return
    }
    setEnviando(true); setError('')
    const { error: e } = await supabase.from('solicitudes_week_off').insert({
      user_id: userId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      razon,
      nombre_solicitante: perfil?.nombre,
      estado: 'pendiente'
    })
    if (e) {
      setError(e.message)
    } else {
      setExito(true)
      setTimeout(() => setExito(false), 4000)
      setFechaInicio(''); setFechaFin(''); setRazon('')
      await cargarSolicitudes(userId, esAdmin)
    }
    setEnviando(false)
  }

  async function eliminarRequest(r) {
    const propia = r.user_id === userId
    const texto = propia
      ? 'Delete this request?'
      : `Delete the request from ${r.nombre_solicitante || 'this person'}? This can't be undone.`
    if (!window.confirm(texto)) return

    setError('')
    const { data, error: e } = await supabase
      .from('solicitudes_week_off').delete().eq('id', r.id).select()

    if (e) { setError(e.message); return }
    if (!data || data.length === 0) {
      setError("The request couldn't be deleted. You may not have permission.")
      return
    }
    await cargarSolicitudes(userId, esAdmin)
  }

  async function cambiarEstado(id, estado) {
    setError('')
    const { error: e } = await supabase
      .from('solicitudes_week_off').update({ estado }).eq('id', id)
    if (e) { setError(e.message); return }
    await cargarSolicitudes(userId, esAdmin)
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="wo-content">
        <button className="wo-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="wo-title">Week off</h1>

        <div className="wo-tabs">
          <button className={`wo-tab ${tab === 'request' ? 'active' : ''}`} onClick={() => setTab('request')}>Request</button>
          <button className={`wo-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My requests</button>
          {esAdmin && (
            <button className={`wo-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
              All requests
              {todasRequests.filter(r => r.estado === 'pendiente').length > 0 && (
                <span style={{marginLeft:'6px', fontSize:'10px', fontWeight:600, padding:'1px 6px', borderRadius:'999px', background:'#FCEBEB', color:'#A32D2D'}}>
                  {todasRequests.filter(r => r.estado === 'pendiente').length}
                </span>
              )}
            </button>
          )}
        </div>

        {error && <p style={{fontSize:'13px', color:'#b91c1c', margin:'0 0 12px'}}>{error}</p>}

        {tab === 'request' && (
          <div>
            {exito && (
              <div className="wo-success">
                <p>✓ Request submitted successfully</p>
              </div>
            )}
            <div className="wo-card">
              <div className="wo-row2">
                <div className="wo-field">
                  <label className="wo-label">Start date</label>
                  <input className="wo-input" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div className="wo-field">
                  <label className="wo-label">End date</label>
                  <input className="wo-input" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </div>
              </div>
              <div className="wo-field">
                <label className="wo-label">Reason (optional)</label>
                <input className="wo-input" type="text" placeholder="e.g. Family trip, exams..." value={razon} onChange={(e) => setRazon(e.target.value)} />
              </div>
              <button className="wo-submit" onClick={enviarRequest} disabled={enviando || !fechaInicio || !fechaFin}>
                {enviando ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </div>
        )}

        {tab === 'mine' && (
          <div className="wo-card">
            {misRequests.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', padding:'1rem 0'}}>No requests yet.</p>
            )}
            {misRequests.map(r => (
              <div key={r.id} className="wo-my-row">
                <div>
                  <p className="wo-my-dates">{formatFecha(r.fecha_inicio)} – {formatFecha(r.fecha_fin)}</p>
                  {r.razon && <p className="wo-my-reason">{r.razon}</p>}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <Badge estado={r.estado} />
                  {r.estado === 'pendiente' && (
                    <button style={estiloBasura} onClick={() => eliminarRequest(r)} aria-label="Delete request">
                      <i className="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'all' && esAdmin && (
          <div className="wo-card">
            {todasRequests.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', padding:'1rem 0'}}>No requests yet.</p>
            )}
            {todasRequests.map(r => (
              <div key={r.id} className="wo-req-row">
                <div className="wo-avatar">
                  {r.nombre_solicitante?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="wo-info">
                  <p className="wo-req-name">{r.nombre_solicitante}</p>
                  <p className="wo-req-dates">{formatFecha(r.fecha_inicio)} – {formatFecha(r.fecha_fin)}{r.razon ? ` · ${r.razon}` : ''}</p>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  {r.estado === 'pendiente' ? (
                    <div className="wo-btns">
                      <button className="wo-approve" onClick={() => cambiarEstado(r.id, 'aprobado')}>
                        <i className="ti ti-check" aria-hidden="true"></i> Approve
                      </button>
                      <button className="wo-reject" onClick={() => cambiarEstado(r.id, 'rechazado')}>
                        <i className="ti ti-x" aria-hidden="true"></i> Reject
                      </button>
                    </div>
                  ) : (
                    <Badge estado={r.estado} />
                  )}
                  <button style={estiloBasura} onClick={() => eliminarRequest(r)} aria-label="Delete request">
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default WeekOff