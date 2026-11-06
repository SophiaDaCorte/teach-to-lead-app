import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { cargarComunidadesTutor } from '../tutor.js'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'
import './StudentPages.css'

function StudentBook() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [libros, setLibros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [copiado, setCopiado] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const uid = session.session.user.id

      const { data: p } = await supabase.from('perfiles').select('roles').eq('id', uid).maybeSingle()
      const lista = await cargarComunidadesTutor(uid, p?.roles || [])
      const niveles = [...new Set(lista.map(c => c.nivel).filter(Boolean))].sort()

      const resultado = await Promise.all(niveles.map(async (nivel) => {
        const ruta = `${nivel}.pdf`
        const { data: ver } = supabase.storage.from('Libros').getPublicUrl(ruta)
        const { data: bajar } = supabase.storage.from('Libros').getPublicUrl(ruta, { download: `Libro-${nivel}.pdf` })
        let existe = false
        try {
          const r = await fetch(ver.publicUrl, { method: 'HEAD' })
          existe = r.ok
        } catch {}
        return {
          nivel,
          comunidades: lista.filter(c => c.nivel === nivel).map(c => c.nombre),
          ver: ver.publicUrl,
          bajar: bajar.publicUrl,
          existe
        }
      }))

      setLibros(resultado)
      setCargando(false)
    }
    cargar()
  }, [])

  function copiarLink(nivel, url) {
    navigator.clipboard.writeText(url)
    setCopiado(nivel)
    setTimeout(() => setCopiado(null), 2000)
  }

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div className="sp-content">
        <button className="sp-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className="sp-title">Student book</h1>

        {cargando && <p style={{color:'#aaa', fontSize:'14px'}}>Loading...</p>}

        {!cargando && libros.length === 0 && (
          <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>No community assigned yet.</p>
        )}

        {libros.map(l => (
          <div key={l.nivel} className="sp-card" style={{marginBottom:'10px', padding:'1.25rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom: l.existe ? '12px' : 0}}>
              <span style={{fontSize:'32px'}}>📖</span>
              <div style={{flex:1}}>
                <p style={{fontSize:'15px', fontWeight:700, color:'#1a1a1a', margin:0}}>English book · Level {l.nivel}</p>
                <p style={{fontSize:'11px', color:'#aaa', margin:'2px 0 0'}}>{l.comunidades.join(', ')}</p>
              </div>
              {!l.existe && <span className="sp-badge badge-missing">Not uploaded yet</span>}
            </div>

            {l.existe && (
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                <a href={l.ver} target="_blank" rel="noreferrer"
                  style={{padding:'8px 16px', borderRadius:'999px', border:'0.5px solid #eee', background:'white', color:'#1a1a1a', fontSize:'12px', fontWeight:600, textDecoration:'none'}}>
                  👁️ Open
                </a>
                <a href={l.bajar}
                  style={{padding:'8px 16px', borderRadius:'999px', background:'#a9cb5a', color:'#1a1a1a', fontSize:'12px', fontWeight:700, textDecoration:'none'}}>
                  📥 Download
                </a>
                <button onClick={() => copiarLink(l.nivel, l.ver)}
                  style={{padding:'8px 16px', borderRadius:'999px', border:'0.5px solid #eee', background:'white', color:'#1a1a1a', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif'}}>
                  {copiado === l.nivel ? '✓ Copied!' : '🔗 Copy link'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StudentBook