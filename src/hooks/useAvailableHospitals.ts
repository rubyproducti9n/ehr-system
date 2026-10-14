import { useEffect, useState } from 'react'
import { ref, get } from 'firebase/database'
import { db } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'

export interface HospitalOption {
  hospitalId: string
  hospitalCode: string
  role: string
  name: string
}

export function useAvailableHospitals(): {
  hospitals: HospitalOption[]
  loading: boolean
} {
  const { availableHospitals, currentUser } = useAppStore()
  const [hospitals, setHospitals] = useState<HospitalOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!availableHospitals || availableHospitals.length === 0) {
      setHospitals([])
      return
    }

    // Only fetch if more than one hospital — no need to fetch for single hospital users
    if (availableHospitals.length === 1) {
      // Still need name for the single hospital
      const fetchSingle = async () => {
        setLoading(true)
        try {
          const snap = await get(ref(db, `hospitals/${availableHospitals[0].hospitalId}/profile/name`))
          setHospitals([{
            ...availableHospitals[0],
            name: snap.val() ?? 'My Hospital',
          }])
        } catch {
          setHospitals([{
            ...availableHospitals[0],
            name: 'My Hospital',
          }])
        } finally {
          setLoading(false)
        }
      }
      fetchSingle()
      return
    }

    const fetchAll = async () => {
      setLoading(true)
      const results = await Promise.all(
        availableHospitals.map(async (h) => {
          try {
            const snap = await get(ref(db, `hospitals/${h.hospitalId}/profile/name`))
            return { ...h, name: snap.val() ?? `Hospital (${h.hospitalCode})` }
          } catch {
            return { ...h, name: `Hospital (${h.hospitalCode})` }
          }
        })
      )
      setHospitals(results)
      setLoading(false)
    }

    fetchAll()
  }, [availableHospitals])

  return { hospitals, loading }
}
