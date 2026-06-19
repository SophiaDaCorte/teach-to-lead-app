import './components/Cards.css'

function Estudiante(props) {
  return (
    <div className="persona-card">
      <div>
        <p className="persona-nombre">{props.nombre}</p>
        <p className="persona-detalle">{props.edad} años — {props.curso}</p>
      </div>
    </div>
  )
}

export default Estudiante