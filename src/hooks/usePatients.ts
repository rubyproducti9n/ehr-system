'use client'

import { useState, useEffect } from 'react'
import { Patient } from '@/types'
import { subscribeToPatients } from '@/lib/services/patientService'

export function usePatients(): {
  patients: Patient[]
  loading: boolean
  error: string | null
} {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToPatients((data) => {
        setPatients(data)
        setLoading(false)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load patients')
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  return { patients, loading, error }
}
