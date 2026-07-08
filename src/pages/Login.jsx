import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const doodles = useDoodles()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function iniciarSesion() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Email or password is incorrect")
    } else {
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', data.user.id)

    if (perfilError) {
      setError("Error fetching user profile")
    } else {
      const roles = perfil[0].roles
      console.log('roles recibidos:', roles)
      if (roles.includes('estudiante')) {
        navigate('/estudiantes')
      } else {
        navigate('/dashboard')
      }
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
        ← Home
      </button>

      <div className="login-card">
        <h1 className="login-title">Teach to Lead</h1>
        <p className="login-subtitle">Log in to your account</p>

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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-error">{error}</p>}

        <button className="login-btn" onClick={iniciarSesion}>
          Sign In
        </button>
      </div>
    </div>
  )
}

export default Login