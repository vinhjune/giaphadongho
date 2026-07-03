/**
 * CLI script to create a user with a PBKDF2-hashed password.
 * Usage: npx tsx packages/api/src/db/create-user.ts --username admin --password secret --role editor
 * Then copy the printed SQL and run:
 *   npx wrangler d1 execute giapha-db --local --command "<SQL>"
 *   npx wrangler d1 execute giapha-db --remote --command "<SQL>"
 */
import { webcrypto } from 'node:crypto'

const args = process.argv.slice(2)
const get = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null }

const username = get('--username') ?? 'admin'
const password = get('--password') ?? (() => { throw new Error('--password is required') })()
const role     = (get('--role') ?? 'editor') as 'editor' | 'viewer'

const subtle = webcrypto.subtle as SubtleCrypto
const getRandomValues = webcrypto.getRandomValues.bind(webcrypto) as typeof crypto.getRandomValues

async function hashPassword(pw: string): Promise<string> {
  const salt = getRandomValues(new Uint8Array(16))
  const key = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256)
  const toHex = (b: Uint8Array) => Array.from(b).map(n => n.toString(16).padStart(2, '0')).join('')
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`
}

;(async () => {
  const hash = await hashPassword(password)
  const id = webcrypto.randomUUID()
  console.log('\nRun this SQL against your D1 database:\n')
  console.log(`INSERT INTO users (id, username, password_hash, role, is_active) VALUES ('${id}', '${username}', '${hash}', '${role}', 1);`)
  console.log()
})()
