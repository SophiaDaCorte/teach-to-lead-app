import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const CLAVE = 'weekly_report_start'
const INICIO_ORIGINAL = '2026-08-18'

function aIso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function lunesDe(fechaIso) {
  const d = new Date(fechaIso + 'T12:00:00')
  const dia = d.getDay()
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  return aIso(d)
}

function formatFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ReinicioSemanas() {
  const lunesActual = lunesDe(aIso(new Date()))
  const [inicio, setInicio] = useState(null)
  const [fecha, setFecha] = useState(lunesActual)
  const [borrar, setBorrar] = useState(false)
  const [cantidad, setCantidad] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase.from('configuracion').select('valor').eq('clave', CLAVE).maybeSingle()
      setInicio(data?.valor || INICIO_ORIGINAL)
    }
    cargar()
  }, [])

  useEffect(() => {
    async function contar() {
      if (!fecha) return
      const { count } = await supabase
        .from('weekly_reports').select('*', { count: 'exact', head: true })
        .lt('semana_inicio', lunesDe(fecha))
      setCantidad(count || 0)
    }
    contar()
  }, [fecha, ok])

  async function reiniciar(fechaElegida) {
    setError(''); setOk('')
    const lunes = lunesDe(fechaElegida)
    if (lunes > lunesActual) {
      setError('Pick this week or an earlier one.')
      return
    }
    if (borrar && cantidad > 0) {
      const confirmado = window.confirm(
        `Delete ${cantidad} submitted report${cantidad > 1 ? 's' : ''} from before ${formatFecha(lunes)}? Hours already added stay as they are. This can't be undone.`
      )
      if (!confirmado) return
    }

    setGuardando(true)
    const { error: errConfig } = await supabase.from('configuracion').upsert(
      { clave: CLAVE, valor: lunes, updated_at: new Date().toISOString() },
      { onConflict: 'clave' }
    )
    if (errConfig) {
      setError(errConfig.message || 'Could not save the start date.')
      setGuardando(false)
      return
    }

    let borrados = 0
    if (borrar) {
      const { data, error: errBorrar } = await supabase
        .from('weekly_reports').delete().lt('semana_inicio', lunes).select('id')
      if (errBorrar) {
        setError(`The start date changed, but the old reports could not be deleted: ${errBorrar.message}`)
        setInicio(lunes)
        setGuardando(false)
        return
      }
      borrados = data?.length || 0
    }

    setInicio(lunes)
    setBorrar(false)
    setOk(
      `Weekly reports now start the week of ${formatFecha(lunes)}.` +
      (borrados > 0 ? ` ${borrados} old report${borrados > 1 ? 's were' : ' was'} deleted.` : '')
    )
    setGuardando(false)
  }

  const lunesElegido = fecha ? lunesDe(fecha) : lunesActual

  return (
    <div style={{ background: 'white', border: '0.5px solid #eee', borderRadius: '12px', padding: '1.25rem' }}>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Restart the weeks</p>
      <p style={{ fontSize: '12px', color: '#777', margin: '0 0 14px' }}>
        Volunteers only see weeks from the start date onward. Weeks before it disappear from their list and stop showing as missing.
      </p>

      <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 14px' }}>
        Current start: <strong style={{ color: '#1a1a1a' }}>{inicio ? `week of ${formatFecha(inicio)}` : 'Loading...'}</strong>
      </p>

      <button
        onClick={() => reiniciar(lunesActual)}
        disabled={guardando}
        style={{ padding: '9px 18px', borderRadius: '999px', border: 'none', background: '#a9cb5a', color: '#1a1a1a', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
      >
        {guardando ? 'Saving...' : `Start from this week (${formatFecha(lunesActual)})`}
      </button>

      <p style={{ fontSize: '11px', color: '#aaa', margin: '18px 0 6px' }}>Or choose another start date</p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={fecha}
          max={lunesActual}
          onChange={(e) => setFecha(e.target.value)}
          style={{ padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: '8px', fontSize: '16px', fontFamily: 'Poppins, sans-serif', color: '#1a1a1a', background: 'white', colorScheme: 'light' }}
        />
        <span style={{ fontSize: '12px', color: '#777' }}>Starts the week of {formatFecha(lunesElegido)}</span>
        <button
          onClick={() => reiniciar(fecha)}
          disabled={guardando || !fecha}
          style={{ padding: '7px 14px', borderRadius: '999px', border: '0.5px solid #ddd', background: 'white', color: '#2d2a86', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
        >
          Set date
        </button>
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '16px 0 0', fontSize: '12px', color: '#555', cursor: 'pointer' }}>
        <input type="checkbox" checked={borrar} onChange={(e) => setBorrar(e.target.checked)} style={{ marginTop: '2px' }} />
        <span>
          Also delete submitted reports from before that week
          <span style={{ display: 'block', color: '#aaa', fontSize: '11px' }}>
            {cantidad} report{cantidad === 1 ? '' : 's'} before {formatFecha(lunesElegido)}. Hours already added are not removed.
          </span>
        </span>
      </label>

      {error && <p style={{ fontSize: '12px', color: '#b91c1c', margin: '12px 0 0' }}>{error}</p>}
      {ok && <p style={{ fontSize: '12px', color: '#3B6D11', fontWeight: 600, margin: '12px 0 0' }}>✓ {ok}</p>}
    </div>
  )
}

export default ReinicioSemanas