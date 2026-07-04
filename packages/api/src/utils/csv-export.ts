import Papa from 'papaparse'
import { UNIFIED_CSV_HEADERS } from '@giapha/shared/csv-schema'
import type { CsvUnifiedRow } from '@giapha/shared/csv-schema'

type PersonRow = {
  id: string; name: string; gender: string | null; nickname: string | null
  bio: string | null; address: string | null; email: string | null; phone: string | null
  birthYear: number | null; birthMonth: number | null; birthDay: number | null; birthIsLunar: boolean
  deathYear: number | null; deathMonth: number | null; deathDay: number | null; deathIsLunar: boolean
  isAlive: boolean; notes: string | null; fatherId: string | null; motherId: string | null
  username: string | null; userRole: string | null
}

type FamilyRow = {
  id: string; fatherId: string | null; motherId: string | null; orderP1: number; orderP2: number
  status: string | null; notes: string | null
}

const nullToEmpty = (v: unknown): string =>
  v === null || v === undefined ? '' : typeof v === 'boolean' ? String(v) : String(v)

function personToUnifiedRow(p: PersonRow): CsvUnifiedRow {
  return {
    type: 'person', id: p.id,
    name: nullToEmpty(p.name), gender: nullToEmpty(p.gender),
    nickname: nullToEmpty(p.nickname), bio: nullToEmpty(p.bio),
    address: nullToEmpty(p.address), email: nullToEmpty(p.email), phone: nullToEmpty(p.phone),
    birthYear: nullToEmpty(p.birthYear), birthMonth: nullToEmpty(p.birthMonth), birthDay: nullToEmpty(p.birthDay),
    birthIsLunar: nullToEmpty(p.birthIsLunar),
    deathYear: nullToEmpty(p.deathYear), deathMonth: nullToEmpty(p.deathMonth), deathDay: nullToEmpty(p.deathDay),
    deathIsLunar: nullToEmpty(p.deathIsLunar),
    isAlive: nullToEmpty(p.isAlive),
    fatherId: nullToEmpty(p.fatherId), motherId: nullToEmpty(p.motherId),
    orderP1: '', orderP2: '', status: '',
    notes: nullToEmpty(p.notes),
    username: nullToEmpty(p.username), userRole: nullToEmpty(p.userRole),
  }
}

function familyToUnifiedRow(f: FamilyRow): CsvUnifiedRow {
  return {
    type: 'family', id: f.id,
    name: '', gender: '', nickname: '', bio: '', address: '', email: '', phone: '',
    birthYear: '', birthMonth: '', birthDay: '', birthIsLunar: '',
    deathYear: '', deathMonth: '', deathDay: '', deathIsLunar: '',
    isAlive: '',
    fatherId: nullToEmpty(f.fatherId), motherId: nullToEmpty(f.motherId),
    orderP1: nullToEmpty(f.orderP1), orderP2: nullToEmpty(f.orderP2),
    status: nullToEmpty(f.status),
    notes: nullToEmpty(f.notes),
    username: '', userRole: '',
  }
}

export function serializeToUnifiedCsv(persons: PersonRow[], families: FamilyRow[]): string {
  const rows: CsvUnifiedRow[] = [
    ...persons.map(personToUnifiedRow),
    ...families.map(familyToUnifiedRow),
  ]
  return Papa.unparse(rows, { columns: [...UNIFIED_CSV_HEADERS] })
}
