import {
  corsHeaders, respuesta, clienteAdmin, identificar, rolesEfectivos, puedeGestionar,
} from '../_shared/permisos.ts'

async function vaciarCarpeta(admin: ReturnType<typeof clienteAdmin>, bucket: string, prefijo: string) {
  try {
    for (let i = 0; i < 10; i++) {
      const { data, error } = await admin.storage.from(bucket).list(prefijo, { limit: 1000 })
      if (error || !data) return
      const archivos = data.filter((f) => f.id !== null)
      if (archivos.length === 0) return
      await admin.storage.from(bucket).remove(archivos.map((f) => `${prefijo}/${f.name}`))
      if (data.length < 1000) return
    }
  } catch (_e) {
    // Si el bucket no existe o falla, seguimos. El borrado de la cuenta no depende de esto.
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = clienteAdmin()

  try {
    const quien = await identificar(req, admin)
    if (!quien) return respuesta({ error: 'You must be signed in as staff to do this.' }, 401)

    const { userId } = await req.json()
    if (!userId) return respuesta({ error: 'Missing user.' }, 400)
    if (userId === quien.id) return respuesta({ error: "You can't delete your own account." }, 403)

    const { data: objetivo } = await admin
      .from('perfiles').select('id, roles, roles_anteriores').eq('id', userId).maybeSingle()

    if (objetivo) {
      if (!puedeGestionar(quien.roles, rolesEfectivos(objetivo))) {
        return respuesta({ error: "You don't have permission to delete this person." }, 403)
      }
    } else if (!quien.roles.includes('staff_admin')) {
      return respuesta({ error: "You don't have permission to delete this account." }, 403)
    }

    const { error: errLimpieza } = await admin.rpc('limpiar_usuario', { uid: userId })
    if (errLimpieza) return respuesta({ error: errLimpieza.message }, 400)

    const { error: errAuth } = await admin.auth.admin.deleteUser(userId)
    if (errAuth) return respuesta({ error: errAuth.message }, 400)

    await vaciarCarpeta(admin, 'entregas', userId)
    await vaciarCarpeta(admin, 'fotos-clase', userId)
    await vaciarCarpeta(admin, 'archivos', userId)
    await vaciarCarpeta(admin, 'archivos', `entregas/${userId}`)

    return respuesta({ success: true })
  } catch (error) {
    return respuesta({ error: (error as { message?: string })?.message || 'Unknown error' }, 400)
  }
})