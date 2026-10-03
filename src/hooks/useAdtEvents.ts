'use client'

import { useState, useEffect } from 'react'
import { AdtEvent } from '@/types'
import { subscribeToAdtEvents } from '@/lib/services/adtService'
import { useAppStore } from '@/store/useAppStore'

export function useAdtEvents(patientId: string): {
  events: AdtEvent[]
  loading: boolean
  error: string | null
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [events, setEvents] = useState<AdtEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId || !patientId) {
      setEvents([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToAdtEvents(hospitalId, patientId, (data) => {
        // Sort returned events by createdAt descending (most recent first)
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA
        })
        setEvents(sorted)
        setLoading(false)
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load ADT events'
      setError(message)
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [hospitalId, patientId])

  return { events, loading, error }
}
