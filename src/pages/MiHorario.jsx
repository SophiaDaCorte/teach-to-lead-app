import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './StudentPages.css'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function MiHorario() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [clases, setClases] = useState([])
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const { data: perfilData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.session.user.id)
        .single()
      setPerfil(perfilData)

      if (perfilData?.comunidad) {
        const { data: clasesData } = await supabase
          .from('clases')
          .select('*')
          .eq('comunidad', perfilData.comunidad)
        setClases(clasesData || [])
      }
    }
    cargar()
  }, [])

  function formatHora(h) {
    if (!h) return '—'
    const [hour, min] = h.split(':')
    const h12 = Number(hour) % 12 || 12
    const ampm = Number(hour) < 12 ? 'AM' : 'PM'
    return `${h12}:${min} ${ampm}`
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="sp-content">
        <button className="sp-back" onClick={() => navigate('/estudiantes')}>← Back</button>
        <h1 className="sp-title">My schedule</h1>
        {perfil && <p style={{fontSize:'13px', color:'#aaa', marginBottom:'1.5rem'}}>{perfil.comunidad} · {perfil.nivel}</p>}

        {clases.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No schedule yet.</p>
        )}

        {DIAS.map(dia => {
          const clasesDelDia = clases.filter(c => c.dia_semana === dia)
          if (clasesDelDia.length === 0) return null
          return (
            <div key={dia} className="sp-card" style={{marginBottom:'8px'}}>
              <div style={{padding:'12px 16px', borderBottom:'0.5px solid #eee'}}>
                <p style={{fontSize:'13px', fontWeight:600, color:'#1a1a1a', margin:0}}>{dia}</p>
              </div>
              {clasesDelDia.map(c => (
                <div key={c.id} style={{padding:'12px 16px', borderBottom:'0.5px solid #f5f5f5'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <p style={{fontSize:'14px', fontWeight:500, color:'#1a1a1a', margin:0}}>
                      {formatHora(c.hora_inicio)} — {formatHora(c.hora_fin)}
                    </p>
                    {c.link_clase && (
                      <a
                        href={c.link_clase}
                        target="_blank"
                        rel="noreferrer"
                        style={{padding:'6px 14px', borderRadius:'999px', background:'#a9cb5a', color:'#1a1a1a', fontSize:'12px', fontWeight:600, textDecoration:'none'}}
                      >
                        Join class
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MiHorario