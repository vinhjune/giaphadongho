// Unified CSV row — one file, two row types: "person" and "family"
export interface CsvUnifiedRow {
  type: string         // 'person' | 'family'
  id: string
  // person fields (filled when type=person, empty when type=family)
  name: string
  gender: string       // 'male' | 'female' | 'other' | ''
  nickname: string
  bio: string
  address: string
  email: string
  phone: string
  birthYear: string    // number or ''
  birthMonth: string
  birthDay: string
  birthIsLunar: string // 'true' | 'false'
  deathYear: string
  deathMonth: string
  deathDay: string
  deathIsLunar: string
  isAlive: string      // 'true' | 'false'
  // fatherId/motherId: person rows = parent IDs; family rows = the couple (husband/wife)
  fatherId: string
  motherId: string
  // family-only fields (filled when type=family, empty when type=person)
  orderP1: string      // marriage order for this person within their families (1 = first marriage…)
  orderP2: string
  status: string       // 'active' | 'divorced' | 'widowed' | ''
  notes: string        // shared by both types
  // user-link columns (person rows only; empty for family rows)
  username: string     // linked user account username, or ''
  userRole: string     // 'editor' | 'viewer' | ''
}

export const UNIFIED_CSV_HEADERS: readonly (keyof CsvUnifiedRow)[] = [
  'type', 'id',
  // person columns
  'name', 'gender', 'nickname', 'bio', 'address', 'email', 'phone',
  'birthYear', 'birthMonth', 'birthDay', 'birthIsLunar',
  'deathYear', 'deathMonth', 'deathDay', 'deathIsLunar',
  'isAlive', 'fatherId', 'motherId',
  // family-only columns
  'orderP1', 'orderP2', 'status',
  // shared
  'notes',
  // user-link (person rows only)
  'username', 'userRole',
] as const

// Sub-types for csv-export/import utilities
export type CsvMemberRow = Pick<CsvUnifiedRow,
  'id' | 'name' | 'gender' | 'nickname' | 'bio' | 'address' | 'email' | 'phone' |
  'birthYear' | 'birthMonth' | 'birthDay' | 'birthIsLunar' |
  'deathYear' | 'deathMonth' | 'deathDay' | 'deathIsLunar' |
  'isAlive' | 'notes' | 'fatherId' | 'motherId'
>

// fatherId/motherId in CsvFamilyRow = the couple (maps to DB parent1Id/parent2Id)
export type CsvFamilyRow = Pick<CsvUnifiedRow,
  'id' | 'fatherId' | 'motherId' | 'orderP1' | 'orderP2' | 'status' | 'notes'
>
