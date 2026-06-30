import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Voluntario from '../Voluntario.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './PaginaVoluntarios.css'
import { supabase } from '../supabase.js'

function PaginaVoluntarios() {
  const navigate = useNavigate()
  const doodles = useDoodles()

  const [voluntarios, setVoluntarios] = useState([])

  useEffect(() => {
    async function cargarVoluntarios() {
      const { data, error } = await supabase.from('voluntarios').select('*')
      if (error) {
        console.error('Error fetching voluntarios:', error)
      } else {
        setVoluntarios(data)
      }
    }

    cargarVoluntarios()
  }, [])  

  async function agregarVoluntario() {
    const nuevoVoluntario = {
      nombre: 'Nuevo Voluntario',
      horas: 0,
      rol: 'Voluntario de prueba'
    }

    const { data, error } = await supabase.from('voluntarios').insert([nuevoVoluntario]).select()
    if (error) {
      console.error('Error adding voluntario:', error)
    } else {
      setVoluntarios([...voluntarios, data[0]])
    }
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="page-content">
        <button className="back-btn" onClick={() => navigate('/')}>← Volver al inicio</button>

        <h1 className="page-title">Voluntarios</h1>

        <div className="lista">
          {voluntarios.map((p) => (
            <Voluntario key={p.nombre} nombre={p.nombre} horas={p.horas} rol={p.rol} />
          ))}
        </div>

        <button className="add-btn" onClick={agregarVoluntario}>+ Agregar voluntario de prueba</button>
      </div>
    </div>
  )
}

export default PaginaVoluntarios