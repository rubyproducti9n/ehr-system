'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ref, get } from 'firebase/database'
import { db } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'
import { FeatureFlag } from '@/types'

export interface HospitalDbNode {
  hospitalId: string
  profile: {
    name: string
    hospitalCode: string
    createdAt: string
    superAdminUid: string
  }
  counts: {
    staff: number
    patients: number
    providers: number
    facilities: number
    appointments: number
    adtEvents: number
    labResults: number
    prescriptions: number
    documents: number
    encounters: number
    auditLog: number
    corrections: number
  }
  settings: {
    storageLocation: string | null
    extractionMode: string | null
  }
}

export interface DbExplorerData {
  hospitals: HospitalDbNode[]
  hospitalCodesCount: number
  hospitalCodes: Record<string, string>
  usersCount: number
  featureFlagsCount: number
  featureFlags: FeatureFlag[]
  fetchedAt: string
}

const EMPTY_DATA: DbExplorerData = {
  hospitals: [],
  hospitalCodesCount: 0,
  hospitalCodes: {},
  usersCount: 0,
  featureFlagsCount: 0,
  featureFlags: [],
  fetchedAt: '',
}

export function useDbExplorer() {
  const userRole = useAppStore((state) => state.userRole)
  const [data, setData] = useState<DbExplorerData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const countKeys = (obj: unknown): number => {
    if (!obj || typeof obj !== 'object') return 0
    return Object.keys(obj as Record<string, unknown>).length
  }

  const fetchExplorerData = useCallback(async () => {
    if (userRole !== 'dev') {
      setData(EMPTY_DATA)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setLoadingLogs(['> Connecting to Firebase...'])

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    try {
      await wait(300)
      if (!isMountedRef.current) return
      setLoadingLogs((prev) => [...prev, '> Reading /hospitals...'])

      const hospitalsSnap = await get(ref(db, 'hospitals'))

      await wait(300)
      if (!isMountedRef.current) return
      setLoadingLogs((prev) => [...prev, '> Reading /hospitalCodes...'])

      const codesSnap = await get(ref(db, 'hospitalCodes'))

      await wait(300)
      if (!isMountedRef.current) return
      setLoadingLogs((prev) => [...prev, '> Reading /users...'])

      const usersSnap = await get(ref(db, 'users'))

      await wait(300)
      if (!isMountedRef.current) return
      setLoadingLogs((prev) => [...prev, '> Reading /devConsole...'])

      const flagsSnap = await get(ref(db, 'devConsole/featureFlags'))

      await wait(300)
      if (!isMountedRef.current) return
      setLoadingLogs((prev) => [...prev, '> Building tree...'])

      // Process Hospitals
      const hospitalNodes: HospitalDbNode[] = []
      if (hospitalsSnap.exists()) {
        const hospitalsVal = hospitalsSnap.val() as Record<string, Record<string, unknown>>
        for (const [hospitalId, hData] of Object.entries(hospitalsVal)) {
          if (!hData || typeof hData !== 'object') continue

          const profileObj = (hData.profile as Record<string, unknown>) || {}
          const settingsObj = (hData.settings as Record<string, unknown>) || {}
          const devObj = (hData.dev as Record<string, unknown>) || {}

          hospitalNodes.push({
            hospitalId,
            profile: {
              name: String(profileObj.name || 'Unnamed Hospital'),
              hospitalCode: String(profileObj.hospitalCode || '—'),
              createdAt: String(profileObj.createdAt || ''),
              superAdminUid: String(profileObj.superAdminUid || ''),
            },
            counts: {
              staff: countKeys(hData.staff),
              patients: countKeys(hData.patients),
              providers: countKeys(hData.providers),
              facilities: countKeys(hData.facilities),
              appointments: countKeys(hData.appointments),
              adtEvents: countKeys(hData.adtEvents),
              labResults: countKeys(hData.labResults),
              prescriptions: countKeys(hData.prescriptions),
              documents: countKeys(hData.documents),
              encounters: countKeys(hData.encounters),
              auditLog: countKeys(devObj.auditLog),
              corrections: countKeys(devObj.corrections),
            },
            settings: {
              storageLocation: settingsObj.storageLocation
                ? String(settingsObj.storageLocation)
                : null,
              extractionMode: settingsObj.extractionMode
                ? String(settingsObj.extractionMode)
                : null,
            },
          })
        }
      }

      // Process Hospital Codes
      const codesVal = codesSnap.exists()
        ? (codesSnap.val() as Record<string, string>)
        : {}
      const hospitalCodesCount = countKeys(codesVal)

      // Process Users
      const usersCount = usersSnap.exists() ? countKeys(usersSnap.val()) : 0

      // Process Feature Flags
      const flagsVal = flagsSnap.exists()
        ? (flagsSnap.val() as Record<string, FeatureFlag>)
        : {}
      const featureFlags = Object.values(flagsVal)
      const featureFlagsCount = featureFlags.length

      const now = new Date()
      const formattedFetchedAt = now.toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }) + ' IST'

      await wait(300)
      if (!isMountedRef.current) return

      setData({
        hospitals: hospitalNodes,
        hospitalCodesCount,
        hospitalCodes: codesVal,
        usersCount,
        featureFlagsCount,
        featureFlags,
        fetchedAt: formattedFetchedAt,
      })
    } catch (err) {
      console.error('Error fetching explorer database data:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to read database tree')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [userRole])

  useEffect(() => {
    isMountedRef.current = true
    fetchExplorerData()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchExplorerData])

  return {
    data,
    loading,
    loadingLogs,
    error,
    refetch: fetchExplorerData,
  }
}
