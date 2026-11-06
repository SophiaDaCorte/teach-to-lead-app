import {
  corsHeaders, respuesta, clienteAdmin, identificar, rolesEfectivos, puedeGestionar,
} from '../_shared/permisos.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = clienteAdmin()

  try {
    const quien = await identificar(req, admin)
    if (!quien) return respuesta({ error: 'You must be signed in as staff to do this.' }, 401)

    const { userId, password } = await req.json()
    if (!userId) return respuesta({ error: 'Missing user.' }, 400)
    if (typeof password !== 'string' || password.trim().length < 8) {
      return respuesta({ error: 'The password must be at least 8 characters.' }, 400)
    }

    const { data: objetivo } = await admin
      .from('perfiles').select('id, roles, roles_anteriores').eq('id', userId).maybeSingle()
    if (!objetivo || !puedeGestionar(quien.roles, rolesEfectivos(objetivo))) {
      return respuesta({ error: "You don't have permission to reset this password." }, 403)
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password: password.trim() })
    if (error) return respuesta({ error: error.message }, 400)

    return respuesta({ success: true })
  } catch (error) {
    return respuesta({ error: (error as { message?: string })?.message || 'Unknown error' }, 400)
  }
})