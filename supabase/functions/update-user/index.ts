import {
  corsHeaders, respuesta, clienteAdmin, identificar,
  rolesPermitidos, rolesEfectivos, puedeGestionar, emailValido,
} from '../_shared/permisos.ts'

// Tablas que guardan una copia del nombre. Al cambiarlo, se actualizan también.
const COPIAS_DE_NOMBRE: [string, string, string][] = [
  ['gradebook_notas', 'nombre_estudiante', 'estudiante_id'],
  ['content_hub', 'nombre_reclamado', 'reclamado_por'],
  ['outreach_events', 'nombre_asignado', 'asignado_a'],
  ['proyecto_tareas', 'nombre_asignado', 'asignado_a'],
  ['fotos_clase', 'nombre_tutor', 'tutor_id'],
  ['advertencias', 'nombre', 'user_id'],
  ['weekly_reports', 'nombre_voluntario', 'user_id'],
  ['solicitudes_certificado', 'nombre_solicitante', 'user_id'],
  ['solicitudes_week_off', 'nombre_solicitante', 'user_id'],
  ['observaciones_clase', 'nombre_observador', 'user_id'],
  ['observaciones_clase', 'nombre_tutor', 'tutor_id'],
  ['chat_mensajes', 'nombre', 'user_id'],
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = clienteAdmin()

  try {
    const quien = await identificar(req, admin)
    if (!quien) return respuesta({ error: 'You must be signed in as staff to do this.' }, 401)

    const body = await req.json()
    const userId: string = body.userId
    if (!userId) return respuesta({ error: 'Missing user.' }, 400)

    const { data: objetivo } = await admin
      .from('perfiles').select('id, nombre, roles, roles_anteriores').eq('id', userId).maybeSingle()
    if (!objetivo) return respuesta({ error: 'That person was not found.' }, 404)

    if (!puedeGestionar(quien.roles, rolesEfectivos(objetivo))) {
      return respuesta({ error: "You don't have permission to edit this person." }, 403)
    }

    const cambios: Record<string, unknown> = {}

    if (typeof body.nombre === 'string') {
      const nombre = body.nombre.trim()
      if (!nombre) return respuesta({ error: 'Name is required.' }, 400)
      cambios.nombre = nombre
    }
    if (typeof body.titulo === 'string') cambios.titulo = body.titulo.trim()
    if (typeof body.telefono === 'string') cambios.telefono = body.telefono.trim() || null

    if (Array.isArray(body.roles)) {
      const nuevos: string[] = body.roles
      const actuales: string[] = objetivo.roles || []
      if (nuevos.length === 0) return respuesta({ error: 'At least one role is required.' }, 400)

      if (quien.id === userId) {
        const igual = nuevos.length === actuales.length && nuevos.every((r) => actuales.includes(r))
        if (!igual) return respuesta({ error: "You can't change your own roles." }, 403)
      }

      const permitidos = rolesPermitidos(quien.roles)
      if (!nuevos.every((r) => permitidos.includes(r) || actuales.includes(r))) {
        return respuesta({ error: "You can't give that role." }, 403)
      }
      cambios.roles = nuevos
    }

    if (typeof body.email === 'string' && body.email.trim()) {
      const nuevoEmail = body.email.trim().toLowerCase()
      if (!emailValido(nuevoEmail)) return respuesta({ error: 'Enter a valid email.' }, 400)

      const { data: actual } = await admin.auth.admin.getUserById(userId)
      if (!actual?.user) return respuesta({ error: 'This person has no login account.' }, 404)

      if ((actual.user.email || '').toLowerCase() !== nuevoEmail) {
        const { error: errEmail } = await admin.auth.admin.updateUserById(userId, {
          email: nuevoEmail,
          email_confirm: true,
        })
        if (errEmail) return respuesta({ error: errEmail.message }, 400)
      }
      cambios.email = nuevoEmail
    }

    if (Object.keys(cambios).length === 0) return respuesta({ error: 'Nothing to update.' }, 400)

    const { error: errPerfil } = await admin.from('perfiles').update(cambios).eq('id', userId)
    if (errPerfil) return respuesta({ error: errPerfil.message }, 400)

    if (typeof cambios.nombre === 'string' && cambios.nombre !== objetivo.nombre) {
      for (const [tabla, colNombre, colId] of COPIAS_DE_NOMBRE) {
        await admin.from(tabla).update({ [colNombre]: cambios.nombre }).eq(colId, userId)
      }
    }

    return respuesta({ success: true })
  } catch (error) {
    return respuesta({ error: (error as { message?: string })?.message || 'Unknown error' }, 400)
  }
})