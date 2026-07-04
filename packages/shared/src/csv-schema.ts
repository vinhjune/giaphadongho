export interface CsvMemberRow {
  id: string
  name: string
  gender: string        // 'male' | 'female' | 'other' | ''
  nickname: string
  bio: string
  address: string
  email: string
  phone: string
  birthYear: string     // number or ''
  birthMonth: string
  birthDay: string
  birthIsLunar: string  // 'true' | 'false'
  deathYear: string
  deathMonth: string
  deathDay: string
  deathIsLunar: string
  isAlive: string       // 'true' | 'false'
  notes: string
  fatherId: string      // UUID or ''
  motherId: string
}

export interface CsvFamilyRow {
  id: string
  parent1Id: string
  parent2Id: string
  orderP1: string       // number
  orderP2: string
  marriedYear: string
  marriedMonth: string
  marriedDay: string
  marriedIsLunar: string
  endYear: string
  endMonth: string
  endDay: string
  status: string        // 'active' | 'divorced' | 'widowed' | ''
  notes: string
}

export const MEMBER_CSV_HEADERS: readonly (keyof CsvMemberRow)[] = [
  'id', 'name', 'gender', 'nickname', 'bio', 'address', 'email', 'phone',
  'birthYear', 'birthMonth', 'birthDay', 'birthIsLunar',
  'deathYear', 'deathMonth', 'deathDay', 'deathIsLunar',
  'isAlive', 'notes', 'fatherId', 'motherId',
] as const

export const FAMILY_CSV_HEADERS: readonly (keyof CsvFamilyRow)[] = [
  'id', 'parent1Id', 'parent2Id', 'orderP1', 'orderP2',
  'marriedYear', 'marriedMonth', 'marriedDay', 'marriedIsLunar',
  'endYear', 'endMonth', 'endDay', 'status', 'notes',
] as const
