import './components/Cards.css'

function Voluntario(props) {
  return (
    <div className="persona-card">
      <div>
        <p className="persona-nombre">{props.nombre}</p>
        <p className="persona-detalle">{props.horas} horas — {props.rol}</p>
      </div>
      {props.rol === "Executive Director" && <span className="badge-admin">★ Admin</span>}
    </div>
  )
}

export default Voluntario