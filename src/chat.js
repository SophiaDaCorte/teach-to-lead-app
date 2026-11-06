import { supabase } from './supabase.js'

export const EQUIPOS = [
  { clave: 'team:todos', nombre: 'Everyone', desc: 'All volunteers', emoji: '🌎', roles: null },
  { clave: 'team:staff', nombre: 'Staff', desc: 'Staff and directors', emoji: '👥', roles: ['staff_admin', 'staff_regular', 'volunteer_coordinator', 'director_of_programs', 'director_of_schools'] },
  { clave: 'team:marketing', nombre: 'Marketing', desc: 'Marketing team', emoji: '📣', roles: ['staff_admin', 'staff_marketing', 'marketing_interns'] },
  { clave: 'team:tutors', nombre: 'Tutors', desc: 'All tutors', emoji: '🎓', roles: ['staff_admin', 'volunteer_coordinator', 'director_of_schools', 'tutors'] },
  { clave: 'team:creation', nombre: 'Creation', desc: 'Creation team', emoji: '🎨', roles: ['staff_admin', 'volunteer_coordinator', 'creation'] },
]

const SUPERVISAN = ['staff_admin', 'volunteer_coordinator', 'director_of_schools']

export function esVoluntario(roles) {
  return !roles.includes('estudiante') && !roles.includes('inactivo')
}

export function supervisa(roles) {
  return roles.some(r => SUPERVISAN.includes(r))
}

export function equiposDe(roles) {
  if (!esVoluntario(roles)) return []
  return EQUIPOS.filter(e => e.roles === null || e.roles.some(r => roles.includes(r)))
}

// En los chats privados (dm: y st:) solo cuentan como participantes las dos personas de la clave.
export function esParticipante(clave, uid) {
  if (!clave.startsWith('st:') && !clave.startsWith('dm:')) return true
  return clave.split(':').slice(1).includes(uid)
}

export async function comunidadesDe(perfil, userId) {
  const roles = perfil.roles || []

  if (roles.includes('estudiante')) {
    if (!perfil.comunidad) return []
    const { data } = await supabase
      .from('comunidades').select('*')
      .eq('nombre', perfil.comunidad).eq('nivel', perfil.nivel)
    return data || []
  }

  if (supervisa(roles)) {
    const { data } = await supabase.from('comunidades').select('*').order('nombre')
    return data || []
  }

  if (roles.includes('tutors')) {
    const { data } = await supabase
      .from('comunidades').select('*').eq('tutor_id', userId).order('nombre')
    return data || []
  }

  return []
}

export async function cargarResumen(userId) {
  const [lecturasRes, mensajesRes] = await Promise.all([
    supabase.from('chat_lecturas').select('canal, leido_en').eq('user_id', userId),
    supabase.from('chat_mensajes')
      .select('id, canal, user_id, nombre, contenido, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const leidos = {}
  ;(lecturasRes.data || []).forEach(l => { leidos[l.canal] = new Date(l.leido_en).getTime() })

  const ultimo = {}
  const sinLeer = {}
  ;(mensajesRes.data || []).forEach(m => {
    if (!ultimo[m.canal]) ultimo[m.canal] = m
    if (!esParticipante(m.canal, userId)) return
    if (m.user_id !== userId && new Date(m.created_at).getTime() > (leidos[m.canal] || 0)) {
      sinLeer[m.canal] = (sinLeer[m.canal] || 0) + 1
    }
  })

  const total = Object.values(sinLeer).reduce((a, b) => a + b, 0)
  return { ultimo, sinLeer, total }
}