'use client'

import { useState, useEffect } from 'react'
import { Appointment } from '@/types'
import { subscribeToAppointments } from '@/lib/services/appointmentService'

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const unsubscribe = subscribeToAppointments((data) => {
        setAppointments(data)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments')
      setLoading(false)
    }
  }, [])

  return { appointments, loading, error }
}
