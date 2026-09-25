import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './WeeklyReport.css'

const APP_START_DATE = '2026-08-18'

function getStartOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeek(dateStr) {
  const start = new Date(dateStr + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 4)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function isBeforeDeadline(weekStart) {
  const now = new Date()
  const monday = new Date(weekStart + 'T12:00:00')
  monday.setDate(monday.getDate() + 7)
  monday.setHours(9, 0, 0, 0)
  const mstOffset = 7 * 60
  const utcMonday = new Date(monday.getTime() + mstOffset * 60000)
  return now < utcMonday
}

function WeeklyReport() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [perfil, setPerfil] = useState(null)
  const [userId, setUserId] = useState(null)
  const [semanas, setSemanas] = useState([])
  const [selectedSemana, setSelectedSemana] = useState(null)
  const [reporteActual, setReporteActual] = useState(null)
  const [editando, setEditando] = useState(false)

  const [queHice, setQueHice] = useState('')
  const [checklist, setChecklist] = useState('')
  const [desafios, setDesafios] = useState('')
  const [proximaSemana, setProximaSemana] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)

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

      const { data: reportes } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('semana_inicio', { ascending: false })

      const hoy = new Date()
      const semanaActual = getStartOfWeek(hoy)
      const appStart = getStartOfWeek(new Date(APP_START_DATE + 'T12:00:00'))
      
      const semanasGeneradas = []
      let s = new Date(semanaActual)
      
      while (s >= appStart) {
        const isoDate = s.toISOString().split('T')[0]
        const reporte = (reportes || []).find(r => r.semana_inicio === isoDate)
        const esSemanaActual = s.getTime() === semanaActual.getTime()
        semanasGeneradas.push({
          fecha: isoDate,
          reporte: reporte || null,
          estado: reporte ? 'done' : esSemanaActual ? 'active' : 'pending'
        })
        s.setDate(s.getDate() - 7)
      }

      setSemanas(semanasGeneradas)
      setSelectedSemana(semanasGeneradas[0])
      if (semanasGeneradas[0]?.reporte) {
        setReporteActual(semanasGeneradas[0].reporte)
      }
    }
    cargarDatos()
  }, [])

  function seleccionarSemana(s) {
    setSelectedSemana(s)
    setReporteActual(s.reporte)
    setEditando(false)
    setExito(false)
    setQueHice(s.reporte?.que_hice || '')
    setChecklist(s.reporte?.checklist_completado || '')
    setDesafios(s.reporte?.desafios || '')
    setProximaSemana(s.reporte?.proxima_semana || '')
  }

  async function enviarReporte() {
    if (!queHice.trim()) return
    setEnviando(true)

    const aTime = isBeforeDeadline(selectedSemana.fecha)

    const payload = {
      user_id: userId,
      nombre_voluntario: perfil?.nombre,
      semana_inicio: selectedSemana.fecha,
      que_hice: queHice,
      checklist_completado: checklist,
      desafios,
      proxima_semana: proximaSemana,
      enviado_a_tiempo: aTime,
      estado: 'pendiente',
      updated_at: new Date().toISOString()
    }

    let error
    if (reporteActual) {
      const { error: e } = await supabase
        .from('weekly_reports')
        .update(payload)
        .eq('id', reporteActual.id)
      error = e
    } else {
      const { error: e } = await supabase
        .from('weekly_reports')
        .insert(payload)
      error = e
    }

    if (!error) {
      setExito(true)
      const { data: reportes } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', userId)
        .order('semana_inicio', { ascending: false })

      const semanasActualizadas = semanas.map(s => {
        const reporte = (reportes || []).find(r => r.semana_inicio === s.fecha)
        return { ...s, reporte: reporte || null, estado: reporte ? 'done' : s.estado }
      })

      setSemanas(semanasActualizadas)
      const updated = semanasActualizadas.find(s => s.fecha === selectedSemana.fecha)
      setSelectedSemana(updated)
      setReporteActual(updated?.reporte)
      setEditando(false)
    }

    setEnviando(false)
  }

  const bonusDisponible = selectedSemana ? isBeforeDeadline(selectedSemana.fecha) : false
  const mostrarFormulario = !reporteActual || editando

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>

      <div className="wr-content">
        <button className="wr-back" onClick={() => navigate('/dashboard')}>← Back</button>

        <div className="wr-header">
          <h1 className="wr-title">Weekly report</h1>
          {bonusDisponible && !reporteActual && (
            <span className="wr-deadline">⏰ Due Mon 9am MST</span>
          )}
        </div>

        <div className="wr-weeks">
          {semanas.map((s) => (
            <button
              key={s.fecha}
              className={`wr-week-btn ${selectedSemana?.fecha === s.fecha ? 'active' : ''} ${s.estado === 'done' ? 'done' : s.estado === 'pending' ? 'pending' : ''}`}
              onClick={() => seleccionarSemana(s)}
            >
              {s.estado === 'done' ? '✓ ' : s.estado === 'pending' ? '! ' : ''}{formatWeek(s.fecha)}
            </button>
          ))}
        </div>

        {selectedSemana && (
          <>
            {reporteActual && !editando ? (
              <div className="wr-submitted">
                <p className="wr-submitted-title">✓ Report submitted</p>
                <p className="wr-submitted-sub">
                  {reporteActual.estado === 'aprobado'
                    ? `✅ Approved — ${reporteActual.enviado_a_tiempo ? '+2 hours added' : '+1 hour added'}`
                    : 'Pending admin approval'}
                </p>
                <button className="wr-edit-btn" onClick={() => {
                  setEditando(true)
                  setQueHice(reporteActual.que_hice || '')
                  setChecklist(reporteActual.checklist_completado || '')
                  setDesafios(reporteActual.desafios || '')
                  setProximaSemana(reporteActual.proxima_semana || '')
                }}>
                  Edit report
                </button>
              </div>
            ) : selectedSemana.estado === 'pending' && !editando ? (
              <div className="wr-missing">
                <p className="wr-missing-title">Report missing</p>
                <p className="wr-missing-sub">You did not submit this week's report.</p>
                <button className="wr-edit-btn danger" onClick={() => setEditando(true)}>Submit late</button>
              </div>
            ) : (
              <div>
                {bonusDisponible && !reporteActual && (
                  <div className="wr-bonus">
                    ⭐ Submit before Mon 9am MST to earn +2 hrs instead of +1
                  </div>
                )}

                <div className="wr-card">
                  <div className="wr-q">
                    <label className="wr-q-label">✏️ What did you work on this week?</label>
                    <textarea
                      className="wr-textarea"
                      placeholder="Describe your main tasks and activities..."
                      value={queHice}
                      onChange={(e) => setQueHice(e.target.value)}
                    />
                  </div>

                  <div className="wr-q">
                    <label className="wr-q-label">✅ Did you complete your checklist?</label>
                    <div className="wr-radio-group">
                      {['Yes', 'Partially', 'No'].map(op => (
                        <label key={op} className="wr-radio">
                          <input type="radio" name="checklist" value={op} checked={checklist === op} onChange={() => setChecklist(op)} />
                          {op}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="wr-q">
                    <label className="wr-q-label">⚠️ Any challenges this week?</label>
                    <textarea
                      className="wr-textarea"
                      placeholder="Optional — share any blockers or difficulties..."
                      value={desafios}
                      onChange={(e) => setDesafios(e.target.value)}
                    />
                  </div>

                  <div className="wr-q">
                    <label className="wr-q-label">➡️ What's your focus for next week?</label>
                    <textarea
                      className="wr-textarea"
                      placeholder="What are you planning to work on?"
                      value={proximaSemana}
                      onChange={(e) => setProximaSemana(e.target.value)}
                    />
                  </div>

                  <div className="wr-q">
                    <label className="wr-q-label">📎 Attach files or images</label>
                    <div className="wr-upload">
                      <span>📁 Upload file or image (coming soon)</span>
                    </div>
                  </div>
                </div>

                <div className="wr-footer">
                  <p className="wr-hrs-label">
                    Hours added after admin approval — <strong>{bonusDisponible ? '+2 hrs' : '+1 hr'}</strong>
                  </p>
                  <div style={{display:'flex', gap:'8px'}}>
                    {editando && (
                      <button className="wr-cancel" onClick={() => setEditando(false)}>Cancel</button>
                    )}
                    <button className="wr-submit" onClick={enviarReporte} disabled={enviando || !queHice.trim()}>
                      {enviando ? 'Submitting...' : reporteActual ? 'Save changes' : 'Submit report'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default WeeklyReport