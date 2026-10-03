'use client'

import { useState, useEffect } from 'react'
import { Facility } from '@/types'
import { subscribeToFacilities } from '@/lib/services/facilityService'
import { useAppStore } from '@/store/useAppStore'

export function useFacilities(): {
  facilities: Facility[]
  loading: boolean
  error: string | null
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId) {
      setFacilities([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToFacilities(hospitalId, (data) => {
        setFacilities(data)
        setLoading(false)
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load facilities'
      setError(message)
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [hospitalId])

  return { facilities, loading, error }
}
