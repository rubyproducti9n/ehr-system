'use client'

import { useState, useEffect, useCallback } from 'react'
import { StaffMember } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { hasPermission } from '@/lib/roles'
import { getHospitalStaff } from '@/lib/services/authService'

export function useHospitalStaff(): {
  staff: StaffMember[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const userRole = useAppStore((state) => state.userRole)

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaff = useCallback(async () => {
    if (!hospitalId || !hasPermission(userRole, 'canManageStaff')) {
      setStaff([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await getHospitalStaff(hospitalId)
      setStaff(data)
    } catch (err) {
      console.error('Failed to load hospital staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch staff members.')
    } finally {
      setLoading(false)
    }
  }, [hospitalId, userRole])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  return { staff, loading, error, refresh: fetchStaff }
}
