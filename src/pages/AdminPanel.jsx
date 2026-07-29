import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './AdminPanel.css'

const ROLES_DISPONIBLES = [
  { value: 'staff_regular', label: 'Staff' },
  { value: 'tutors', label: 'Tutor' },
  { value: 'marketing_interns', label: 'Marketing Intern' },
  { value: 'creation', label: 'Creation' },
  { value: 'volunteer_coordinator', label: 'Volunteer Coordinator' },
  { value: 'director_of_programs', label: 'Director of Programs' },
  { value: 'staff_marketing', label: 'Marketing Director' },
  { value: 'staff_admin', label: 'Staff Admin' },
]

const GRUPO_EMOJIS = {
  Leadership: '👑', Staff: '👥', Marketing: '📣', Tutors: '🎓', Creation: '🎨'
}

function generarPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  let pass = 'Ttl@'
  for (let i = 0; i < 6; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

function AdminPanel() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tab, setTab] = useState('add')

  // Add volunteer
  const [nombre, setNombre] = useState('')
  const [titulo, setTitulo] = useState('')
  const [email, setEmail] = useState('')
  const [rolesSeleccionados, setRolesSeleccionados] = useState([])
  const [password, setPassword] = useState(generarPassword())
  const [cargando, setCargando] = useState(false)
  const [exito, setExito] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copiado, setCopiado] = useState(false)

  // Manage volunteers
  const [voluntarios, setVoluntarios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [grupoAbierto, setGrupoAbierto] = useState(null)
  const [editando, setEditando] = useState(null)
  const [rolesEditando, setRolesEditando] = useState([])
  const [tituloEditando, setTituloEditando] = useState('')
  const [resetUser, setResetUser] = useState(null)
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [copiadoReset, setCopiadoReset] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (tab === 'manage' || tab === 'inactive') {
      cargarVoluntarios()
    }
  }, [tab])

  async function cargarVoluntarios() {
    const { data } = await supabase.from('perfiles').select('*')
    setVoluntarios(data || [])
  }

  function toggleRol(value) {
    if (rolesSeleccionados.includes(value)) {
      setRolesSeleccionados(rolesSeleccionados.filter(r => r !== value))
    } else {
      setRolesSeleccionados([...rolesSeleccionados, value])
    }
  }

  function toggleRolEditando(value) {
    if (rolesEditando.includes(value)) {
      setRolesEditando(rolesEditando.filter(r => r !== value))
    } else {
      setRolesEditando([...rolesEditando, value])
    }
  }

  function copiarPassword() {
    navigator.clipboard.writeText(password)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function copiarReset() {
    navigator.clipboard.writeText(nuevoPassword)
    setCopiadoReset(true)
    setTimeout(() => setCopiadoReset(false), 2000)
  }

  async function agregarVoluntario() {
    if (!nombre.trim() || !email.trim() || !titulo.trim() || rolesSeleccionados.length === 0) {
      setErrorMsg('Please fill in all fields and select at least one role.')
      return
    }
    setCargando(true)
    setErrorMsg('')

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { nombre, titulo, roles: rolesSeleccionados, email, password }
    })

    setCargando(false)

    if (error || data?.error) {
      setErrorMsg(error?.message || data?.error || 'Something went wrong.')
    } else {
      setExito(nombre)
      setNombre('')
      setTitulo('')
      setEmail('')
      setRolesSeleccionados([])
      setPassword(generarPassword())
    }
  }

  async function guardarEdicion() {
    if (!editando) return
    setGuardando(true)
    await supabase
      .from('perfiles')
      .update({ roles: rolesEditando, titulo: tituloEditando })
      .eq('id', editando.id)
    await cargarVoluntarios()
    setEditando(null)
    setGuardando(false)
  }

  async function resetPassword() {
    if (!resetUser || !nuevoPassword.trim()) return
    setGuardando(true)
    await supabase.functions.invoke('reset-password', {
      body: { userId: resetUser.id, password: nuevoPassword }
    })
    setResetUser(null)
    setNuevoPassword('')
    setGuardando(false)
  }

  async function marcarInactivo(id, rolesActuales) {
    await supabase.from('perfiles').update({ roles: ['inactivo'], roles_anteriores: rolesActuales }).eq('id', id)
    await cargarVoluntarios()
  }

  async function reactivar(id) {
    const voluntario = voluntarios.find(v => v.id === id)
    const rolesOriginales = voluntario?.roles_anteriores || ['staff_regular']
    await supabase.from('perfiles').update({ roles: rolesOriginales, roles_anteriores: null }).eq('id', id)
    await cargarVoluntarios()
  }

  async function eliminarPermanente(id) {
    await supabase.from('horas').delete().eq('user_id', id)
    await supabase.from('checklists').delete().eq('asignado_a', id)
    await supabase.from('perfiles').delete().eq('id', id)
    await supabase.functions.invoke('reset-password', { body: { userId: id, delete: true } })
    await cargarVoluntarios()
  }

  function agrupar(lista) {
    return {
      Leadership: lista.filter(u => u.roles.includes('staff_admin')),
      Staff: lista.filter(u =>
        u.roles.includes('staff_regular') ||
        u.roles.includes('volunteer_coordinator') ||
        u.roles.includes('director_of_programs')
      ),
      Marketing: lista.filter(u =>
        u.roles.includes('staff_marketing') ||
        u.roles.includes('marketing_interns')
      ),
      Tutors: lista.filter(u => u.roles.includes('tutors')),
      Creation: lista.filter(u => u.roles.includes('creation')),
    }
  }

  const activos = voluntarios.filter(v =>
    !v.roles.includes('inactivo') &&
    !v.roles.includes('estudiante') &&
    v.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const inactivos = voluntarios.filter(v => v.roles.includes('inactivo'))
  const grupos = agrupar(activos)

  function renderVoluntario(u) {
    return (
      <div key={u.id}>
        {editando?.id === u.id && (
          <div className="ap-edit-panel">
            <p className="ap-edit-title">Editing — {u.nombre}</p>
            <div className="ap-field">
              <label className="ap-label">Title / position</label>
              <input className="ap-input" type="text" value={tituloEditando} onChange={(e) => setTituloEditando(e.target.value)} />
            </div>
            <div className="ap-field" style={{marginTop: '10px'}}>
              <label className="ap-label">Roles</label>
              <div className="ap-roles">
                {ROLES_DISPONIBLES.map(r => (
                  <button
                    key={r.value}
                    className={`ap-role-btn ${rolesEditando.includes(r.value) ? 'selected' : ''}`}
                    onClick={() => toggleRolEditando(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ap-edit-btns">
              <button className="ap-save" onClick={guardarEdicion} disabled={guardando}>
                {guardando ? 'Saving...' : 'Save changes'}
              </button>
              <button className="ap-cancel" onClick={() => setEditando(null)}>Cancel</button>
            </div>
          </div>
        )}

        {resetUser?.id === u.id && (
          <div className="ap-edit-panel">
            <p className="ap-edit-title">Reset password — {u.nombre}</p>
            <div className="ap-pw-box" style={{marginBottom: '10px'}}>
              <span className="ap-pw-val">{nuevoPassword || '—'}</span>
              <button className="ap-pw-copy" onClick={copiarReset}>
                {copiadoReset ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className="ap-field">
              <label className="ap-label">New password</label>
              <input className="ap-input" type="text" placeholder="Enter new password..." value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} />
            </div>
            <div className="ap-edit-btns">
              <button className="ap-save" onClick={resetPassword} disabled={guardando}>
                {guardando ? 'Resetting...' : 'Reset password'}
              </button>
              <button className="ap-cancel" onClick={() => { setResetUser(null); setNuevoPassword('') }}>Cancel</button>
            </div>
          </div>
        )}

        <div className={`ap-vol-row ${editando?.id === u.id ? 'editing' : ''}`}>
          <div className="ap-avatar">
            {u.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="ap-vol-info">
            <p className="ap-vol-name">{u.nombre}</p>
            <p className="ap-vol-role">{u.titulo}</p>
            <div className="ap-vol-tags">
              {u.roles.map(r => <span key={r} className="ap-tag">{r}</span>)}
            </div>
          </div>
          <div className="ap-vol-btns">
            <button className="ap-btn-edit" onClick={() => { setEditando(u); setRolesEditando(u.roles); setTituloEditando(u.titulo); setResetUser(null) }}>
              ✏️ Edit
            </button>
            <button className="ap-btn-reset" onClick={() => { setResetUser(u); setNuevoPassword(generarPassword()); setEditando(null) }}>
              🔑 Reset
            </button>
            <button className="ap-btn-deact" onClick={() => marcarInactivo(u.id, u.roles)}>
              Mark inactive
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="ap-content">
        <button className="ap-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="ap-title">Admin panel</h1>

        <div className="ap-tabs">
          {['add', 'manage', 'inactive'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`ap-tab ${tab === t ? 'active' : ''}`}>
              {t === 'add' ? 'Add volunteer' : t === 'manage' ? 'Manage volunteers' : 'Inactive'}
            </button>
          ))}
        </div>

        {tab === 'add' && (
          <div>
            {exito && (
              <div className="ap-success">
                <p className="ap-success-title">✓ {exito} added successfully</p>
                <p className="ap-success-sub">Share their login details so they can access the platform.</p>
              </div>
            )}
            <p className="ap-section">Personal info</p>
            <div className="ap-card">
              <div className="ap-row2">
                <div className="ap-field">
                  <label className="ap-label">Full name</label>
                  <input className="ap-input" type="text" placeholder="Anjola T." value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Title / position</label>
                  <input className="ap-input" type="text" placeholder="e.g. Tutor..." value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                </div>
              </div>
            </div>
            <p className="ap-section">Role & access</p>
            <div className="ap-card">
              <div className="ap-field">
                <label className="ap-label">Role (can select multiple)</label>
                <div className="ap-roles">
                  {ROLES_DISPONIBLES.map(r => (
                    <button key={r.value} className={`ap-role-btn ${rolesSeleccionados.includes(r.value) ? 'selected' : ''}`} onClick={() => toggleRol(r.value)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ap-field" style={{marginTop: '14px'}}>
                <label className="ap-label">Email</label>
                <input className="ap-input" type="email" placeholder="anjola@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <p className="ap-section">Login credentials</p>
            <div className="ap-card">
              <label className="ap-label">Password (auto-generated)</label>
              <div className="ap-pw-box">
                <span className="ap-pw-val">{password}</span>
                <button className="ap-pw-copy" onClick={copiarPassword}>{copiado ? '✓ Copied!' : '📋 Copy'}</button>
              </div>
              <p className="ap-info">Share this password with the volunteer so they can log in.</p>
            </div>
            {errorMsg && <p className="ap-error">{errorMsg}</p>}
            <button className="ap-submit" onClick={agregarVoluntario} disabled={cargando}>
              {cargando ? 'Adding...' : 'Add volunteer'}
            </button>
          </div>
        )}

        {tab === 'manage' && (
          <div>
            <input
              className="ap-search"
              type="text"
              placeholder="Search by name..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {Object.entries(grupos).map(([nombre, personas]) => {
              if (personas.length === 0) return null
              const abierto = grupoAbierto === nombre
              return (
                <div key={nombre} className="ap-group">
                  <div className="ap-group-header" onClick={() => setGrupoAbierto(abierto ? null : nombre)}>
                    <div className="ap-group-left">
                      <span>{GRUPO_EMOJIS[nombre]}</span>
                      <span className="ap-group-name">{nombre}</span>
                      <span className="ap-group-count">{personas.length}</span>
                    </div>
                    <i className={`ti ti-chevron-down ap-chevron ${abierto ? 'open' : ''}`} aria-hidden="true"></i>
                  </div>
                  {abierto && (
                    <div className="ap-group-body">
                      {personas.map(u => renderVoluntario(u))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'inactive' && (
          <div>
            {inactivos.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No inactive volunteers.</p>
            )}
            {inactivos.map(u => (
              <div key={u.id} className="ap-vol-row" style={{opacity: 0.6}}>
                <div className="ap-avatar" style={{background:'#f0f0f0', color:'#aaa'}}>
                  {u.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="ap-vol-info">
                  <p className="ap-vol-name">{u.nombre}</p>
                  <p className="ap-vol-role">{u.titulo}</p>
                </div>
                <div className="ap-vol-btns">
                  <button className="ap-btn-react" onClick={() => reactivar(u.id)}>Reactivate</button>
                  <button className="ap-btn-delete" onClick={() => eliminarPermanente(u.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminPanel
