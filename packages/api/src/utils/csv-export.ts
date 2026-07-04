import Papa from 'papaparse'
import { UNIFIED_CSV_HEADERS } from '@giapha/shared/csv-schema'
import type { CsvUnifiedRow } from '@giapha/shared/csv-schema'

type PersonRow = {
  id: string; name: string; gender: string | null; nickname: string | null
  bio: string | null; address: string | null; email: string | null; phone: string | null
  birthYear: number | null; birthMonth: number | null; birthDay: number | null; birthIsLunar: boolean
  deathYear: number | null; deathMonth: number | null; deathDay: number | null; deathIsLunar: boolean
  isAlive: boolean; notes: string | null; fatherId: string | null; motherId: string | null
}

type FamilyRow = {
  id: string; parent1Id: string | null; parent2Id: string | null; orderP1: number; orderP2: number
  marriedYear: number | null; marriedMonth: number | null; marriedDay: number | null; marriedIsLunar: boolean
  endYear: number | null; endMonth: number | null; endDay: number | null
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
    notes: nullToEmpty(p.notes),
    parent1Id: '', parent2Id: '', orderP1: '', orderP2: '',
    marriedYear: '', marriedMonth: '', marriedDay: '', marriedIsLunar: '',
    endYear: '', endMonth: '', endDay: '', status: '',
  }
}

function familyToUnifiedRow(f: FamilyRow): CsvUnifiedRow {
  return {
    type: 'family', id: f.id,
    name: '', gender: '', nickname: '', bio: '', address: '', email: '', phone: '',
    birthYear: '', birthMonth: '', birthDay: '', birthIsLunar: '',
    deathYear: '', deathMonth: '', deathDay: '', deathIsLunar: '',
    isAlive: '', fatherId: '', motherId: '',
    parent1Id: nullToEmpty(f.parent1Id), parent2Id: nullToEmpty(f.parent2Id),
    orderP1: nullToEmpty(f.orderP1), orderP2: nullToEmpty(f.orderP2),
    marriedYear: nullToEmpty(f.marriedYear), marriedMonth: nullToEmpty(f.marriedMonth),
    marriedDay: nullToEmpty(f.marriedDay), marriedIsLunar: nullToEmpty(f.marriedIsLunar),
    endYear: nullToEmpty(f.endYear), endMonth: nullToEmpty(f.endMonth), endDay: nullToEmpty(f.endDay),
    status: nullToEmpty(f.status),
    notes: nullToEmpty(f.notes),
  }
}

export function serializeToUnifiedCsv(persons: PersonRow[], families: FamilyRow[]): string {
  const rows: CsvUnifiedRow[] = [
    ...persons.map(personToUnifiedRow),
    ...families.map(familyToUnifiedRow),
  ]
  return Papa.unparse(rows, { columns: [...UNIFIED_CSV_HEADERS] })
}
