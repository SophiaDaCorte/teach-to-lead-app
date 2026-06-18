function Estudiante(props) {
  return (
    <p>{props.nombre} - {props.edad} años - {props.curso == "Matemáticas" ? "Matemáticas" : props.curso == "Historia" ? "Historia" : "Ciencias"}</p>
  )
}
export default Estudiante