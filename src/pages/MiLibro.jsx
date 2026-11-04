import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './StudentPages.css'

function MiLibro() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [nivel, setNivel] = useState(null)
  const [urlLibro, setUrlLibro] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const { data: perfilData } = await supabase
        .from('perfiles')
        .select('nivel')
        .eq('id', session.session.user.id)
        .single()

      if (perfilData?.nivel) {
        setNivel(perfilData.nivel)
        const { data } = supabase.storage.from('Libros').getPublicUrl(`${perfilData.nivel}.pdf`)
        setUrlLibro(data.publicUrl)
      }
    }
    cargar()
  }, [])

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="sp-content">
        <button className="sp-back" onClick={() => navigate('/estudiantes')}>← Back</button>
        <h1 className="sp-title">My book</h1>

        {!nivel && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No level assigned yet.</p>
        )}

        {nivel && urlLibro && (
          <div className="sp-card" style={{padding:'2rem', textAlign:'center'}}>
            <div style={{fontSize:'48px', marginBottom:'1rem'}}>📖</div>
            <p style={{fontSize:'18px', fontWeight:700, color:'#1a1a1a', margin:'0 0 4px'}}>English Book</p>
            <p style={{fontSize:'14px', color:'#aaa', margin:'0 0 1.5rem'}}>Level {nivel}</p>
            <a
              href={urlLibro}
              target="_blank"
              rel="noreferrer"
              style={{display:'inline-block', padding:'10px 28px', borderRadius:'999px', background:'#a9cb5a', color:'#1a1a1a', fontSize:'14px', fontWeight:700, textDecoration:'none', fontFamily:'Poppins,sans-serif'}}
            >
              📥 Download book
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default MiLibro