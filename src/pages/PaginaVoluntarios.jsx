import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Voluntario from '../Voluntario.jsx'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './PaginaVoluntarios.css'

function PaginaVoluntarios() {
  const navigate = useNavigate()
  const doodles = useDoodles()

  const [voluntarios, setVoluntarios] = useState([
    { nombre: "Sophi", horas: 12, rol: "Executive Director" },
    { nombre: "Ana", horas: 8, rol: "Program Manager" },
    { nombre: "Luis", horas: 15, rol: "Volunteer" }
  ])

  function agregarVoluntario() {
    setVoluntarios([...voluntarios, { nombre: "Nuevo", horas: 0, rol: "Volunteer" }])
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