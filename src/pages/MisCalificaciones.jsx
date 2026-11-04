import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './StudentPages.css'

function MisCalificaciones() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [notas, setNotas] = useState([])
  const [columnas, setColumnas] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const { data: notasData } = await supabase
        .from('gradebook_notas')
        .select('*')
        .eq('estudiante_id', session.session.user.id)
      setNotas(notasData || [])

      const colIds = [...new Set((notasData || []).map(n => n.columna_id))]
      if (colIds.length > 0) {
        const { data: colsData } = await supabase.from('gradebook_columnas').select('*').in('id', colIds).order('created_at', { ascending: true })
        setColumnas(colsData || [])
      }
    }
    cargar()
  }, [])

  function getNota(columnaId) {
    return notas.find(n => n.columna_id === columnaId)
  }

  function formatFecha(f) {
    if (!f) return '—'
    return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const calificadas = notas.filter(n => n.estado === 'calificado')
  const promedio = calificadas.length > 0
    ? Math.round(calificadas.reduce((sum, n) => {
        const col = columnas.find(c => c.id === n.columna_id)
        return sum + (col ? (n.nota / col.max_score) * 100 : 0)
      }, 0) / calificadas.length)
    : 0

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="sp-content">
        <button className="sp-back" onClick={() => navigate('/estudiantes')}>← Back</button>
        <h1 className="sp-title">My grades</h1>

        <div className="sp-stats" style={{gridTemplateColumns:'1fr 1fr'}}>
          <div className="sp-stat">
            <div className="sp-stat-n" style={{color: promedio >= 70 ? '#15803d' : '#b91c1c'}}>{promedio}%</div>
            <div className="sp-stat-l">Average</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat-n">{calificadas.length}/{columnas.length}</div>
            <div className="sp-stat-l">Graded</div>
          </div>
        </div>

        {columnas.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No grades yet.</p>
        )}

        {columnas.map(col => {
          const nota = getNota(col.id)
          const porcentaje = nota?.estado === 'calificado' ? Math.round((nota.nota / col.max_score) * 100) : null

          return (
            <div key={col.id} className="sp-card" style={{marginBottom:'6px'}}>
              <div style={{padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px'}}>
                <span style={{fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'6px', background: col.tipo === 'tarea' ? '#EEEDFE' : '#f0f7e6', color: col.tipo === 'tarea' ? '#3C3489' : '#3B6D11'}}>
                  {col.tipo === 'tarea' ? 'Tarea' : 'Activity'}
                </span>
                <div style={{flex:1}}>
                  <p style={{fontSize:'13px', fontWeight:500, color:'#1a1a1a', margin:0}}>{col.titulo}</p>
                  <p style={{fontSize:'11px', color:'#aaa', margin:0}}>{formatFecha(col.fecha)} · Max {col.max_score}</p>
                </div>
                {nota?.estado === 'missing' && <span className="sp-badge badge-missing">Missing</span>}
                {nota?.estado === 'entregado' && <span className="sp-badge badge-submitted">Submitted</span>}
                {nota?.estado === 'calificado' && (
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:'14px', fontWeight:700, color: porcentaje >= 70 ? '#15803d' : '#b91c1c', margin:0}}>{porcentaje}%</p>
                    <p style={{fontSize:'11px', color:'#aaa', margin:0}}>{nota.nota}/{col.max_score}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MisCalificaciones