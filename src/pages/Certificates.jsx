import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Certificates.css'

function Certificates() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tab, setTab] = useState('pending')
  const [solicitudes, setSolicitudes] = useState([])
  const [counts, setCounts] = useState({ pending: 0, approved: 0 })

  useEffect(() => {
    cargarSolicitudes()
  }, [])

  async function cargarSolicitudes() {
    const { data } = await supabase
      .from('solicitudes_certificado')
      .select('*')
      .order('created_at', { ascending: false })
    setSolicitudes(data || [])
    setCounts({
      pending: (data || []).filter(s => s.estado === 'pendiente').length,
      approved: (data || []).filter(s => s.estado === 'aprobado').length,
    })
  }

  async function cambiarEstado(id, estado) {
    await supabase.from('solicitudes_certificado').update({ estado }).eq('id', id)
    await cargarSolicitudes()
  }

  async function eliminarCertificado(id) {
    await supabase.from('solicitudes_certificado').delete().eq('id', id)
    await cargarSolicitudes()
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filtradas = solicitudes.filter(s =>
    tab === 'pending' ? s.estado === 'pendiente' : s.estado === 'aprobado'
  )

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="cert-content">
        <button className="cert-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="cert-title">Certificates</h1>

        <div className="cert-stats">
          <div className="cert-stat">
            <div className="cert-stat-n pending">{counts.pending}</div>
            <div className="cert-stat-l">Pending</div>
          </div>
          <div className="cert-stat">
            <div className="cert-stat-n approved">{counts.approved}</div>
            <div className="cert-stat-l">Approved</div>
          </div>
        </div>

        <div className="cert-tabs">
          <button className={`cert-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending</button>
          <button className={`cert-tab ${tab === 'approved' ? 'active' : ''}`} onClick={() => setTab('approved')}>Approved</button>
        </div>

        <div className="cert-card">
          {filtradas.length === 0 && (
            <p className="cert-empty">No {tab === 'pending' ? 'pending' : 'approved'} requests.</p>
          )}
          {filtradas.map(s => (
            <div key={s.id} className="cert-row">
              <div className="cert-avatar">
                {s.nombre_solicitante?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="cert-info">
                <p className="cert-name">{s.nombre_solicitante}</p>
                <p className="cert-detail">{s.total_hrs} total hours · {formatFecha(s.created_at)}</p>
              </div>
              <div className="cert-btns">
                {tab === 'pending' && (
                  <button className="cert-approve" onClick={() => cambiarEstado(s.id, 'aprobado')}>
                    <i className="ti ti-check" aria-hidden="true"></i> Approve
                  </button>
                )}
                {tab === 'approved' && (
                  <button className="cert-upload">
                    <i className="ti ti-upload" aria-hidden="true"></i> Upload cert
                  </button>
                )}
                <button className="cert-delete" onClick={() => eliminarCertificado(s.id)}>
                  <i className="ti ti-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Certificates