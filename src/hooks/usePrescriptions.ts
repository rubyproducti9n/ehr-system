'use client'

import { useState, useEffect } from 'react'
import { Prescription } from '@/types'
import { subscribeToPrescriptions } from '@/lib/services/prescriptionService'
import { useAppStore } from '@/store/useAppStore'

export function usePrescriptions(patientId: string): {
  prescriptions: Prescription[]
  loading: boolean
  error: string | null
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId || !patientId) {
      setPrescriptions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToPrescriptions(hospitalId, patientId, (data) => {
        // Sort by prescribedDate descending — most recent first
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.prescribedDate || a.createdAt || 0).getTime()
          const timeB = new Date(b.prescribedDate || b.createdAt || 0).getTime()
          return timeB - timeA
        })
        setPrescriptions(sorted)
        setLoading(false)
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load prescriptions'
      setError(message)
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [hospitalId, patientId])

  return { prescriptions, loading, error }
}
