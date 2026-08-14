import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './WeekOff.css'

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

  const [misRequests, setMisRequests] = useState([])
  const [todasRequests, setTodasRequests] = useState([])

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        setUserId(session.session.user.id)

        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single()
        setPerfil(perfilData)

        const { data: mis } = await supabase
          .from('solicitudes_week_off')
          .select('*')
          .eq('user_id', session.session.user.id)
          .order('created_at', { ascending: false })
        setMisRequests(mis || [])

        const { data: todas } = await supabase
          .from('solicitudes_week_off')
          .select('*')
          .order('created_at', { ascending: false })
        setTodasRequests(todas || [])
      }
    }
    cargarDatos()
  }, [])

  async function enviarRequest() {
    if (!fechaInicio || !fechaFin) return
    setEnviando(true)
    const { error } = await supabase.from('solicitudes_week_off').insert({
      user_id: userId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      razon,
      nombre_solicitante: perfil?.nombre,
      estado: 'pendiente'
    })
    if (!error) {
      setExito(true)
      setFechaInicio('')
      setFechaFin('')
      setRazon('')
      const { data: mis } = await supabase
        .from('solicitudes_week_off')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setMisRequests(mis || [])
    }
    setEnviando(false)
  }

  async function eliminarRequest(id) {
    const { error } = await supabase.from('solicitudes_week_off').delete().eq('id', id)
    console.log('delete error:', error)
    const { data: mis } = await supabase
      .from('solicitudes_week_off')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setMisRequests(mis || [])
  }

  async function cambiarEstado(id, estado) {
    await supabase.from('solicitudes_week_off').update({ estado }).eq('id', id)
    const { data } = await supabase
      .from('solicitudes_week_off')
      .select('*')
      .order('created_at', { ascending: false })
    setTodasRequests(data || [])
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const esAdmin = perfil?.roles.includes('staff_admin')

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
            <button className={`wo-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All requests</button>
          )}
        </div>

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
              <button className="wo-submit" onClick={enviarRequest} disabled={enviando}>
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
            {misRequests.map(r => {
              console.log('request estado:', r.estado)
              return (
                <div key={r.id} className="wo-my-row">
                  <div>
                    <p className="wo-my-dates">{formatFecha(r.fecha_inicio)} – {formatFecha(r.fecha_fin)}</p>
                    {r.razon && <p className="wo-my-reason">{r.razon}</p>}
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <Badge estado={r.estado} />
                    {r.estado === 'pendiente' && (
                      <button
                        onClick={() => eliminarRequest(r.id)}
                        style={{background:'none', border:'none', cursor:'pointer', color:'#E24B4A', fontSize:'14px', padding:0}}
                      >
                        <i className="ti ti-trash" aria-hidden="true"></i>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
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
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default WeekOff