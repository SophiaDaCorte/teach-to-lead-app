import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './StudentPages.css'

function MisFaltas() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [asistencias, setAsistencias] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const { data } = await supabase
        .from('asistencia')
        .select('*')
        .eq('estudiante_id', session.session.user.id)
        .order('clase_fecha', { ascending: false })
      setAsistencias(data || [])
    }
    cargar()
  }, [])

  function formatFecha(f) {
    return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const presentes = asistencias.filter(a => a.presente).length
  const ausentes = asistencias.filter(a => !a.presente && !a.excusada).length
  const excusadas = asistencias.filter(a => a.excusada).length

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="sp-content">
        <button className="sp-back" onClick={() => navigate('/estudiantes')}>← Back</button>
        <h1 className="sp-title">My attendance</h1>

        <div className="sp-stats">
          <div className="sp-stat">
            <div className="sp-stat-n" style={{color:'#15803d'}}>{presentes}</div>
            <div className="sp-stat-l">Present</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat-n" style={{color:'#b91c1c'}}>{ausentes}</div>
            <div className="sp-stat-l">Absent</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat-n" style={{color:'#3C3489'}}>{excusadas}</div>
            <div className="sp-stat-l">Excused</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat-n">
              {asistencias.length > 0 ? Math.round((presentes / asistencias.length) * 100) : 0}%
            </div>
            <div className="sp-stat-l">Attendance</div>
          </div>
        </div>

        {asistencias.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No records yet.</p>
        )}

        {asistencias.map(a => (
          <div key={a.id} className="sp-card" style={{marginBottom:'6px'}}>
            <div className="sp-card-row" style={{padding:'10px 16px', display:'flex', alignItems:'center', gap:'12px'}}>
              <div style={{flex:1}}>
                <p style={{fontSize:'13px', fontWeight:500, color:'#1a1a1a', margin:0}}>{formatFecha(a.clase_fecha)}</p>
                {a.excusada && a.razon_excusa && (
                  <p style={{fontSize:'11px', color:'#3C3489', margin:0}}>Excused: {a.razon_excusa}</p>
                )}
              </div>
              {a.presente && <span className="sp-badge badge-graded">Present</span>}
              {!a.presente && !a.excusada && <span className="sp-badge badge-missing">Absent</span>}
              {a.excusada && <span className="sp-badge" style={{background:'#EEEDFE', color:'#3C3489'}}>Excused</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MisFaltas