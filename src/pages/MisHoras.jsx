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

  useEffect(() => {
    async function cargarHoras() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        const { data } = await supabase
          .from('horas')
          .select('*')
          .eq('user_id', session.session.user.id)
          .single()
        setHoras(data)
      }
    }
    cargarHoras()
  }, [])

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

            <button className="horas-cert-btn">
              📜 Request certificate
            </button>
          </>
        ) : (
          <p className="horas-empty">No hours recorded yet.</p>
        )}
      </div>
    </div>
  )
}

export default MisHoras