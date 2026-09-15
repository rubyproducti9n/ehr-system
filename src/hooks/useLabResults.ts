'use client'

import { useState, useEffect } from 'react'
import { LabResult } from '@/types'
import { subscribeToLabResults } from '@/lib/services/labResultService'

export function useLabResults(patientId: string): {
  results: LabResult[]
  loading: boolean
  error: string | null
} {
  const [results, setResults] = useState<LabResult[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToLabResults(patientId, (data) => {
        // Sort by resultDate descending — most recent first
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.resultDate || a.createdAt || 0).getTime()
          const timeB = new Date(b.resultDate || b.createdAt || 0).getTime()
          return timeB - timeA
        })
        setResults(sorted)
        setLoading(false)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load lab results')
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [patientId])

  return { results, loading, error }
}
