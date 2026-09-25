import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './AdminReports.css'

function formatWeek(dateStr) {
  const start = new Date(dateStr + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 4)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function AdminReports() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [reportes, setReportes] = useState([])
  const [tab, setTab] = useState('pending')
  const [expandido, setExpandido] = useState(null)
  const [aprobando, setAprobando] = useState(null)
  const [horasInput, setHorasInput] = useState('0')

  useEffect(() => {
    cargarReportes()
  }, [])

  async function cargarReportes() {
    const { data } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('created_at', { ascending: false })
    setReportes(data || [])
  }

  function iniciarAprobacion(r) {
    setAprobando(r.id)
    setHorasInput('0')
  }

  async function confirmarAprobacion(r) {
    const horasExtra = Number(horasInput) || 0
    const horasAutomaticas = r.enviado_a_tiempo ? 2 : 1
    const totalAgregar = horasAutomaticas + horasExtra

    await supabase
      .from('weekly_reports')
      .update({ estado: 'aprobado' })
      .eq('id', r.id)

    const { data: horasData } = await supabase
      .from('horas')
      .select('*')
      .eq('user_id', r.user_id)
      .single()

    if (horasData) {
      await supabase
        .from('horas')
        .update({ content_hrs: horasData.content_hrs + totalAgregar })
        .eq('user_id', r.user_id)
    }

    setAprobando(null)
    setHorasInput('0')
    await cargarReportes()
  }

  async function eliminarReporte(id) {
    await supabase.from('weekly_reports').delete().eq('id', id)
    await cargarReportes()
  }

  const filtrados = reportes.filter(r =>
    tab === 'pending' ? r.estado === 'pendiente' : r.estado === 'aprobado'
  )

  const pendingCount = reportes.filter(r => r.estado === 'pendiente').length

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="ar-content">
        <button className="ar-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="ar-title">Weekly reports</h1>

        <div className="ar-stats">
          <div className="ar-stat">
            <div className="ar-stat-n pending">{pendingCount}</div>
            <div className="ar-stat-l">Pending</div>
          </div>
          <div className="ar-stat">
            <div className="ar-stat-n approved">{reportes.filter(r => r.estado === 'aprobado').length}</div>
            <div className="ar-stat-l">Approved</div>
          </div>
        </div>

        <div className="ar-tabs">
          <button className={`ar-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending {pendingCount > 0 && <span className="ar-badge">{pendingCount}</span>}
          </button>
          <button className={`ar-tab ${tab === 'approved' ? 'active' : ''}`} onClick={() => setTab('approved')}>
            Approved
          </button>
        </div>

        {filtrados.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>
            No {tab === 'pending' ? 'pending' : 'approved'} reports.
          </p>
        )}

        {filtrados.map(r => (
          <div key={r.id} className="ar-card">
            <div className="ar-card-header" onClick={() => setExpandido(expandido === r.id ? null : r.id)}>
              <div className="ar-avatar">
                {r.nombre_voluntario?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="ar-info">
                <p className="ar-name">{r.nombre_voluntario}</p>
                <p className="ar-week">
                  {formatWeek(r.semana_inicio)} · {r.enviado_a_tiempo ? '2 hrs auto' : '1 hr auto'}
                </p>
              </div>
              <div className="ar-actions">
                {r.estado === 'pendiente' && (
                  aprobando === r.id ? (
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}} onClick={e => e.stopPropagation()}>
                      <span style={{fontSize:'11px', color:'#aaa', whiteSpace:'nowrap'}}>
                        +{r.enviado_a_tiempo ? '2' : '1'} auto
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={horasInput}
                        onChange={(e) => setHorasInput(e.target.value)}
                        style={{width:'48px', padding:'4px 8px', border:'0.5px solid #bbf7d0', borderRadius:'6px', fontSize:'13px', textAlign:'center', fontFamily:'Poppins,sans-serif', color:'#1a1a1a', background:'white'}}
                      />
                      <span style={{fontSize:'11px', color:'#aaa'}}>extra</span>
                      <button className="ar-approve" onClick={(e) => { e.stopPropagation(); confirmarAprobacion(r) }}>
                        <i className="ti ti-check" aria-hidden="true"></i> Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAprobando(null) }}
                        style={{background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:'13px', padding:'0'}}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button className="ar-approve" onClick={(e) => { e.stopPropagation(); iniciarAprobacion(r) }}>
                      <i className="ti ti-check" aria-hidden="true"></i> Approve
                    </button>
                  )
                )}
                <button className="ar-delete" onClick={(e) => { e.stopPropagation(); eliminarReporte(r.id) }}>
                  <i className="ti ti-trash" aria-hidden="true"></i>
                </button>
                <i className={`ti ${expandido === r.id ? 'ti-chevron-up' : 'ti-chevron-down'} ar-chevron`} aria-hidden="true"></i>
              </div>
            </div>

            {expandido === r.id && (
              <div className="ar-card-body">
                <div className="ar-field">
                  <p className="ar-field-label">What they worked on</p>
                  <p className="ar-field-value">{r.que_hice || '—'}</p>
                </div>
                <div className="ar-field">
                  <p className="ar-field-label">Checklist completed</p>
                  <p className="ar-field-value">{r.checklist_completado || '—'}</p>
                </div>
                {r.desafios && (
                  <div className="ar-field">
                    <p className="ar-field-label">Challenges</p>
                    <p className="ar-field-value">{r.desafios}</p>
                  </div>
                )}
                <div className="ar-field">
                  <p className="ar-field-label">Focus for next week</p>
                  <p className="ar-field-value">{r.proxima_semana || '—'}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminReports