import { useEffect, useState } from 'react'
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database'
import db from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'
import { hasPermission } from '@/lib/roles'
import type { ActivityLog } from '@/types'

interface UseActivityLogsReturn {
  logs: ActivityLog[]
  loading: boolean
  error: string | null
}

export function useActivityLogs(limit = 200): UseActivityLogsReturn {
  const { hospitalId, userRole } = useAppStore()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId || !hasPermission(userRole, 'canViewActivityLog')) {
      setLoading(false)
      return
    }

    const logsRef = query(
      ref(db, `hospitals/${hospitalId}/activityLog`),
      orderByChild('timestamp'),
      limitToLast(limit),
    )

    const unsub = onValue(
      logsRef,
      (snap) => {
        if (!snap.exists()) {
          setLogs([])
          setLoading(false)
          return
        }
        const raw: ActivityLog[] = []
        snap.forEach((child) => {
          raw.push({ id: child.key!, ...child.val() })
        })
        // Sort newest first
        raw.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setLogs(raw)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [hospitalId, userRole, limit])

  return { logs, loading, error }
}
