function Voluntario(props) {
  console.log(props.rol)
  return (
    <p>{props.nombre} - {props.horas} horas {props.rol === "Executive Director" ? ":) Admin" : ""}</p>
  )
}
export default Voluntario