import { supabase } from './supabase.js'

const SUPERVISORES_DE_CLASE = ['staff_admin', 'volunteer_coordinator']

export function esSupervisorDeClases(roles = []) {
  return roles.some(r => SUPERVISORES_DE_CLASE.includes(r))
}

export function veSeccionTutor(roles = []) {
  return roles.includes('tutors') || esSupervisorDeClases(roles)
}

// Tutor: solo sus comunidades. Admin y coordinador: todas, con las suyas marcadas.
export async function cargarComunidadesTutor(uid, roles) {
  let q = supabase.from('comunidades').select('*').order('nombre')
  if (!esSupervisorDeClases(roles)) q = q.eq('tutor_id', uid)
  const { data } = await q
  const lista = data || []

  const ids = [...new Set(lista.map(c => c.tutor_id).filter(Boolean))]
  const nombres = {}
  if (ids.length > 0) {
    const { data: tutores } = await supabase.from('perfiles').select('id, nombre').in('id', ids)
    ;(tutores || []).forEach(t => { nombres[t.id] = t.nombre })
  }

  return lista
    .map(c => ({ ...c, tutor_nombre: nombres[c.tutor_id] || null, esMia: c.tutor_id === uid }))
    .sort((a, b) => Number(b.esMia) - Number(a.esMia))
}