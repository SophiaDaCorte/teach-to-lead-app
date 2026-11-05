// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let userIdCreado: string | null = null

  try {
    const { nombre, titulo, roles, email, password, comunidad, nivel, telefono } = await req.json()
    const emailLimpio = String(email || '').trim().toLowerCase()
    const listaRoles = roles && roles.length > 0 ? roles : ['estudiante']
    const esEstudiante = listaRoles.includes('estudiante')

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLimpio,
      password,
      email_confirm: true,
    })
    if (authError) throw authError

    userIdCreado = authData.user.id

    const { error: perfilError } = await supabaseAdmin.from('perfiles').upsert(
      {
        id: userIdCreado,
        nombre,
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
      const { error: horasError } = await supabaseAdmin.from('horas').insert({
        user_id: userIdCreado,
        content_hrs: 0,
        meeting_hrs: 0,
      })
      if (horasError) throw horasError
    }

    return respuesta({ success: true, userId: userIdCreado })
  } catch (error) {
    // Rollback: si algo falló, no dejar el usuario huérfano en Authentication
    if (userIdCreado) {
      await supabaseAdmin.from('horas').delete().eq('user_id', userIdCreado)
      await supabaseAdmin.from('perfiles').delete().eq('id', userIdCreado)
      await supabaseAdmin.auth.admin.deleteUser(userIdCreado)
    }
    const mensaje = (error as { message?: string })?.message || 'Unknown error'
    return respuesta({ error: mensaje }, 400)
  }
})