import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { searchFrontend } from '@/lib/frontendSearch'
import { shouldUseBackendSearch } from '@/lib/utils'

export interface SearchResult {
  id: string
  type: 'patient' | 'provider' | 'facility'
  label: string
  sublabel: string
  href: string
  score: number
  source?: 'frontend' | 'backend'
}

export type SearchStatus =
  | 'idle'
  | 'searching-frontend'
  | 'searching-backend'
  | 'done'
  | 'error'
  | 'offline'

interface UseSearchReturn {
  results: SearchResult[]
  status: SearchStatus
  statusMessage: string
  isEmpty: boolean
  usedBackend: boolean
  search: (query: string) => void
}

export function useSearch(): UseSearchReturn {
  const { hospitalId, currentUser } = useAppStore()
  const { patients } = usePatients()
  const { providers } = useProviders()
  const { facilities } = useFacilities()

  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [usedBackend, setUsedBackend] = useState(false)

  const latestQueryRef = useRef<string>('')

  const search = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([])
      setStatus('idle')
      setStatusMessage('')
      setUsedBackend(false)
      return
    }

    latestQueryRef.current = query

    // Step 1 — frontend instant search
    setStatus('searching-frontend')
    setStatusMessage('Searching...')
    setUsedBackend(false)

    const frontendResults = searchFrontend(
      query,
      patients ?? [],
      providers ?? [],
      facilities ?? [],
    )

    // If query changed while we were processing, discard
    if (latestQueryRef.current !== query) return

    // Decide whether to also call backend
    const needsBackend = shouldUseBackendSearch(query, frontendResults.length)

    if (!needsBackend) {
      // Frontend results are sufficient
      setResults(frontendResults)
      setStatus('done')
      setStatusMessage(
        frontendResults.length === 0
          ? 'No results found'
          : `${frontendResults.length} result${frontendResults.length !== 1 ? 's' : ''}`
      )
      return
    }

    // Step 2 — backend semantic search
    // Show frontend results immediately while backend loads
    if (frontendResults.length > 0) {
      setResults(frontendResults)
    }

    setStatus('searching-backend')
    setStatusMessage(
      frontendResults.length > 0
        ? 'Finding matches...'
        : 'Searching records...'
    )

    if (!hospitalId || !currentUser) {
      setStatus('done')
      setResults(frontendResults)
      setStatusMessage(frontendResults.length === 0 ? 'No results found' : `${frontendResults.length} result${frontendResults.length !== 1 ? 's' : ''}`)
      return
    }

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
          'x-hospital-id': hospitalId,
        },
        body: JSON.stringify({ query: query.trim() }),
        signal: AbortSignal.timeout(60000),
      })

      if (latestQueryRef.current !== query) return

      if (!res.ok) {
        // Backend failed — use frontend results only
        setResults(frontendResults)
        setStatus('done')
        setStatusMessage(
          frontendResults.length === 0
            ? 'Smart search is currently unavailable'
            : `${frontendResults.length} result${frontendResults.length !== 1 ? 's' : ''}`
        )
        return
      }

      const data = await res.json()
      const backendResults: SearchResult[] = (data.results ?? []).map((r: any) => ({
        ...r,
        source: 'backend' as const,
      }))

      // Merge frontend and backend results
      // Deduplicate by id — prefer higher score
      const merged = new Map<string, SearchResult>()

      for (const r of frontendResults) {
        merged.set(r.id, r)
      }

      for (const r of backendResults) {
        const existing = merged.get(r.id)
        if (!existing || r.score > existing.score) {
          merged.set(r.id, r)
        }
      }

      const finalResults = Array.from(merged.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 11) // max 11 total results

      setResults(finalResults)
      setStatus('done')
      setUsedBackend(true)
      setStatusMessage(
        finalResults.length === 0
          ? 'No results found'
          : `${finalResults.length} result${finalResults.length !== 1 ? 's' : ''}`
      )

    } catch (err) {
      if (latestQueryRef.current !== query) return

      const message = err instanceof Error ? err.message : ''
      if (message.includes('abort') || message.includes('timeout')) {
        setStatus('done')
        setResults(frontendResults)
        setStatusMessage(
          frontendResults.length === 0
            ? 'Search took too long — please try again'
            : `${frontendResults.length} result${frontendResults.length !== 1 ? 's' : ''} (Search took too long)`
        )
      } else {
        setStatus('done')
        setResults(frontendResults)
        setStatusMessage(
          frontendResults.length === 0
            ? 'Smart search is currently unavailable'
            : `${frontendResults.length} result${frontendResults.length !== 1 ? 's' : ''}`
        )
      }
    }
  }, [hospitalId, currentUser, patients, providers, facilities])

  const isEmpty = status === 'done' && results.length === 0

  return { results, status, statusMessage, isEmpty, usedBackend, search }
}
