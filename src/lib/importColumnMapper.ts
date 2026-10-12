import * as XLSX from 'xlsx'

export interface ColumnMapping {
  name: string | null
  specialty: string | null
  phone: string | null
  email: string | null
}

export interface ColumnDetectionConfidence {
  field: keyof ColumnMapping
  header: string | null
  confidence: 'exact' | 'fuzzy' | 'none'
}

export interface ParsedProvider {
  rowIndex: number
  raw: Record<string, string>
  mapped: {
    name: string
    specialty: string
    phone: string
    email: string
  }
  missingFields: string[]
  isComplete: boolean
}

export interface ImportParseResult {
  headers: string[]
  rows: Record<string, string>[]
  detectedMapping: ColumnMapping
  detectionConfidence: Record<keyof ColumnMapping, 'exact' | 'fuzzy' | 'none'>
  totalRows: number
  error: string | null
}

// Known aliases for each target field
const FIELD_ALIASES: Record<keyof ColumnMapping, string[]> = {
  name: [
    'name', 'full name', 'fullname', 'doctor name', 'dr name', 'dr. name',
    'physician', 'provider', 'doctor', 'consultant', 'staff name',
  ],
  specialty: [
    'specialty', 'specialization', 'speciality', 'specialisation',
    'department', 'dept', 'field', 'discipline', 'area', 'expertise',
  ],
  phone: [
    'phone', 'mobile', 'mob', 'contact', 'cell', 'phone no', 'phone number',
    'mobile no', 'mobile number', 'tel', 'telephone', 'contact no',
    'contact number', 'ph no', 'phno',
  ],
  email: [
    'email', 'email id', 'emailid', 'email address', 'mail',
    'e-mail', 'e mail', 'electronic mail',
  ],
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

function detectFieldForHeader(header: string): { field: keyof ColumnMapping; confidence: 'exact' | 'fuzzy' } | null {
  const norm = normalizeHeader(header)

  // Pass 1: exact match
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(norm)) return { field: field as keyof ColumnMapping, confidence: 'exact' }
  }

  // Pass 2: contains match
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (norm.includes(alias) || alias.includes(norm)) {
        return { field: field as keyof ColumnMapping, confidence: 'fuzzy' }
      }
    }
  }

  // Pass 3: Levenshtein similarity (threshold: distance <= 2)
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (levenshtein(norm, alias) <= 2) {
        return { field: field as keyof ColumnMapping, confidence: 'fuzzy' }
      }
    }
  }

  return null
}

export function detectColumnMapping(headers: string[]): {
  mapping: ColumnMapping
  confidence: Record<keyof ColumnMapping, 'exact' | 'fuzzy' | 'none'>
} {
  const mapping: ColumnMapping = {
    name: null,
    specialty: null,
    phone: null,
    email: null,
  }

  const confidence: Record<keyof ColumnMapping, 'exact' | 'fuzzy' | 'none'> = {
    name: 'none',
    specialty: 'none',
    phone: 'none',
    email: 'none',
  }

  for (const header of headers) {
    const result = detectFieldForHeader(header)
    if (result && mapping[result.field] === null) {
      mapping[result.field] = header // store original header name
      confidence[result.field] = result.confidence
    }
  }

  return { mapping, confidence }
}

export function parseFile(file: File): Promise<ImportParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: false,
        })

        if (raw.length === 0) {
          resolve({
            headers: [],
            rows: [],
            detectedMapping: { name: null, specialty: null, phone: null, email: null },
            detectionConfidence: { name: 'none', specialty: 'none', phone: 'none', email: 'none' },
            totalRows: 0,
            error: 'File is empty or has no data rows.',
          })
          return
        }

        if (raw.length > 400) {
          resolve({
            headers: [],
            rows: [],
            detectedMapping: { name: null, specialty: null, phone: null, email: null },
            detectionConfidence: { name: 'none', specialty: 'none', phone: 'none', email: 'none' },
            totalRows: raw.length,
            error: `File has ${raw.length} rows. Maximum allowed is 400.`,
          })
          return
        }

        const rows = raw.map(r =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k, String(v ?? '').trim()])
          )
        )
        const headers = Object.keys(rows[0] ?? {})
        const { mapping: detectedMapping, confidence: detectionConfidence } = detectColumnMapping(headers)

        resolve({ headers, rows, detectedMapping, detectionConfidence, totalRows: rows.length, error: null })
      } catch (err) {
        resolve({
          headers: [],
          rows: [],
          detectedMapping: { name: null, specialty: null, phone: null, email: null },
          detectionConfidence: { name: 'none', specialty: 'none', phone: 'none', email: 'none' },
          totalRows: 0,
          error: `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }

    reader.onerror = () => {
      resolve({
        headers: [],
        rows: [],
        detectedMapping: { name: null, specialty: null, phone: null, email: null },
        detectionConfidence: { name: 'none', specialty: 'none', phone: 'none', email: 'none' },
        totalRows: 0,
        error: 'Failed to read file.',
      })
    }

    reader.readAsArrayBuffer(file)
  })
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedProvider[] {
  const MANDATORY: (keyof ColumnMapping)[] = ['name', 'specialty', 'phone', 'email']

  return rows.map((row, index) => {
    const mapped = {
      name: mapping.name ? row[mapping.name] ?? '' : '',
      specialty: mapping.specialty ? row[mapping.specialty] ?? '' : '',
      phone: mapping.phone ? row[mapping.phone] ?? '' : '',
      email: mapping.email ? row[mapping.email] ?? '' : '',
    }

    const missingFields = MANDATORY.filter(f => !mapped[f].trim())

    return {
      rowIndex: index,
      raw: row,
      mapped,
      missingFields,
      isComplete: missingFields.length === 0,
    }
  })
}

export function exportFailedRowsAsCsv(
  failedProviders: ParsedProvider[],
  filename = 'failed-providers-import.csv'
): void {
  const rows = failedProviders.map(p => [
    p.mapped.name,
    p.mapped.specialty,
    p.mapped.phone,
    p.mapped.email,
  ])
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Specialty', 'Phone', 'Email'],
    ...rows,
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows')
  XLSX.writeFile(wb, filename)
}
