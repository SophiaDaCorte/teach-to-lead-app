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
  const [perfilActual, setPerfilActual] = useState(null)

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

  // Manage students
  const [comunidades, setComunidades] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [tutores, setTutores] = useState([])
  const [comunidadAbierta, setComunidadAbierta] = useState(null)
  const [formulario, setFormulario] = useState(null)
  const [nuevaComunidad, setNuevaComunidad] = useState('')
  const [nuevoNivel, setNuevoNivel] = useState('')
  const [tutorSeleccionado, setTutorSeleccionado] = useState('')
  const [estudianteNombre, setEstudianteNombre] = useState('')
  const [estudianteEmail, setEstudianteEmail] = useState('')
  const [estudianteComunidad, setEstudianteComunidad] = useState('')
  const [estudiantePassword, setEstudiantePassword] = useState(generarPassword())
  const [copiadoEst, setCopiadoEst] = useState(false)
  const [exitoEst, setExitoEst] = useState(null)
  const [errorEst, setErrorEst] = useState('')
  const [moviendo, setMoviendo] = useState(null)
  const [comunidadDestino, setComunidadDestino] = useState('')
  const [estudianteBusqueda, setEstudianteBusqueda] = useState('')
  const [estudianteAsignar, setEstudianteAsignar] = useState(null)
  const [comunidadAsignar, setComunidadAsignar] = useState('')

  useEffect(() => {
    async function cargarPerfil() {
      const { data: session } = await supabase.auth.getSession()
      if (session.session) {
        const { data } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single()
        setPerfilActual(data)
      }
    }
    cargarPerfil()
  }, [])

  useEffect(() => {
    if (tab === 'manage' || tab === 'inactive') cargarVoluntarios()
    if (tab === 'students') cargarDatosEstudiantes()
  }, [tab])

  async function cargarVoluntarios() {
    const { data } = await supabase.from('perfiles').select('*')
    setVoluntarios(data || [])
  }

  async function cargarDatosEstudiantes() {
    const { data: coms } = await supabase
      .from('comunidades')
      .select('*')
      .order('nombre')
    setComunidades(coms || [])

    const { data: ests } = await supabase
      .from('perfiles')
      .select('*')
      .contains('roles', ['estudiante'])
    setEstudiantes(ests || [])

    const { data: tuts } = await supabase
      .from('perfiles')
      .select('*')
      .contains('roles', ['tutors'])
    setTutores(tuts || [])
  }

  async function crearComunidad() {
    if (!nuevaComunidad.trim() || !nuevoNivel.trim()) return
    await supabase.from('comunidades').insert({
      nombre: nuevaComunidad,
      nivel: nuevoNivel,
      tutor_id: tutorSeleccionado || null
    })
    setNuevaComunidad('')
    setNuevoNivel('')
    setTutorSeleccionado('')
    setFormulario(null)
    await cargarDatosEstudiantes()
  }

  async function eliminarComunidad(id) {
    await supabase.from('comunidades').delete().eq('id', id)
    await cargarDatosEstudiantes()
  }

  async function agregarEstudiante() {
    if (!estudianteNombre.trim() || !estudianteEmail.trim() || !estudianteComunidad) {
      setErrorEst('Please fill in all fields.')
      return
    }
    setCargando(true)
    setErrorEst('')

    const comunidadObj = comunidades.find(c => c.id === estudianteComunidad)

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        nombre: estudianteNombre,
        titulo: 'Estudiante',
        roles: ['estudiante'],
        email: estudianteEmail,
        password: estudiantePassword,
        comunidad: comunidadObj?.nombre || null,
        nivel: comunidadObj?.nivel || null
      }
    })

    setCargando(false)

    if (error || data?.error) {
      setErrorEst(error?.message || data?.error || 'Something went wrong.')
    } else {
      setExitoEst(estudianteNombre)
      setTimeout(() => setExitoEst(null), 4000)
      setEstudianteNombre('')
      setEstudianteEmail('')
      setEstudianteComunidad('')
      setEstudiantePassword(generarPassword())
      setFormulario(null)
      await cargarDatosEstudiantes()
    }
  }

  async function asignarEstudianteExistente() {
    if (!estudianteAsignar || !comunidadAsignar) return
    const comunidadObj = comunidades.find(c => c.id === comunidadAsignar)
    await supabase
      .from('perfiles')
      .update({
        comunidad: comunidadObj?.nombre || null,
        nivel: comunidadObj?.nivel || null
      })
      .eq('id', estudianteAsignar.id)
    setEstudianteAsignar(null)
    setEstudianteBusqueda('')
    setComunidadAsignar('')
    setFormulario(null)
    await cargarDatosEstudiantes()
  }

  async function marcarEstudianteInactivo(id) {
    await supabase
      .from('perfiles')
      .update({ roles: ['inactivo'], roles_anteriores: ['estudiante'] })
      .eq('id', id)
    await cargarDatosEstudiantes()
  }

  async function moverEstudiante(estudiante) {
    if (!comunidadDestino) return
    const comunidadObj = comunidades.find(c => c.id === comunidadDestino)
    await supabase
      .from('perfiles')
      .update({
        comunidad: comunidadObj?.nombre || null,
        nivel: comunidadObj?.nivel || null
      })
      .eq('id', estudiante.id)
    setMoviendo(null)
    setComunidadDestino('')
    await cargarDatosEstudiantes()
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

  function copiarEstPassword() {
    navigator.clipboard.writeText(estudiantePassword)
    setCopiadoEst(true)
    setTimeout(() => setCopiadoEst(false), 2000)
  }

  const esAdmin = perfilActual?.roles.includes('staff_admin')
  const esCoordinator = perfilActual?.roles.includes('volunteer_coordinator')

  const rolesParaMostrar = esAdmin
    ? ROLES_DISPONIBLES
    : ROLES_DISPONIBLES.filter(r => r.value === 'tutors' || r.value === 'creation')

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
    await supabase
      .from('perfiles')
      .update({ roles: ['inactivo'], roles_anteriores: rolesActuales })
      .eq('id', id)
    await cargarVoluntarios()
  }

  async function reactivar(id) {
    const voluntario = voluntarios.find(v => v.id === id)
    const rolesOriginales = voluntario?.roles_anteriores || ['staff_regular']
    await supabase
      .from('perfiles')
      .update({ roles: rolesOriginales, roles_anteriores: null })
      .eq('id', id)
    await cargarVoluntarios()
  }

  async function eliminarPermanente(id) {
    await supabase.from('horas').delete().eq('user_id', id)
    await supabase.from('checklists').delete().eq('asignado_a', id)
    await supabase.from('perfiles').delete().eq('id', id)
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
  const todosGrupos = agrupar(activos)

  const gruposVisibles = esAdmin
    ? todosGrupos
    : esCoordinator
      ? { Tutors: todosGrupos.Tutors, Creation: todosGrupos.Creation }
      : {}

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
            {esAdmin && (
              <button className="ap-btn-reset" onClick={() => { setResetUser(u); setNuevoPassword(generarPassword()); setEditando(null) }}>
                🔑 Reset
              </button>
            )}
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
          {['add', 'manage', 'students', 'inactive'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`ap-tab ${tab === t ? 'active' : ''}`}>
              {t === 'add' ? 'Add volunteer' : t === 'manage' ? 'Manage volunteers' : t === 'students' ? 'Manage students' : 'Inactive'}
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
                  {rolesParaMostrar.map(r => (
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
            {esAdmin && (
              <>
                <p className="ap-section">Login credentials</p>
                <div className="ap-card">
                  <label className="ap-label">Password (auto-generated)</label>
                  <div className="ap-pw-box">
                    <span className="ap-pw-val">{password}</span>
                    <button className="ap-pw-copy" onClick={copiarPassword}>{copiado ? '✓ Copied!' : '📋 Copy'}</button>
                  </div>
                  <p className="ap-info">Share this password with the volunteer so they can log in.</p>
                </div>
              </>
            )}
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
            {Object.entries(gruposVisibles).map(([nombre, personas]) => {
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

        {tab === 'students' && (
          <div>
            {exitoEst && (
              <div className="ap-success">
                <p className="ap-success-title">✓ {exitoEst} added successfully</p>
                <p className="ap-success-sub">Share their login details so they can access the platform.</p>
              </div>
            )}

            <div className="ap-student-btns" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <button
                className={`ap-student-btn ${formulario === 'community' ? 'active' : ''}`}
                onClick={() => setFormulario(formulario === 'community' ? null : 'community')}
              >
                ＋ Add community
              </button>
              <button
                className={`ap-student-btn ${formulario === 'student' ? 'active' : ''}`}
                onClick={() => setFormulario(formulario === 'student' ? null : 'student')}
              >
                ＋ Add student
              </button>
              <button
                className={`ap-student-btn ${formulario === 'assign' ? 'active' : ''}`}
                onClick={() => setFormulario(formulario === 'assign' ? null : 'assign')}
              >
                👤 Assign existing
              </button>
            </div>

            {formulario === 'community' && (
              <div className="ap-card" style={{marginBottom: '1rem'}}>
                <p className="ap-edit-title">New community</p>
                <div className="ap-row2">
                  <div className="ap-field">
                    <label className="ap-label">Community name</label>
                    <input className="ap-input" type="text" placeholder="e.g. Mariposas" value={nuevaComunidad} onChange={(e) => setNuevaComunidad(e.target.value)} />
                  </div>
                  <div className="ap-field">
                    <label className="ap-label">Level</label>
                    <input className="ap-input" type="text" placeholder="e.g. A2" value={nuevoNivel} onChange={(e) => setNuevoNivel(e.target.value)} />
                  </div>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Assign tutor</label>
                  <select className="ap-input" value={tutorSeleccionado} onChange={(e) => setTutorSeleccionado(e.target.value)}>
                    <option value="">Select a tutor...</option>
                    {tutores.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="ap-edit-btns">
                  <button className="ap-save" onClick={crearComunidad}>Create community</button>
                  <button className="ap-cancel" onClick={() => setFormulario(null)}>Cancel</button>
                </div>
              </div>
            )}

            {formulario === 'student' && (
              <div className="ap-card" style={{marginBottom: '1rem'}}>
                <p className="ap-edit-title">New student</p>
                <div className="ap-row2">
                  <div className="ap-field">
                    <label className="ap-label">Full name</label>
                    <input className="ap-input" type="text" placeholder="Luisa M." value={estudianteNombre} onChange={(e) => setEstudianteNombre(e.target.value)} />
                  </div>
                  <div className="ap-field">
                    <label className="ap-label">Email</label>
                    <input className="ap-input" type="email" placeholder="luisa@email.com" value={estudianteEmail} onChange={(e) => setEstudianteEmail(e.target.value)} />
                  </div>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Community</label>
                  <select className="ap-input" value={estudianteComunidad} onChange={(e) => setEstudianteComunidad(e.target.value)}>
                    <option value="">Select community...</option>
                    {comunidades.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} {c.nivel}</option>
                    ))}
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Password (auto-generated)</label>
                  <div className="ap-pw-box">
                    <span className="ap-pw-val">{estudiantePassword}</span>
                    <button className="ap-pw-copy" onClick={copiarEstPassword}>{copiadoEst ? '✓ Copied!' : '📋 Copy'}</button>
                  </div>
                </div>
                {errorEst && <p className="ap-error">{errorEst}</p>}
                <div className="ap-edit-btns">
                  <button className="ap-save" onClick={agregarEstudiante} disabled={cargando}>
                    {cargando ? 'Adding...' : 'Add student'}
                  </button>
                  <button className="ap-cancel" onClick={() => setFormulario(null)}>Cancel</button>
                </div>
              </div>
            )}

            {formulario === 'assign' && (
              <div className="ap-card" style={{marginBottom: '1rem'}}>
                <p className="ap-edit-title">Assign existing student</p>
                <div className="ap-field">
                  <label className="ap-label">Search student</label>
                  <input
                    className="ap-input"
                    type="text"
                    placeholder="Type a name..."
                    value={estudianteBusqueda}
                    onChange={(e) => setEstudianteBusqueda(e.target.value)}
                  />
                  {estudianteBusqueda.length > 1 && (
                    <div style={{border:'0.5px solid #eee', borderRadius:'8px', marginTop:'4px', overflow:'hidden'}}>
                      {estudiantes
                        .filter(e => e.nombre.toLowerCase().includes(estudianteBusqueda.toLowerCase()))
                        .slice(0, 5)
                        .map(e => (
                          <div
                            key={e.id}
                            onClick={() => { setEstudianteAsignar(e); setEstudianteBusqueda(e.nombre) }}
                            style={{padding:'8px 12px', cursor:'pointer', fontSize:'13px', color:'#1a1a1a', background: estudianteAsignar?.id === e.id ? '#f0f7e6' : 'white', borderBottom:'0.5px solid #f5f5f5'}}
                          >
                            {e.nombre} {e.comunidad ? `· ${e.comunidad} ${e.nivel}` : '· Sin comunidad'}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
                <div className="ap-field">
                  <label className="ap-label">Assign to community</label>
                  <select className="ap-input" value={comunidadAsignar} onChange={(e) => setComunidadAsignar(e.target.value)}>
                    <option value="">Select community...</option>
                    {comunidades.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} {c.nivel}</option>
                    ))}
                  </select>
                </div>
                <div className="ap-edit-btns">
                  <button className="ap-save" onClick={asignarEstudianteExistente} disabled={!estudianteAsignar || !comunidadAsignar}>
                    Assign
                  </button>
                  <button className="ap-cancel" onClick={() => { setFormulario(null); setEstudianteBusqueda(''); setEstudianteAsignar(null) }}>Cancel</button>
                </div>
              </div>
            )}

            {comunidades.map(c => {
              const ests = estudiantes.filter(e => e.comunidad === c.nombre && e.nivel === c.nivel)
              const abierta = comunidadAbierta === c.id
              return (
                <div key={c.id} className="ap-group">
                  <div className="ap-group-header" onClick={() => setComunidadAbierta(abierta ? null : c.id)}>
                    <div className="ap-group-left">
                      <span>🎒</span>
                      <span className="ap-group-name">{c.nombre} {c.nivel}</span>
                      <span className="ap-group-count">{ests.length}</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <span style={{fontSize:'11px', color:'#aaa'}}>
                        {tutores.find(t => t.id === c.tutor_id)?.nombre || 'Sin tutor'}
                      </span>
                      <button
                        className="ap-btn-delete"
                        style={{fontSize:'12px', padding:'4px 8px'}}
                        onClick={(e) => { e.stopPropagation(); eliminarComunidad(c.id) }}
                      >
                        <i className="ti ti-trash" aria-hidden="true"></i>
                      </button>
                      <i className={`ti ti-chevron-down ap-chevron ${abierta ? 'open' : ''}`} aria-hidden="true"></i>
                    </div>
                  </div>
                  {abierta && (
                    <div className="ap-group-body">
                      {ests.length === 0 && (
                        <p style={{fontSize:'12px', color:'#aaa', textAlign:'center', padding:'1rem'}}>No students yet.</p>
                      )}
                      {ests.map(e => (
                        <div key={e.id}>
                          {moviendo === e.id && (
                            <div style={{padding:'10px 16px', background:'#f9f9ff', borderBottom:'0.5px solid #eee', display:'flex', gap:'8px', alignItems:'center'}}>
                              <select
                                className="ap-input"
                                style={{flex:1}}
                                value={comunidadDestino}
                                onChange={(ev) => setComunidadDestino(ev.target.value)}
                              >
                                <option value="">Move to...</option>
                                {comunidades.filter(x => x.id !== c.id).map(x => (
                                  <option key={x.id} value={x.id}>{x.nombre} {x.nivel}</option>
                                ))}
                              </select>
                              <button className="ap-save" style={{padding:'6px 12px'}} onClick={() => moverEstudiante(e)}>Move</button>
                              <button className="ap-cancel" style={{padding:'6px 12px'}} onClick={() => setMoviendo(null)}>Cancel</button>
                            </div>
                          )}
                          {resetUser?.id === e.id && (
                            <div className="ap-edit-panel">
                              <p className="ap-edit-title">Reset password — {e.nombre}</p>
                              <div className="ap-pw-box" style={{marginBottom: '10px'}}>
                                <span className="ap-pw-val">{nuevoPassword || '—'}</span>
                                <button className="ap-pw-copy" onClick={copiarReset}>
                                  {copiadoReset ? '✓ Copied!' : '📋 Copy'}
                                </button>
                              </div>
                              <div className="ap-field">
                                <label className="ap-label">New password</label>
                                <input className="ap-input" type="text" placeholder="Enter new password..." value={nuevoPassword} onChange={(ev) => setNuevoPassword(ev.target.value)} />
                              </div>
                              <div className="ap-edit-btns">
                                <button className="ap-save" onClick={resetPassword} disabled={guardando}>
                                  {guardando ? 'Resetting...' : 'Reset password'}
                                </button>
                                <button className="ap-cancel" onClick={() => { setResetUser(null); setNuevoPassword('') }}>Cancel</button>
                              </div>
                            </div>
                          )}
                          <div className="ap-vol-row">
                            <div className="ap-avatar">
                              {e.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                            <div className="ap-vol-info">
                              <p className="ap-vol-name">{e.nombre}</p>
                              <p className="ap-vol-role">Estudiante</p>
                            </div>
                            <div className="ap-vol-btns">
                              <button className="ap-btn-edit" onClick={() => { setMoviendo(e.id); setComunidadDestino(''); setResetUser(null) }}>
                                Move
                              </button>
                              <button className="ap-btn-reset" onClick={() => { setResetUser(e); setNuevoPassword(generarPassword()); setMoviendo(null) }}>
                                🔑 Reset
                              </button>
                              <button className="ap-btn-deact" onClick={() => marcarEstudianteInactivo(e.id)}>
                                Inactive
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {comunidades.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No communities yet. Add one above.</p>
            )}
          </div>
        )}

        {tab === 'inactive' && (
          <div>
            <p className="ap-section">Volunteers</p>
            {inactivos.filter(u => !u.roles_anteriores?.includes('estudiante')).length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'1rem'}}>No inactive volunteers.</p>
            )}
            {inactivos.filter(u => !u.roles_anteriores?.includes('estudiante')).map(u => (
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
                  {esAdmin && (
                    <button className="ap-btn-delete" onClick={() => eliminarPermanente(u.id)}>Delete</button>
                  )}
                </div>
              </div>
            ))}

            <p className="ap-section" style={{marginTop:'1.5rem'}}>Students</p>
            {inactivos.filter(u => u.roles_anteriores?.includes('estudiante')).length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'1rem'}}>No inactive students.</p>
            )}
            {inactivos.filter(u => u.roles_anteriores?.includes('estudiante')).map(u => (
              <div key={u.id} className="ap-vol-row" style={{opacity: 0.6}}>
                <div className="ap-avatar" style={{background:'#f0f0f0', color:'#aaa'}}>
                  {u.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="ap-vol-info">
                  <p className="ap-vol-name">{u.nombre}</p>
                  <p className="ap-vol-role">Estudiante</p>
                </div>
                <div className="ap-vol-btns">
                  <button className="ap-btn-react" onClick={() => reactivar(u.id)}>Reactivate</button>
                  {esAdmin && (
                    <button className="ap-btn-delete" onClick={() => eliminarPermanente(u.id)}>Delete</button>
                  )}
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