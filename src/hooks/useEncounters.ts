'use client'

import { useState, useEffect } from 'react'
import { Encounter } from '@/types'
import { subscribeToEncounters } from '@/lib/services/encounterService'
import { useAppStore } from '@/store/useAppStore'

export function useEncounters(patientId: string): {
  encounters: Encounter[]
  loading: boolean
  error: string | null
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId || !patientId) {
      setEncounters([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToEncounters(hospitalId, patientId, (data) => {
        // Sort by visitDate descending — most recent first
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.visitDate || a.createdAt || 0).getTime()
          const timeB = new Date(b.visitDate || b.createdAt || 0).getTime()
          return timeB - timeA
        })
        setEncounters(sorted)
        setLoading(false)
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load encounters'
      setError(message)
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [hospitalId, patientId])

  return { encounters, loading, error }
}
