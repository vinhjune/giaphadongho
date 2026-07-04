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
  fatherId: string     // UUID or ''
  motherId: string
  // family fields (filled when type=family, empty when type=person)
  parent1Id: string
  parent2Id: string
  orderP1: string      // number
  orderP2: string
  marriedYear: string
  marriedMonth: string
  marriedDay: string
  marriedIsLunar: string
  endYear: string
  endMonth: string
  endDay: string
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
  // family columns
  'parent1Id', 'parent2Id', 'orderP1', 'orderP2',
  'marriedYear', 'marriedMonth', 'marriedDay', 'marriedIsLunar',
  'endYear', 'endMonth', 'endDay', 'status',
  // shared
  'notes',
  // user-link (person rows only)
  'username', 'userRole',
] as const

// Legacy sub-types for internal use (used by csv-export/import utilities)
export type CsvMemberRow = Pick<CsvUnifiedRow,
  'id' | 'name' | 'gender' | 'nickname' | 'bio' | 'address' | 'email' | 'phone' |
  'birthYear' | 'birthMonth' | 'birthDay' | 'birthIsLunar' |
  'deathYear' | 'deathMonth' | 'deathDay' | 'deathIsLunar' |
  'isAlive' | 'notes' | 'fatherId' | 'motherId'
>

export type CsvFamilyRow = Pick<CsvUnifiedRow,
  'id' | 'parent1Id' | 'parent2Id' | 'orderP1' | 'orderP2' |
  'marriedYear' | 'marriedMonth' | 'marriedDay' | 'marriedIsLunar' |
  'endYear' | 'endMonth' | 'endDay' | 'status' | 'notes'
>
