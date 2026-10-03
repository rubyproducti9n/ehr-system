'use client'

import { useState, useEffect } from 'react'
import { ref, onValue, Unsubscribe } from 'firebase/database'
import { db } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'

export interface HospitalSummary {
  hospitalId: string
  name: string
  hospitalCode: string
  address: string
  phone: string
  createdAt: string
  staffCount: number
  patientCount: number
  appointmentTodayCount?: number
}

export function useAllHospitals(): {
  hospitals: HospitalSummary[]
  totalHospitals: number
  totalPatients: number
  totalStaff: number
  totalAppointmentsToday: number
  loading: boolean
} {
  const userRole = useAppStore((state) => state.userRole)
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([])
  const [totalHospitals, setTotalHospitals] = useState(0)
  const [totalPatients, setTotalPatients] = useState(0)
  const [totalStaff, setTotalStaff] = useState(0)
  const [totalAppointmentsToday, setTotalAppointmentsToday] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userRole !== 'dev') {
      setHospitals([])
      setTotalHospitals(0)
      setTotalPatients(0)
      setTotalStaff(0)
      setTotalAppointmentsToday(0)
      setLoading(false)
      return
    }

    const hospitalsRef = ref(db, 'hospitals')
    const unsubscribe: Unsubscribe = onValue(
      hospitalsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setHospitals([])
          setTotalHospitals(0)
          setTotalPatients(0)
          setTotalStaff(0)
          setTotalAppointmentsToday(0)
          setLoading(false)
          return
        }

        const data = snapshot.val() as Record<string, Record<string, unknown>>
        const summaries: HospitalSummary[] = []
        let patientSum = 0
        let staffSum = 0
        let apptTodaySum = 0

        const todayStr = new Date().toISOString().split('T')[0]

        Object.entries(data).forEach(([hId, hData]) => {
          const profile = (hData?.profile as Record<string, unknown>) || {}
          const staffObj = (hData?.staff as Record<string, unknown>) || {}
          const patientsObj = (hData?.patients as Record<string, unknown>) || {}
          const apptsObj = (hData?.appointments as Record<string, unknown>) || {}

          const staffCount = Object.keys(staffObj).length
          const patientCount = Object.keys(patientsObj).length

          // Count appointments scheduled for today
          let apptToday = 0
          Object.values(apptsObj).forEach((appt) => {
            const scheduledDate = (appt as { scheduledDate?: string })?.scheduledDate
            if (scheduledDate && scheduledDate.startsWith(todayStr)) {
              apptToday++
            }
          })

          patientSum += patientCount
          staffSum += staffCount
          apptTodaySum += apptToday

          summaries.push({
            hospitalId: hId,
            name: (profile.name as string) || 'Unnamed Hospital',
            hospitalCode: (profile.hospitalCode as string) || '—',
            address: (profile.address as string) || '—',
            phone: (profile.phone as string) || '—',
            createdAt: (profile.createdAt as string) || '',
            staffCount,
            patientCount,
            appointmentTodayCount: apptToday,
          })
        })

        // Sort descending by registration date
        summaries.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return timeB - timeA
        })

        setHospitals(summaries)
        setTotalHospitals(summaries.length)
        setTotalPatients(patientSum)
        setTotalStaff(staffSum)
        setTotalAppointmentsToday(apptTodaySum)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching all hospitals in dev console:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userRole])

  return {
    hospitals,
    totalHospitals,
    totalPatients,
    totalStaff,
    totalAppointmentsToday,
    loading,
  }
}
