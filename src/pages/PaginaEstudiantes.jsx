import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Estudiante from '../Estudiante.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './PaginaEstudiantes.css'
import { supabase } from '../supabase.js'

function PaginaEstudiantes() {
  const navigate = useNavigate()
  const doodles = useDoodles()

  const [estudiantes, setEstudiantes] = useState([])

  async function agregarEstudiante() {
    const nuevoEstudiante = {
      nombre: 'Nuevo Estudiante',
      edad: 18,
      curso: 'Curso de prueba'
    }

    const { data, error } = await supabase.from('estudiantes').insert([nuevoEstudiante]).select()
    if (error) {
      console.error('Error adding estudiante:', error)
    } else {
      setEstudiantes([...estudiantes, data[0]])
    }
  } 

  useEffect(() => {
    async function cargarEstudiantes() {
      const { data, error } = await supabase.from('estudiantes').select('*')
      if (error) {
        console.error('Error fetching estudiantes:', error)
      } else {
        setEstudiantes(data)
      }
    }

    cargarEstudiantes()
  }, [])

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="page-content">
        <button className="back-btn" onClick={() => navigate('/')}>← Volver al inicio</button>

        <h1 className="page-title">Estudiantes</h1>

        <div className="lista">
          {estudiantes.map((e) => (
            <Estudiante key={e.nombre} nombre={e.nombre} edad={e.edad} curso={e.curso} />
          ))}
        </div>

        <button className="add-btn-teal" onClick={agregarEstudiante}>+ Agregar estudiante de prueba</button>
      </div>
    </div>
  )
}

export default PaginaEstudiantes