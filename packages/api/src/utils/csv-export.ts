import Papa from 'papaparse'
import { zipSync, strToU8 } from 'fflate'
import { MEMBER_CSV_HEADERS, FAMILY_CSV_HEADERS } from '@giapha/shared/csv-schema'

type PersonRow = {
  id: string; name: string; gender: string | null; nickname: string | null
  bio: string | null; address: string | null; email: string | null; phone: string | null
  birthYear: number | null; birthMonth: number | null; birthDay: number | null; birthIsLunar: boolean
  deathYear: number | null; deathMonth: number | null; deathDay: number | null; deathIsLunar: boolean
  isAlive: boolean; notes: string | null; fatherId: string | null; motherId: string | null
}

type FamilyRow = {
  id: string; parent1Id: string | null; parent2Id: string | null
  orderP1: number; orderP2: number
  marriedYear: number | null; marriedMonth: number | null; marriedDay: number | null; marriedIsLunar: boolean
  endYear: number | null; endMonth: number | null; endDay: number | null
  status: string | null; notes: string | null
}

const nullToEmpty = (v: unknown): string =>
  v === null || v === undefined ? '' : typeof v === 'boolean' ? String(v) : String(v)

export function serializeMembersToCsv(rows: PersonRow[]): string {
  return Papa.unparse({
    fields: [...MEMBER_CSV_HEADERS],
    data: rows.map(r => MEMBER_CSV_HEADERS.map(h => nullToEmpty(r[h as keyof PersonRow]))),
  })
}

export function serializeFamiliesToCsv(rows: FamilyRow[]): string {
  return Papa.unparse({
    fields: [...FAMILY_CSV_HEADERS],
    data: rows.map(r => FAMILY_CSV_HEADERS.map(h => nullToEmpty(r[h as keyof FamilyRow]))),
  })
}

export function buildExportZip(membersCSV: string, familiesCSV: string): Uint8Array {
  return zipSync({
    'members.csv': strToU8(membersCSV),
    'families.csv': strToU8(familiesCSV),
  })
}
