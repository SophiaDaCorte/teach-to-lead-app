import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'

function RutaProtegida({ children }) {
  const navigate = useNavigate()
  const [autenticado, setAutenticado] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function verificarSesion() {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setAutenticado(true)
      } else {
        navigate('/login')
      }

      setCargando(false)
    }

    verificarSesion()
  }, [])

  if (cargando) return <p>Cargando...</p>
  if (!autenticado) return null

  return children
}

export default RutaProtegida