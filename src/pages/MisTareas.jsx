import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './StudentPages.css'

function MisTareas() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [tareas, setTareas] = useState([])
  const [columnas, setColumnas] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [subiendo, setSubiendo] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      setUserId(session.session.user.id)

      const { data: notasData } = await supabase
        .from('gradebook_notas')
        .select('*')
        .eq('estudiante_id', session.session.user.id)
      setTareas(notasData || [])

      const colIds = [...new Set((notasData || []).map(n => n.columna_id))]
      if (colIds.length > 0) {
        const { data: colsData } = await supabase.from('gradebook_columnas').select('*').in('id', colIds)
        setColumnas(colsData || [])
      }
    }
    cargar()
  }, [])

  async function subirTarea(notaId) {
    if (!archivo) return
    setCargando(true)
    const ext = archivo.name.split('.').pop()
    const path = `${userId}/${notaId}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('entregas').upload(path, archivo)
    if (!error) {
      const { data: urlData } = supabase.storage.from('entregas').getPublicUrl(path)
      await supabase.from('gradebook_notas').update({
        url_entregado: urlData.publicUrl, estado: 'entregado', updated_at: new Date().toISOString()
      }).eq('id', notaId)
      const { data: updated } = await supabase.from('gradebook_notas').select('*').eq('estudiante_id', userId)
      setTareas(updated || [])
      setSubiendo(null); setArchivo(null)
    }
    setCargando(false)
  }

  function getColumna(columnaId) {
    return columnas.find(c => c.id === columnaId)
  }

  function formatFecha(f) {
    if (!f) return '—'
    return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const misTareas = tareas.filter(t => {
    const col = getColumna(t.columna_id)
    return col?.tipo === 'tarea'
  })

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="sp-content">
        <button className="sp-back" onClick={() => navigate('/estudiantes')}>← Back</button>
        <h1 className="sp-title">My tasks</h1>

        {misTareas.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No tasks yet.</p>
        )}

        {misTareas.map(t => {
          const col = getColumna(t.columna_id)
          if (!col) return null
          return (
            <div key={t.id} className="sp-card">
              <div className="sp-card-header" onClick={() => setExpandido(expandido === t.id ? null : t.id)}>
                <div className="sp-card-info">
                  <p className="sp-card-title">{col.titulo}</p>
                  <p className="sp-card-sub">Due {formatFecha(col.fecha)} · Max {col.max_score} pts</p>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  {t.estado === 'missing' && <span className="sp-badge badge-missing">Missing</span>}
                  {t.estado === 'entregado' && <span className="sp-badge badge-submitted">Submitted</span>}
                  {t.estado === 'calificado' && <span className="sp-badge badge-graded">{Math.round((t.nota/col.max_score)*100)}%</span>}
                  <i className={`ti ${expandido === t.id ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{fontSize:'14px', color:'#aaa'}} aria-hidden="true"></i>
                </div>
              </div>

              {expandido === t.id && (
                <div className="sp-card-body">
                  {t.url_entregado && (
                    <div style={{marginBottom:'10px'}}>
                      <p className="sp-field-label">Your submission</p>
                      <a href={t.url_entregado} target="_blank" rel="noreferrer" style={{fontSize:'13px', color:'#2d2a86', wordBreak:'break-all'}}>
                        View file <i className="ti ti-external-link" style={{fontSize:'11px'}} aria-hidden="true"></i>
                      </a>
                    </div>
                  )}
                  {t.estado === 'calificado' && (
                    <div style={{background:'#f0fdf4', borderRadius:'8px', padding:'10px 12px', marginBottom:'10px'}}>
                      <p className="sp-field-label" style={{color:'#15803d'}}>Grade</p>
                      <p style={{fontSize:'16px', fontWeight:700, color:'#15803d', margin:0}}>
                        {t.nota}/{col.max_score} · {Math.round((t.nota/col.max_score)*100)}%
                      </p>
                    </div>
                  )}
                  {t.estado !== 'calificado' && (
                    subiendo === t.id ? (
                      <div>
                        <p className="sp-field-label">Upload your work (image or PDF)</p>
                        <input
                          type="file" accept="image/*,.pdf"
                          onChange={(e) => setArchivo(e.target.files[0])}
                          style={{fontSize:'13px', marginBottom:'8px', display:'block'}}
                        />
                        <div style={{display:'flex', gap:'8px'}}>
                          <button className="sp-save" onClick={() => subirTarea(t.id)} disabled={!archivo || cargando}>
                            {cargando ? 'Uploading...' : 'Submit'}
                          </button>
                          <button className="sp-cancel" onClick={() => { setSubiendo(null); setArchivo(null) }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="sp-save" onClick={() => setSubiendo(t.id)}>
                        {t.estado === 'entregado' ? 'Resubmit' : 'Submit work'}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MisTareas