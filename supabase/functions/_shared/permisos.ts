// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function clienteAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

export type Llamante = { id: string; roles: string[] }

export async function identificar(req: Request, admin: ReturnType<typeof clienteAdmin>): Promise<Llamante | null> {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
  if (!token) { console.error('identificar: no token'); return null }

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) { console.error('identificar: invalid session:', error?.message); return null }

  const { data: perfil, error: errPerfil } = await admin
    .from('perfiles').select('id, roles').eq('id', data.user.id).maybeSingle()
  if (!perfil) { console.error('identificar: no profile for', data.user.id, errPerfil?.message); return null }
  if (!Array.isArray(perfil.roles)) { console.error('identificar: roles is not an array for', data.user.id); return null }
  if (perfil.roles.includes('inactivo')) { console.error('identificar: profile is inactive', data.user.id); return null }

  return { id: perfil.id, roles: perfil.roles }
}

const TODOS_LOS_ROLES = [
  'staff_regular', 'tutors', 'marketing_interns', 'creation', 'volunteer_coordinator',
  'director_of_programs', 'director_of_schools', 'staff_marketing', 'staff_admin', 'estudiante',
]

const ALCANCE: Record<string, string[]> = {
  volunteer_coordinator: ['tutors', 'creation', 'estudiante'],
  director_of_schools: ['tutors', 'estudiante'],
  staff_marketing: ['marketing_interns', 'staff_marketing'],
}

export function rolesPermitidos(roles: string[]): string[] {
  if (roles.includes('staff_admin')) return TODOS_LOS_ROLES
  const set = new Set<string>()
  for (const r of roles) (ALCANCE[r] || []).forEach((x) => set.add(x))
  return [...set]
}

export function rolesEfectivos(p: { roles?: string[] | null; roles_anteriores?: string[] | null }): string[] {
  return [...new Set([...(p.roles || []), ...(p.roles_anteriores || [])])].filter((r) => r !== 'inactivo')
}

export function puedeGestionar(roles: string[], objetivo: string[]): boolean {
  if (roles.includes('staff_admin')) return true
  if (objetivo.length === 0) return false
  const permitidos = rolesPermitidos(roles)
  return objetivo.every((r) => permitidos.includes(r))
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}