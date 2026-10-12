import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

export type TranscriptionServerStatus = 'checking' | 'online' | 'offline'

export function useTranscriptionStatus(): TranscriptionServerStatus {
  const { hospitalId, currentUser } = useAppStore()
  const [serverStatus, setServerStatus] = useState<TranscriptionServerStatus>('checking')

  useEffect(() => {
    if (!hospitalId || !currentUser) return

    const check = async () => {
      try {
        const res = await fetch('/api/transcription/status', {
          headers: {
            'x-user-email': currentUser.email,
            'x-hospital-id': hospitalId,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        })
        const data = await res.json()
        setServerStatus(data.status === 'online' ? 'online' : 'offline')
      } catch {
        setServerStatus('offline')
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [hospitalId, currentUser])

  return serverStatus
}
