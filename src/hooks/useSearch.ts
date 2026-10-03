'use client'

import { useMemo } from 'react'
import { User, Stethoscope, Building2, LucideIcon } from 'lucide-react'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'

export interface SearchResult {
  id: string
  type: 'patient' | 'provider' | 'facility'
  label: string // primary display text
  sublabel: string // secondary display text
  href: string // navigation target on select
  icon: LucideIcon
}

export function useSearch(query: string): {
  results: SearchResult[]
  isEmpty: boolean
} {
  const { patients } = usePatients()
  const { providers } = useProviders()
  const { facilities } = useFacilities()

  const trimmedQuery = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (trimmedQuery.length < 2) return []

    // 1. Patient match (max 5)
    const patientMatches: SearchResult[] = []
    for (const patient of patients) {
      if (patient.name && patient.name.toLowerCase().includes(trimmedQuery)) {
        patientMatches.push({
          id: patient.id,
          type: 'patient',
          label: patient.name,
          sublabel: `Patient · ${patient.status ? patient.status.charAt(0).toUpperCase() + patient.status.slice(1) : 'Active'}`,
          href: `/patients/${patient.id}`,
          icon: User,
        })
        if (patientMatches.length >= 5) break
      }
    }

    // 2. Provider match (max 3)
    const providerMatches: SearchResult[] = []
    for (const provider of providers) {
      const nameMatch = provider.name && provider.name.toLowerCase().includes(trimmedQuery)
      const specMatch = provider.specialty && provider.specialty.toLowerCase().includes(trimmedQuery)
      if (nameMatch || specMatch) {
        providerMatches.push({
          id: provider.id,
          type: 'provider',
          label: provider.name,
          sublabel: provider.specialty || 'Provider',
          href: '/providers',
          icon: Stethoscope,
        })
        if (providerMatches.length >= 3) break
      }
    }

    // 3. Facility match (max 3)
    const facilityMatches: SearchResult[] = []
    for (const facility of facilities) {
      const nameMatch = facility.name && facility.name.toLowerCase().includes(trimmedQuery)
      const addrMatch = facility.address && facility.address.toLowerCase().includes(trimmedQuery)
      if (nameMatch || addrMatch) {
        facilityMatches.push({
          id: facility.id,
          type: 'facility',
          label: facility.name,
          sublabel: facility.address || 'Hospital',
          href: '/facilities',
          icon: Building2,
        })
        if (facilityMatches.length >= 3) break
      }
    }

    return [...patientMatches, ...providerMatches, ...facilityMatches]
  }, [patients, providers, facilities, trimmedQuery])

  const isEmpty = trimmedQuery.length >= 2 && results.length === 0

  return { results, isEmpty }
}
