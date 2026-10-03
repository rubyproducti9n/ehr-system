'use client'

import { useState, useEffect } from 'react'
import { Appointment } from '@/types'
import { subscribeToAppointments } from '@/lib/services/appointmentService'
import { useAppStore } from '@/store/useAppStore'

export function useAppointments() {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId) {
      setAppointments([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeToAppointments(hospitalId, (data) => {
        setAppointments(data)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments')
      setLoading(false)
    }
  }, [hospitalId])

  return { appointments, loading, error }
}
