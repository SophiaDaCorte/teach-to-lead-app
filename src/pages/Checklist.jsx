import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Checklist.css'

function Checklist() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tareas, setTareas] = useState([])
  const [nuevaTarea, setNuevaTarea] = useState("")
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    async function cargarTareas() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        setUserId(session.session.user.id)
        const { data } = await supabase
          .from('checklists')
          .select('*')
          .eq('asignado_a', session.session.user.id)
          .order('created_at', { ascending: true })
        setTareas(data || [])
      }
    }
    cargarTareas()
  }, [])

  async function agregarTarea() {
    if (!nuevaTarea.trim()) return
    const { data, error } = await supabase
      .from('checklists')
      .insert({ asignado_a: userId, creado_por: userId, tarea: nuevaTarea })
      .select()
    if (!error) {
      setTareas([...tareas, data[0]])
      setNuevaTarea("")
    }
  }

  async function toggleTarea(id, completada) {
    const { data } = await supabase
      .from('checklists')
      .update({ completada: !completada })
      .eq('id', id)
      .select()
    setTareas(tareas.map(t => t.id === id ? data[0] : t))
  }

  async function eliminarTarea(id) {
    await supabase
      .from('checklists')
      .delete()
      .eq('id', id)
    setTareas(tareas.filter(t => t.id !== id))
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="check-content">
        <button className="check-back" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>

        <h1 className="check-title">My checklist</h1>

        <div className="check-add">
          <input
            className="check-input"
            type="text"
            placeholder="Add a new task..."
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregarTarea()}
          />
          <button className="check-add-btn" onClick={agregarTarea}>+</button>
        </div>

        <div className="check-list">
          {tareas.length === 0 && (
            <p className="check-empty">No tasks yet.</p>
          )}
          {tareas.map((t) => (
            <div key={t.id} className={`check-item ${t.completada ? 'completada' : ''}`}>
              <div className="check-box" onClick={() => toggleTarea(t.id, t.completada)}>
                {t.completada && <i className="ti ti-check" aria-hidden="true"></i>}
            </div>
            <span className="check-tarea" onClick={() => toggleTarea(t.id, t.completada)}>{t.tarea}</span>
            <button className="check-delete" onClick={() => eliminarTarea(t.id)}>
              <i className="ti ti-trash" aria-hidden="true"></i>
            </button>
            </div>
          ))}
        </div>

        <p className="check-footer">
          {tareas.filter(t => t.completada).length} of {tareas.length} completed
        </p>
      </div>
    </div>
  )
}

export default Checklist