'use client'

import { useState, useEffect } from 'react'
import { Facility } from '@/types'
import { subscribeToFacilities } from '@/lib/services/facilityService'

export function useFacilities(): {
  facilities: Facility[]
  loading: boolean
  error: string | null
} {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToFacilities((data) => {
        setFacilities(data)
        setLoading(false)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load facilities')
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  return { facilities, loading, error }
}
