// API response types — PersonPublic omits sensitive fields shown only to viewer/editor

export type PersonPublic = {
  id: string
  name: string
  gender: 'male' | 'female' | 'other' | null
  nickname: string | null
  /** Derived from avatarKey + R2 public domain by the API layer */
  avatarUrl: string | null
  birthYear: number | null
  birthMonth: number | null
  birthDay: number | null
  birthIsLunar: boolean
  isAlive: boolean
  notes: string | null
}

export type PersonFull = PersonPublic & {
  bio: string | null
  address: string | null
  email: string | null
  phone: string | null
  deathYear: number | null
  deathMonth: number | null
  deathDay: number | null
  deathIsLunar: boolean
}

export type PersonWithParents = PersonFull & {
  fatherId: string | null
  motherId: string | null
  childOrder: number | null
  /** orderP1 values from all families where this person is parent1 or parent2 */
  spouseOrders: number[]
}

export type ChildMember = {
  personId:   string
  childOrder: number | null
}

export type Family = {
  id: string
  parent1Id: string | null
  parent2Id: string | null
  orderP1: number
  orderP2: number
  status: 'active' | 'divorced' | 'widowed' | null
  notes: string | null
  /** Children sorted by childOrder asc (nulls last) then birthYear asc */
  children: ChildMember[]
}

export type FamilyEvent = {
  id: string
  title: string
  description: string | null
  /** When set, takes display precedence over structured year/month/day fields */
  dateText: string | null
  year: number | null
  month: number | null
  day: number | null
  isLunar: boolean
  isRecurring: boolean
}

export type LandingData = {
  familyName: string
  introText: string
  foundedYear: string | null
  events: FamilyEvent[]
}

export type UserRole = 'editor' | 'viewer' | 'guest'

export type GraphNode =
  | { id: string; type: 'person'; data: PersonPublic | PersonFull; position: { x: number; y: number } }
  | { id: string; type: 'family'; data: { id: string }; position: { x: number; y: number } }

export type GraphEdge = {
  id: string
  source: string
  target: string
  type: 'parent-child' | 'marriage'
}
