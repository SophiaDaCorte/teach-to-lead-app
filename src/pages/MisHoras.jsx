import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './MisHoras.css'

function MisHoras() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [horas, setHoras] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)
  const [solicitado, setSolicitado] = useState(false)

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        setUserId(session.session.user.id)

        const { data: horasData } = await supabase
          .from('horas')
          .select('*')
          .eq('user_id', session.session.user.id)
          .single()
        setHoras(horasData)

        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single()
        setPerfil(perfilData)
      }
    }
    cargarDatos()
  }, [])

  async function solicitarCertificado() {
    const { error } = await supabase.from('solicitudes_certificado').insert({
      user_id: userId,
      nombre_solicitante: perfil?.nombre,
      total_hrs: horas?.total_hrs,
      estado: 'pendiente'
    })
    if (!error) {
      setSolicitado(true)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="horas-content">
        <button className="horas-back" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>

        <h1 className="horas-title">My hours</h1>

        {horas ? (
          <>
            <div className="horas-metrics">
              <div className="horas-metric">
                <div className="horas-n">{horas.content_hrs}</div>
                <div className="horas-l">Content hours</div>
              </div>
              <div className="horas-metric">
                <div className="horas-n">{horas.meeting_hrs}</div>
                <div className="horas-l">Meeting hours</div>
              </div>
              <div className="horas-metric total">
                <div className="horas-n">{horas.total_hrs}</div>
                <div className="horas-l">Total hours</div>
              </div>
            </div>

            <p className="horas-updated">
              Last updated: {new Date(horas.updated_at).toLocaleDateString()}
            </p>

            {solicitado ? (
              <div style={{background:'#f0f7e6', border:'0.5px solid #c0dd97', borderRadius:'12px', padding:'12px 16px', fontSize:'13px', color:'#3B6D11', fontWeight:500, textAlign:'center'}}>
                ✓ Certificate requested — we'll review it soon
              </div>
            ) : (
              <button className="horas-cert-btn" onClick={solicitarCertificado}>
                📜 Request certificate
              </button>
            )}
          </>
        ) : (
          <p className="horas-empty">No hours recorded yet.</p>
        )}
      </div>
    </div>
  )
}

export default MisHoras