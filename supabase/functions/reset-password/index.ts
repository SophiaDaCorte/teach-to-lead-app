import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders, respuesta, clienteAdmin, identificar, rolesEfectivos, puedeGestionar,
} from '../_shared/permisos.ts'
import { guardarPassword } from '../_shared/cifrado.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = clienteAdmin()

  try {
    const quien = await identificar(req, admin)
    if (!quien) return respuesta({ error: 'You must be signed in as staff to do this.' }, 401)

    const { userId, password, soloGuardar } = await req.json()
    if (!userId) return respuesta({ error: 'Missing user.' }, 400)
    if (typeof password !== 'string' || password.trim().length < 8) {
      return respuesta({ error: 'The password must be at least 8 characters.' }, 400)
    }
    const nueva = password.trim()

    // Tu propia contraseña: ya la cambiaste desde tu sesión. Aquí solo se guarda la copia
    // cifrada, después de comprobar que esa contraseña de verdad funciona en tu cuenta.
    if (soloGuardar) {
      if (userId !== quien.id) {
        return respuesta({ error: 'This option is only for your own account.' }, 403)
      }
      const { data: u } = await admin.auth.admin.getUserById(userId)
      const email = u?.user?.email
      if (!email) return respuesta({ error: 'This account has no login email.' }, 400)

      const anon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const { error: errLogin } = await anon.auth.signInWithPassword({ email, password: nueva })
      if (errLogin) return respuesta({ error: "That password doesn't match your account." }, 400)

      const guardada = await guardarPassword(admin, userId, nueva)
      return respuesta({ success: true, guardada })
    }

    // Contraseña de otra persona
    const { data: objetivo } = await admin
      .from('perfiles').select('id, roles, roles_anteriores').eq('id', userId).maybeSingle()
    if (!objetivo || !puedeGestionar(quien.roles, rolesEfectivos(objetivo))) {
      return respuesta({ error: "You don't have permission to reset this password." }, 403)
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password: nueva })
    if (error) return respuesta({ error: error.message }, 400)

    const guardada = await guardarPassword(admin, userId, nueva)
    return respuesta({ success: true, guardada })
  } catch (error) {
    return respuesta({ error: (error as { message?: string })?.message || 'Unknown error' }, 400)
  }
})