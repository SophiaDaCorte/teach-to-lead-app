import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Doodle, useDoodles } from '../components/Doodles.jsx'
import '../components/PageBackground.css'

function AdminPanel() {
  const navigate = useNavigate()
  const doodles = useDoodles()
  const [tab, setTab] = useState('add')

  return (
    <div className="page-wrapper">
      <div className="doodle-layer">
        {doodles.map((d, i) => <Doodle key={i} {...d} />)}
      </div>
      <div style={{position:'relative', zIndex:1, fontFamily:'Poppins,sans-serif', maxWidth:'700px', margin:'0 auto', padding:'2rem 1.5rem 4rem'}}>
        <button onClick={() => navigate('/dashboard')} style={{background:'none', border:'none', color:'#2d2a86', fontWeight:600, fontSize:'0.95rem', cursor:'pointer', marginBottom:'1.5rem', padding:0}}>← Back</button>
        <h1 style={{fontSize:'28px', fontWeight:900, color:'#1a1a1a', marginBottom:'1.5rem'}}>Admin panel</h1>

        <div style={{display:'flex', gap:'4px', background:'#f9f9f9', borderRadius:'8px', padding:'4px', marginBottom:'1.5rem'}}>
          {['add', 'manage', 'inactive'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{flex:1, padding:'7px 12px', borderRadius:'6px', border: tab === t ? '0.5px solid #eee' : 'none', background: tab === t ? 'white' : 'none', fontSize:'13px', fontWeight: tab === t ? 500 : 400, color: tab === t ? '#1a1a1a' : '#888', cursor:'pointer', fontFamily:'Poppins,sans-serif'}}>
              {t === 'add' ? 'Add volunteer' : t === 'manage' ? 'Manage volunteers' : 'Inactive'}
            </button>
          ))}
        </div>

        {tab === 'add' && <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>Add volunteer form — coming soon</p>}
        {tab === 'manage' && <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>Manage volunteers — coming soon</p>}
        {tab === 'inactive' && <p style={{color:'#aaa', fontSize:'14px', textAlign:'center', marginTop:'3rem'}}>Inactive volunteers — coming soon</p>}
      </div>
    </div>
  )
}

export default AdminPanel