import { clienteAdmin } from './permisos.ts'

const enc = new TextEncoder()
const dec = new TextDecoder()

function aBytes(b64: string) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function aB64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

async function llave() {
  const raw = Deno.env.get('PASSWORD_KEY')
  if (!raw) throw new Error('PASSWORD_KEY is not set.')
  const bytes = aBytes(raw)
  if (bytes.length !== 32) throw new Error('PASSWORD_KEY must be 32 bytes.')
  return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function cifrar(texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await llave(), enc.encode(texto))
  return `${aB64(iv)}.${aB64(new Uint8Array(cifrado))}`
}

export async function descifrar(valor: string): Promise<string> {
  const [iv, datos] = valor.split('.')
  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: aBytes(iv) }, await llave(), aBytes(datos)
  )
  return dec.decode(claro)
}

// Guarda la contraseña cifrada. Devuelve false si no pudo, sin romper lo que se estaba haciendo.
export async function guardarPassword(
  admin: ReturnType<typeof clienteAdmin>, userId: string, password: string
): Promise<boolean> {
  try {
    const cifrada = await cifrar(password)
    const { error } = await admin.from('credenciales_visibles').upsert(
      { user_id: userId, cifrada, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    return !error
  } catch (_e) {
    return false
  }
}