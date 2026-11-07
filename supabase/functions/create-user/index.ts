
import {
  corsHeaders, respuesta, clienteAdmin, identificar, rolesPermitidos, emailValido,
} from '../_shared/permisos.ts'
import { guardarPassword } from '../_shared/cifrado.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = clienteAdmin()
  let userIdCreado: string | null = null

  try {
    const quien = await identificar(req, admin)
    if (!quien) return respuesta({ error: 'You must be signed in as staff to do this.' }, 401)

    const { nombre, titulo, roles, email, password, comunidad, nivel, telefono } = await req.json()

    const listaRoles: string[] = Array.isArray(roles) && roles.length > 0 ? roles : ['estudiante']
    const permitidos = rolesPermitidos(quien.roles)
    if (!listaRoles.every((r) => permitidos.includes(r))) {
      return respuesta({ error: "You can't create an account with that role." }, 403)
    }

    const emailLimpio = String(email || '').trim().toLowerCase()
    if (!emailValido(emailLimpio)) return respuesta({ error: 'Enter a valid email.' }, 400)
    if (typeof password !== 'string' || password.length < 8) {
      return respuesta({ error: 'The password must be at least 8 characters.' }, 400)
    }
    if (!String(nombre || '').trim()) return respuesta({ error: 'Name is required.' }, 400)

    const esEstudiante = listaRoles.includes('estudiante')

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailLimpio,
      password,
      email_confirm: true,
    })
    if (authError) throw authError

    userIdCreado = authData.user.id

    const { error: perfilError } = await admin.from('perfiles').upsert(
      {
        id: userIdCreado,
        nombre: String(nombre).trim(),
        email: emailLimpio,
        titulo: titulo || 'Estudiante',
        roles: listaRoles,
        comunidad: comunidad || null,
        nivel: nivel || null,
        telefono: telefono || null,
      },
      { onConflict: 'id' }
    )
    if (perfilError) throw perfilError

    if (!esEstudiante) {
      const { error: horasError } = await admin.from('horas').insert({
        user_id: userIdCreado,
        content_hrs: 0,
        meeting_hrs: 0,
      })
      if (horasError) throw horasError
    }

    await guardarPassword(admin, authData.user.id, password)

    return respuesta({ success: true, userId: userIdCreado })
  } catch (error) {
    if (userIdCreado) {
      await admin.from('horas').delete().eq('user_id', userIdCreado)
      await admin.from('perfiles').delete().eq('id', userIdCreado)
      await admin.auth.admin.deleteUser(userIdCreado)
    }
    const mensaje = (error as { message?: string })?.message || 'Unknown error'
    return respuesta({ error: mensaje }, 400)
  }
})