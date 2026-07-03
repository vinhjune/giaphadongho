import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { users } from '@giapha/shared/schema'
import { hashPassword } from './auth'
import type { Bindings } from '../types'

const KV_KEY = 'init:default_admin_seeded'

// Module-level flag: skip DB/KV on subsequent requests in the same Worker instance.
let checked = false

/**
 * Ensures a default admin user (username="admin", password="admin") exists.
 * Runs at most once per Worker instance; uses a KV flag to skip after first seed.
 * Idempotent: UNIQUE constraint on username prevents double-insert across concurrent instances.
 */
export async function ensureDefaultAdmin(env: Bindings): Promise<void> {
  if (checked) return
  checked = true

  try {
    // Fast KV check — avoids DB round-trip on every new instance after initial seed
    const seeded = await env.SESSIONS.get(KV_KEY)
    if (seeded) return

    const db = drizzle(env.giapha_db)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, 'admin'), eq(users.role, 'editor')))
      .get()

    if (!existing) {
      const passwordHash = await hashPassword('admin')
      await db.insert(users).values({
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash,
        role: 'editor',
        isActive: true,
      }).catch(() => {
        // Concurrent Worker instances may race here; UNIQUE constraint on username
        // will reject the duplicate — swallow safely.
      })
    }

    await env.SESSIONS.put(KV_KEY, '1')
  } catch {
    // Non-fatal: log but don't block the request if init fails
    console.error('[init] ensureDefaultAdmin failed')
  }
}
