'use client'

import { useState, useEffect } from 'react'
import { AdtEvent } from '@/types'
import { subscribeToAdtEvents } from '@/lib/services/adtService'

export function useAdtEvents(patientId: string): {
  events: AdtEvent[]
  loading: boolean
  error: string | null
} {
  const [events, setEvents] = useState<AdtEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) {
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToAdtEvents(patientId, (data) => {
        // Sort returned events by createdAt descending (most recent first)
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA
        })
        setEvents(sorted)
        setLoading(false)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load ADT events')
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [patientId])

  return { events, loading, error }
}
