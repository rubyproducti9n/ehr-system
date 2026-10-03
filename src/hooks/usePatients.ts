'use client'

import { useState, useEffect } from 'react'
import { Patient } from '@/types'
import { subscribeToPatients } from '@/lib/services/patientService'
import { useAppStore } from '@/store/useAppStore'

export function usePatients(): {
  patients: Patient[]
  loading: boolean
  error: string | null
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId) {
      setPatients([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToPatients(hospitalId, (data) => {
        setPatients(data)
        setLoading(false)
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load patients'
      setError(message)
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [hospitalId])

  return { patients, loading, error }
}
