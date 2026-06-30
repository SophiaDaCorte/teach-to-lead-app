import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rol = searchParams.get('rol')
  const doodles = useDoodles()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function iniciarSesion() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Email o contraseña incorrectos")
    } else {
      if (rol === 'voluntario') {
        navigate('/voluntarios')
      } else {
        navigate('/estudiantes')
      }
    }
  }

  return (
    <div className="login-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => (
          <Doodle key={i} {...d} />
        ))}
      </div>
      
      <button className="login-back" onClick={() => navigate('/')}>
        ← Inicio
      </button>

      <div className="login-card">
        <h1 className="login-title">Teach to Lead</h1>
        <p className="login-subtitle">
          {rol === 'voluntario' ? 'Acceso para voluntarios' : 'Acceso para estudiantes'}
        </p>

        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="login-input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-error">{error}</p>}

        <button className="login-btn" onClick={iniciarSesion}>
          Entrar
        </button>
      </div>
    </div>
  )
}

export default Login