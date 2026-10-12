import type { Patient } from '@/types'
import type { Provider } from '@/types'

export interface FrontendSearchResult {
  id: string
  type: 'patient' | 'provider' | 'facility'
  label: string
  sublabel: string
  href: string
  score: number
  source: 'frontend'
}

function normalize(str: string): string {
  return str.toLowerCase().trim()
}

function scoreMatch(haystack: string, needle: string): number {
  const h = normalize(haystack)
  const n = normalize(needle)
  if (h === n) return 1.0
  if (h.startsWith(n)) return 0.95
  if (h.includes(n)) return 0.85
  // Word boundary match — any word in haystack starts with needle
  const words = h.split(/\s+/)
  if (words.some(w => w.startsWith(n))) return 0.80
  return 0
}

export function searchFrontend(
  query: string,
  patients: Patient[],
  providers: any[],
  facilities: any[],
): FrontendSearchResult[] {
  if (!query || query.trim().length < 2) return []

  const q = query.trim()
  const results: FrontendSearchResult[] = []

  // Search patients
  for (const patient of patients) {
    const nameScore = scoreMatch(patient.name, q)
    const idScore = patient.id.toLowerCase().startsWith(q.toLowerCase()) ? 0.7 : 0

    const best = Math.max(nameScore, idScore)
    if (best > 0) {
      results.push({
        id: patient.id,
        type: 'patient',
        label: patient.name,
        sublabel: `Patient · ${patient.status}`,
        href: `/patients/${patient.id}`,
        score: best,
        source: 'frontend',
      })
    }
  }

  // Search providers
  for (const provider of providers) {
    const nameScore = scoreMatch(provider.name, q)
    const specialtyScore = scoreMatch(provider.specialty ?? '', q)
    const emailScore = normalize(provider.email ?? '').includes(normalize(q)) ? 0.65 : 0

    const best = Math.max(nameScore, specialtyScore, emailScore)
    if (best > 0) {
      results.push({
        id: provider.id,
        type: 'provider',
        label: provider.name,
        sublabel: provider.specialty ?? 'Provider',
        href: '/providers',
        score: best,
        source: 'frontend',
      })
    }
  }

  // Search facilities
  for (const facility of facilities) {
    const nameScore = scoreMatch(facility.name ?? '', q)
    const addressScore = scoreMatch(facility.address ?? '', q)

    const best = Math.max(nameScore, addressScore)
    if (best > 0) {
      results.push({
        id: facility.id,
        type: 'facility',
        label: facility.name,
        sublabel: facility.address ?? 'Hospital',
        href: '/hospitals',
        score: best,
        source: 'frontend',
      })
    }
  }

  // Sort by score descending, cap at 5 patients + 3 providers + 3 facilities
  results.sort((a, b) => b.score - a.score)

  const capped: FrontendSearchResult[] = []
  const counts: Record<string, number> = {}
  const limits: Record<string, number> = { patient: 5, provider: 3, facility: 3 }

  for (const r of results) {
    const count = counts[r.type] ?? 0
    if (count < (limits[r.type] ?? 3)) {
      capped.push(r)
      counts[r.type] = count + 1
    }
  }

  return capped
}
