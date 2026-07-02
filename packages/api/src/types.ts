import type { UserContext } from './middleware/require-auth'

export type Bindings = {
  giapha_db: D1Database
  SESSIONS: KVNamespace
  giapha_avatars: R2Bucket
  JWT_SECRET: string
}

export type HonoEnv = {
  Bindings: Bindings
  Variables: { user: UserContext }
}
