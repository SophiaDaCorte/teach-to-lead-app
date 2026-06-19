import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

const COLORES = ['#D4537E', '#EF9F27', '#5DCAA5', '#A9CB5A', '#2D2A86', '#D85A30']
const TIPOS = ['heart', 'star', 'dot']

function al(min, max) {
  return min + Math.random() * (max - min)
}

function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)]
}

function Doodle({ type, color, size, top, left, rotate }) {
  const style = {
    position: 'absolute',
    top: `${top}%`,
    left: `${left}%`,
    width: `${size}px`,
    transform: `rotate(${rotate}deg)`,
    color: color,
  }

  if (type === 'heart') {
    return (
      <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 21s-7-4.5-9.5-9C0.5 8 2 4 6 4c2 0 4 1.5 6 4 2-2.5 4-4 6-4 4 0 5.5 4 3.5 8-2.5 4.5-9.5 9-9.5 9z" />
      </svg>
    )
  }
  if (type === 'star') {
    return (
      <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg style={style} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
    </svg>
  )
}

function generarGrupo(cantidad, topRango, sizeRango) {
  const grupo = []
  for (let i = 0; i < cantidad; i++) {
    const ladoIzquierdo = Math.random() < 0.5
    grupo.push({
      type: elegir(TIPOS),
      color: elegir(COLORES),
      size: al(sizeRango[0], sizeRango[1]),
      top: al(topRango[0], topRango[1]),
      left: ladoIzquierdo ? al(1, 26) : al(74, 99),
      rotate: al(0, 360),
    })
  }
  return grupo
}

function generarDoodles() {
  return [
    ...generarGrupo(25, [0, 35], [10, 22]),     // cerca del título, evitando el centro
    ...generarGrupo(25, [55, 85], [10, 22]),    // cerca de "¿Quién eres?", evitando el centro
    ...generarGrupo(20, [0, 100], [30, 60]),    // figuras grandes pegadas a los bordes reales
    ...generarGrupo(12, [0, 30], [16, 30]),     // refuerzo extra arriba a la izquierda
  ]
}

function Home() {
  const navigate = useNavigate()
  const [doodles] = useState(generarDoodles)

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>

      <div className="home">
        <div className="home-content">
          <h1 className="home-logo">Teach to Lead</h1>

          <div className="home-hero">
            <span className="highlight-yellow">la comunidad</span>
            <br />
            liderada por jóvenes
          </div>

          <p className="home-subtitle">
            conectando voluntarios y estudiantes para crear un cambio real a través de la educación
          </p>

          <p className="home-question">¿Quién eres?</p>

          <div className="home-buttons">
            <button className="btn-lime" onClick={() => navigate('/voluntarios')}>
              Soy voluntario
            </button>
            <button className="btn-teal" onClick={() => navigate('/estudiantes')}>
              Soy estudiante
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home