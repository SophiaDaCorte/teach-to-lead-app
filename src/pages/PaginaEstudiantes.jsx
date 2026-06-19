import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Estudiante from '../Estudiante.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './PaginaEstudiantes.css'

function PaginaEstudiantes() {
  const navigate = useNavigate()
  const doodles = useDoodles()

  const [estudiantes, setEstudiantes] = useState([
    { nombre: "Carlos", edad: 20, curso: "Matemáticas" },
    { nombre: "María", edad: 22, curso: "Historia" },
    { nombre: "Jorge", edad: 19, curso: "Ciencias" }
  ])

  function agregarEstudiante() {
    setEstudiantes([...estudiantes, { nombre: "Nuevo", edad: 0, curso: "" }])
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