// @ts-nocheck
import {
  corsHeaders, respuesta, clienteAdmin, identificar, rolesEfectivos, puedeGestionar,
} from '../_shared/permisos.ts'
import { descifrar } from '../_shared/cifrado.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = clienteAdmin()

  try {
    const quien = await identificar(req, admin)
    if (!quien) return respuesta({ error: 'You must be signed in as staff to do this.' }, 401)

    const { userId } = await req.json()
    if (!userId) return respuesta({ error: 'Missing user.' }, 400)

    const { data: objetivo } = await admin
      .from('perfiles').select('id, roles, roles_anteriores').eq('id', userId).maybeSingle()
    if (!objetivo || !puedeGestionar(quien.roles, rolesEfectivos(objetivo))) {
      return respuesta({ error: "You don't have permission to see this password." }, 403)
    }

    const { data: fila } = await admin
      .from('credenciales_visibles').select('cifrada, updated_at').eq('user_id', userId).maybeSingle()
    if (!fila) return respuesta({ disponible: false })

    const password = await descifrar(fila.cifrada)
    return respuesta({ disponible: true, password, actualizada: fila.updated_at })
  } catch (error) {
    return respuesta({ error: (error as { message?: string })?.message || 'Unknown error' }, 400)
  }
})