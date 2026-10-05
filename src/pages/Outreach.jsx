import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './Outreach.css'

const PLATAFORMAS = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X', 'LinkedIn', 'Other']
const ESTADOS_CREATOR = ['contacted', 'collaborating', 'done']
const ESTADOS_EVENT = ['pending', 'in progress', 'done']

function Outreach() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [userId, setUserId] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [esIntern, setEsIntern] = useState(false)
  const [marketing, setMarketing] = useState([])
  const [tab, setTab] = useState('events')

  const [creators, setCreators] = useState([])
  const [events, setEvents] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [mostrarFormCreator, setMostrarFormCreator] = useState(false)
  const [mostrarFormEvent, setMostrarFormEvent] = useState(false)
  const [editandoCreator, setEditandoCreator] = useState(null)
  const [editandoEvent, setEditandoEvent] = useState(null)
  const [linkInput, setLinkInput] = useState({})

  const [cNombre, setCNombre] = useState('')
  const [cPlataforma, setCPlataforma] = useState('Instagram')
  const [cUsername, setCUsername] = useState('')
  const [cEstado, setCEstado] = useState('contacted')
  const [cNotas, setCNotas] = useState('')

  const [eNombre, setENombre] = useState('')
  const [eRequirements, setERequirements] = useState('')
  const [eAsignado, setEAsignado] = useState('')
  const [eDueDate, setEDueDate] = useState('')
  const [eEstado, setEEstado] = useState('pending')

  useEffect(() => {
    async function cargarDatos() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      setUserId(session.session.user.id)

      const { data: perfilData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.session.user.id)
        .single()
      setPerfil(perfilData)

      const intern = perfilData?.roles?.includes('marketing_interns') && !perfilData?.roles?.includes('staff_marketing')
      setEsIntern(intern)

      const { data: mkt } = await supabase
        .from('perfiles')
        .select('*')
        .or('roles.cs.{"staff_marketing"},roles.cs.{"marketing_interns"}')
      setMarketing(mkt || [])

      await cargarCreators()
      await cargarEvents(session.session.user.id, intern)
    }
    cargarDatos()
  }, [])

  async function cargarCreators() {
    const { data } = await supabase
      .from('outreach_creators')
      .select('*')
      .order('created_at', { ascending: false })
    setCreators(data || [])
  }

  async function cargarEvents(uid, intern) {
    let query = supabase
      .from('outreach_events')
      .select('*')
      .order('due_date', { ascending: true })
    if (intern) query = query.eq('asignado_a', uid)
    const { data } = await query
    setEvents(data || [])
  }

  function resetFormCreator() {
    setCNombre(''); setCPlataforma('Instagram'); setCUsername(''); setCEstado('contacted'); setCNotas('')
  }

  function resetFormEvent() {
    setENombre(''); setERequirements(''); setEAsignado(''); setEDueDate(''); setEEstado('pending')
  }

  async function guardarCreator() {
    if (!cNombre.trim()) return
    if (editandoCreator) {
      await supabase.from('outreach_creators').update({
        nombre: cNombre, plataforma: cPlataforma, username: cUsername, estado: cEstado, notas: cNotas
      }).eq('id', editandoCreator.id)
      setEditandoCreator(null)
    } else {
      await supabase.from('outreach_creators').insert({
        nombre: cNombre, plataforma: cPlataforma, username: cUsername, estado: cEstado, notas: cNotas, creado_por: userId
      })
      setMostrarFormCreator(false)
    }
    resetFormCreator()
    await cargarCreators()
  }

  async function eliminarCreator(id) {
    await supabase.from('outreach_creators').delete().eq('id', id)
    await cargarCreators()
  }

  async function guardarEvent() {
    if (!eNombre.trim()) return
    const asignadoObj = marketing.find(m => m.id === eAsignado)
    if (editandoEvent) {
      await supabase.from('outreach_events').update({
        nombre_evento: eNombre, requirements: eRequirements,
        asignado_a: eAsignado || null, nombre_asignado: asignadoObj?.nombre || null,
        due_date: eDueDate || null, estado: eEstado
      }).eq('id', editandoEvent.id)
      setEditandoEvent(null)
    } else {
      await supabase.from('outreach_events').insert({
        nombre_evento: eNombre, requirements: eRequirements,
        asignado_a: eAsignado || null, nombre_asignado: asignadoObj?.nombre || null,
        due_date: eDueDate || null, estado: eEstado, creado_por: userId
      })
      setMostrarFormEvent(false)
    }
    resetFormEvent()
    await cargarEvents(userId, esIntern)
  }

  async function eliminarEvent(id) {
    await supabase.from('outreach_events').delete().eq('id', id)
    await cargarEvents(userId, esIntern)
  }

  async function actualizarEstadoEvent(id, nuevoEstado) {
    await supabase.from('outreach_events').update({ estado: nuevoEstado }).eq('id', id)
    await cargarEvents(userId, esIntern)
  }

  async function subirLinkEvent(id) {
    const url = linkInput[id] || ''
    if (!url.trim()) return
    await supabase.from('outreach_events').update({ url_entregado: url, estado: 'done' }).eq('id', id)
    setLinkInput({...linkInput, [id]: ''})
    await cargarEvents(userId, esIntern)
  }

  function abrirEditarCreator(c) {
    setEditandoCreator(c)
    setCNombre(c.nombre); setCPlataforma(c.plataforma); setCUsername(c.username || '')
    setCEstado(c.estado); setCNotas(c.notas || '')
    setMostrarFormCreator(false)
  }

  function abrirEditarEvent(e) {
    setEditandoEvent(e)
    setENombre(e.nombre_evento); setERequirements(e.requirements || '')
    setEAsignado(e.asignado_a || ''); setEDueDate(e.due_date || ''); setEEstado(e.estado)
    setMostrarFormEvent(false)
  }

  function badgeEstadoCreator(estado) {
    if (estado === 'contacted') return <span className="or-badge badge-pending">Contacted</span>
    if (estado === 'collaborating') return <span className="or-badge badge-active">Collaborating</span>
    if (estado === 'done') return <span className="or-badge badge-done">Done</span>
  }

  function badgeEstadoEvent(estado) {
    if (estado === 'pending') return <span className="or-badge badge-pending">Pending</span>
    if (estado === 'in progress') return <span className="or-badge badge-active">In progress</span>
    if (estado === 'done') return <span className="or-badge badge-done">Done</span>
  }

  function formatFecha(f) {
    if (!f) return '—'
    return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function renderFormCreator(esEdicion = false) {
    return (
      <div className="or-form">
        <p className="or-form-title">{esEdicion ? `Editing — ${editandoCreator?.nombre}` : 'New creator'}</p>
        <div className="or-row2">
          <div className="or-field">
            <label className="or-label">Name</label>
            <input className="or-input" type="text" placeholder="Creator name" value={cNombre} onChange={(e) => setCNombre(e.target.value)} />
          </div>
          <div className="or-field">
            <label className="or-label">Platform</label>
            <select className="or-input" value={cPlataforma} onChange={(e) => setCPlataforma(e.target.value)}>
              {PLATAFORMAS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="or-row2">
          <div className="or-field">
            <label className="or-label">@Username</label>
            <input className="or-input" type="text" placeholder="@handle" value={cUsername} onChange={(e) => setCUsername(e.target.value)} />
          </div>
          <div className="or-field">
            <label className="or-label">Status</label>
            <select className="or-input" value={cEstado} onChange={(e) => setCEstado(e.target.value)}>
              {ESTADOS_CREATOR.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="or-field">
          <label className="or-label">Notes</label>
          <textarea className="or-textarea" placeholder="Any notes about this collaboration..." value={cNotas} onChange={(e) => setCNotas(e.target.value)} />
        </div>
        <div className="or-form-btns">
          <button className="or-save" onClick={guardarCreator} disabled={!cNombre.trim()}>
            {esEdicion ? 'Save changes' : 'Add creator'}
          </button>
          <button className="or-cancel" onClick={() => { esEdicion ? setEditandoCreator(null) : setMostrarFormCreator(false); resetFormCreator() }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  function renderFormEvent(esEdicion = false) {
    return (
      <div className="or-form">
        <p className="or-form-title">{esEdicion ? `Editing — ${editandoEvent?.nombre_evento}` : 'New event / flyer'}</p>
        <div className="or-field">
          <label className="or-label">Event name</label>
          <input className="or-input" type="text" placeholder="e.g. TTL Fundraiser Nov" value={eNombre} onChange={(e) => setENombre(e.target.value)} />
        </div>
        <div className="or-field">
          <label className="or-label">Requirements</label>
          <textarea className="or-textarea" placeholder="What content/flyers are needed..." value={eRequirements} onChange={(e) => setERequirements(e.target.value)} />
        </div>
        <div className="or-row2">
          <div className="or-field">
            <label className="or-label">Assigned to</label>
            <select className="or-input" value={eAsignado} onChange={(e) => setEAsignado(e.target.value)}>
              <option value="">Unassigned</option>
              {marketing.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="or-field">
            <label className="or-label">Due date</label>
            <input className="or-input" type="date" value={eDueDate} onChange={(e) => setEDueDate(e.target.value)} />
          </div>
        </div>
        <div className="or-field">
          <label className="or-label">Status</label>
          <select className="or-input" value={eEstado} onChange={(e) => setEEstado(e.target.value)}>
            {ESTADOS_EVENT.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="or-form-btns">
          <button className="or-save" onClick={guardarEvent} disabled={!eNombre.trim()}>
            {esEdicion ? 'Save changes' : 'Add event'}
          </button>
          <button className="or-cancel" onClick={() => { esEdicion ? setEditandoEvent(null) : setMostrarFormEvent(false); resetFormEvent() }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="or-content">
        <button className="or-back" onClick={() => navigate('/dashboard')}>← Back</button>

        <div className="or-topbar">
          <h1 className="or-title">{esIntern ? 'My assignments' : 'Outreach'}</h1>
          {!esIntern && (
            <button
              className="or-new-btn"
              onClick={() => {
                if (tab === 'creators') { setMostrarFormCreator(!mostrarFormCreator); setEditandoCreator(null); resetFormCreator() }
                else { setMostrarFormEvent(!mostrarFormEvent); setEditandoEvent(null); resetFormEvent() }
              }}
            >
              {(tab === 'creators' && mostrarFormCreator) || (tab === 'events' && mostrarFormEvent) ? 'Cancel' : '+ New'}
            </button>
          )}
        </div>

        {!esIntern && (
          <div className="or-stats">
            <div className="or-stat">
              <div className="or-stat-n">{creators.filter(c => c.estado === 'collaborating').length}</div>
              <div className="or-stat-l">Active creators</div>
            </div>
            <div className="or-stat">
              <div className="or-stat-n" style={{color:'#92400e'}}>{events.filter(e => e.estado === 'pending').length}</div>
              <div className="or-stat-l">Pending events</div>
            </div>
            <div className="or-stat">
              <div className="or-stat-n" style={{color:'#15803d'}}>{events.filter(e => e.estado === 'done').length}</div>
              <div className="or-stat-l">Done</div>
            </div>
          </div>
        )}

        <div className="or-tabs">
          {!esIntern && (
            <button className={`or-tab ${tab === 'creators' ? 'active' : ''}`} onClick={() => setTab('creators')}>
              Creators <span className="or-tab-count">{creators.length}</span>
            </button>
          )}
          <button className={`or-tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
            {esIntern ? 'My events' : 'Events & flyers'} <span className="or-tab-count">{events.length}</span>
          </button>
        </div>

        {tab === 'creators' && !esIntern && (
          <div>
            {mostrarFormCreator && renderFormCreator(false)}
            {editandoCreator && renderFormCreator(true)}
            {creators.length === 0 && !mostrarFormCreator && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No creators yet.</p>
            )}
            {creators.map(c => (
              <div key={c.id} className="or-card">
                <div className="or-card-header" onClick={() => setExpandido(expandido === c.id ? null : c.id)}>
                  <div className="or-platform-badge">{c.plataforma}</div>
                  <div className="or-card-info">
                    <p className="or-card-title">{c.nombre}</p>
                    <p className="or-card-sub">{c.username ? `@${c.username.replace('@', '')}` : '—'}</p>
                  </div>
                  <div className="or-card-right">
                    {badgeEstadoCreator(c.estado)}
                    <button className="or-edit-btn" onClick={(e) => { e.stopPropagation(); abrirEditarCreator(c) }}>
                      <i className="ti ti-edit" aria-hidden="true"></i>
                    </button>
                    <button className="or-delete-btn" onClick={(e) => { e.stopPropagation(); eliminarCreator(c.id) }}>
                      <i className="ti ti-trash" aria-hidden="true"></i>
                    </button>
                    <i className={`ti ${expandido === c.id ? 'ti-chevron-up' : 'ti-chevron-down'} or-chevron`} aria-hidden="true"></i>
                  </div>
                </div>
                {expandido === c.id && c.notas && (
                  <div className="or-card-body">
                    <p className="or-field-label">Notes</p>
                    <p className="or-field-value">{c.notas}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div>
            {!esIntern && mostrarFormEvent && renderFormEvent(false)}
            {!esIntern && editandoEvent && renderFormEvent(true)}
            {events.length === 0 && (
              <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>
                {esIntern ? 'No assignments yet.' : 'No events yet.'}
              </p>
            )}
            {events.map(e => (
              <div key={e.id} className="or-card">
                <div className="or-card-header" onClick={() => setExpandido(expandido === e.id ? null : e.id)}>
                  <div className="or-card-info">
                    <p className="or-card-title">{e.nombre_evento}</p>
                    <p className="or-card-sub">
                      {e.nombre_asignado || 'Unassigned'} · Due {formatFecha(e.due_date)}
                    </p>
                  </div>
                  <div className="or-card-right">
                    {badgeEstadoEvent(e.estado)}
                    {!esIntern && (
                      <>
                        <button className="or-edit-btn" onClick={(ev) => { ev.stopPropagation(); abrirEditarEvent(e) }}>
                          <i className="ti ti-edit" aria-hidden="true"></i>
                        </button>
                        <button className="or-delete-btn" onClick={(ev) => { ev.stopPropagation(); eliminarEvent(e.id) }}>
                          <i className="ti ti-trash" aria-hidden="true"></i>
                        </button>
                      </>
                    )}
                    <i className={`ti ${expandido === e.id ? 'ti-chevron-up' : 'ti-chevron-down'} or-chevron`} aria-hidden="true"></i>
                  </div>
                </div>

                {expandido === e.id && (
                  <div className="or-card-body">
                    {e.requirements && (
                      <div style={{marginBottom:'10px'}}>
                        <p className="or-field-label">Requirements</p>
                        <p className="or-field-value">{e.requirements}</p>
                      </div>
                    )}
                    {e.url_entregado && (
                      <div style={{marginBottom:'10px'}}>
                        <p className="or-field-label">Submitted link</p>
                        <a href={e.url_entregado} target="_blank" rel="noreferrer" style={{fontSize:'13px', color:'#2d2a86', wordBreak:'break-all'}}>
                          {e.url_entregado} <i className="ti ti-external-link" style={{fontSize:'11px'}} aria-hidden="true"></i>
                        </a>
                      </div>
                    )}
                    {esIntern && (
                      <div style={{marginTop:'10px', display:'flex', flexDirection:'column', gap:'8px'}}>
                        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                          {ESTADOS_EVENT.map(s => (
                            <button
                              key={s}
                              onClick={() => actualizarEstadoEvent(e.id, s)}
                              style={{
                                padding:'5px 10px', borderRadius:'999px',
                                border: e.estado === s ? 'none' : '0.5px solid #eee',
                                background: e.estado === s ? '#1a1a1a' : 'white',
                                color: e.estado === s ? 'white' : '#555',
                                fontSize:'11px', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:500
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        {e.estado !== 'done' && (
                          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                            <input
                              className="or-input"
                              type="url"
                              placeholder="Submit link (Google Drive, Canva...)"
                              value={linkInput[e.id] || ''}
                              onChange={(ev) => setLinkInput({...linkInput, [e.id]: ev.target.value})}
                              style={{flex:1}}
                            />
                            <button
                              className="or-save"
                              style={{padding:'7px 14px', whiteSpace:'nowrap'}}
                              onClick={() => subirLinkEvent(e.id)}
                              disabled={!linkInput[e.id]?.trim()}
                            >
                              Submit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {!esIntern && e.url_entregado && (
                      <p style={{fontSize:'11px', color:'#15803d', marginTop:'6px'}}>✓ Submitted by {e.nombre_asignado}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Outreach