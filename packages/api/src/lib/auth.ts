import { SignJWT, jwtVerify } from 'jose'

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  // 7 days

// ─── Password hashing (SubtleCrypto PBKDF2 — runs within Workers CPU budget) ──

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    key, 256
  )
  const toHex = (buf: Uint8Array) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHex] = stored.split(':')
  if (!saltHex || !expectedHex) return false
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    key, 256
  )
  const actualHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  // Constant-time comparison via XOR to prevent timing attacks
  if (actualHex.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

// ─── JWT (jose uses Web Crypto — no Node.js dependency) ───────────────────────

type TokenPayload = {
  sub: string
  username: string
  role: 'editor' | 'viewer'
  sessionId: string
}

function importJWTKey(secret: string) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  )
}

export async function signToken(secret: string, payload: TokenPayload): Promise<string> {
  const key = await importJWTKey(secret)
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .setIssuedAt()
    .sign(key)
}

export async function verifyToken(secret: string, token: string): Promise<TokenPayload> {
  const key = await importJWTKey(secret)
  const { payload } = await jwtVerify(token, key)
  return payload as unknown as TokenPayload
}
