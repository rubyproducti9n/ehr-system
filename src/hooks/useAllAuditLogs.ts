'use client'

import { useState, useEffect } from 'react'
import { ref, onValue, Unsubscribe } from 'firebase/database'
import { db } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'
import { ExtractionAuditLog } from '@/types'

export interface ConsoleAuditLogEntry extends ExtractionAuditLog {
  hospitalId: string
  hospitalName?: string
}

export function useAllAuditLogs(): {
  logs: ConsoleAuditLogEntry[]
  loading: boolean
} {
  const userRole = useAppStore((state) => state.userRole)
  const [logs, setLogs] = useState<ConsoleAuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userRole !== 'dev') {
      setLogs([])
      setLoading(false)
      return
    }

    const hospitalsRef = ref(db, 'hospitals')
    const unsubscribe: Unsubscribe = onValue(
      hospitalsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLogs([])
          setLoading(false)
          return
        }

        const data = snapshot.val() as Record<string, Record<string, unknown>>
        const combinedLogs: ConsoleAuditLogEntry[] = []

        Object.entries(data).forEach(([hId, hData]) => {
          const profile = (hData?.profile as Record<string, unknown>) || {}
          const devData = (hData?.dev as Record<string, unknown>) || {}
          const auditLogObj = (devData?.auditLog as Record<string, unknown>) || {}

          Object.entries(auditLogObj).forEach(([logId, logVal]) => {
            const entry = logVal as ExtractionAuditLog
            combinedLogs.push({
              ...entry,
              id: logId,
              hospitalId: hId,
              hospitalName: (profile.name as string) || hId,
            })
          })
        })

        // Sort descending by timestamp
        combinedLogs.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
          return timeB - timeA
        })

        // Return top 10
        setLogs(combinedLogs.slice(0, 10))
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching dev audit logs:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userRole])

  return { logs, loading }
}
