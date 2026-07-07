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
  const [perfil, setPerfil] = useState(null)

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

  useEffect(() => {
    async function cargarPerfil() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        const { data }= await supabase
          .from('perfiles')
          .select('*').eq('id', session.session.user.id).single()
        setPerfil(data)
      }
    }
    cargarPerfil()
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

async function cerrarSesion() {
  await supabase.auth.signOut()
  navigate('/')
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
        {perfil && (
          <p>Hola, {perfil?.nombre || 'Usuario'} -{perfil.rol}</p>
        )}
        <h1 className="page-title">Voluntarios</h1>

        <div className="lista">
          {voluntarios.map((p) => (
            <Voluntario key={p.nombre} nombre={p.nombre} horas={p.horas} rol={p.rol} />
          ))}
        </div>

        <button className="add-btn" onClick={agregarVoluntario}>+ Agregar voluntario de prueba</button>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
    </div>
  )
}

export default PaginaVoluntarios