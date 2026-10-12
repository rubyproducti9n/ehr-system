'use client'

import React, { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { isDeveloper } from '@/lib/devAccess'
import { useGeminiStatus } from '@/hooks/useGeminiStatus'
import { cn } from '@/lib/utils'

export interface ModelStatusBadgeProps {
  size?: 'sm' | 'md'
  showLabel?: boolean
  showGeminiStatus?: boolean
  hideLocalStatus?: boolean
}

type Status = 'checking' | 'online' | 'offline'

export function ModelStatusBadge({
  size = 'sm',
  showLabel = true,
  showGeminiStatus = false,
  hideLocalStatus = false,
}: ModelStatusBadgeProps) {
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const hospitalId = useAppStore((state) => state.hospitalId)
  const isFeatureVisible = useAppStore((state) => state.isFeatureVisible)
  const [status, setStatus] = useState<Status>('checking')

  const showLocal = !hideLocalStatus && isFeatureVisible('local_ai_extraction')
  const showGemini = (showGeminiStatus || hideLocalStatus) && isFeatureVisible('gemini_online_extraction')

  const email = currentUser?.email
  const developer = isDeveloper(email, userRole)
  const gemini = useGeminiStatus(email, userRole, hospitalId)

  useEffect(() => {
    if (!developer || !email) return

    let isMounted = true

    async function checkStatus() {
      try {
        const headers: Record<string, string> = {
          'x-user-email': email!,
          'x-hospital-id': hospitalId ?? '',
        }
        if (userRole) {
          headers['x-user-role'] = userRole
        }

        const res = await fetch('/api/dev/llm', {
          method: 'GET',
          headers,
        })

        if (!isMounted) return

        if (res.ok) {
          const data = await res.json()
          if (data.status === 'online' || data.status === 'ok') {
            setStatus('online')
          } else {
            setStatus('offline')
          }
        } else {
          setStatus('offline')
        }
      } catch {
        if (isMounted) {
          setStatus('offline')
        }
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 60_000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [developer, email])

  if (!developer && !hideLocalStatus) {
    return null
  }

  const dotSizeClasses = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
  const textSizeClasses = size === 'sm' ? 'text-xs' : 'text-sm'

  const geminiDotColor =
    gemini.status === 'online'
      ? 'bg-emerald-500'
      : gemini.status === 'key-missing'
      ? 'bg-amber-500'
      : gemini.status === 'offline'
      ? 'bg-rose-500'
      : 'bg-slate-400 animate-pulse'

  const geminiTextColor =
    gemini.status === 'online'
      ? 'text-emerald-700 dark:text-emerald-400'
      : gemini.status === 'key-missing'
      ? 'text-amber-700 dark:text-amber-400'
      : gemini.status === 'offline'
      ? 'text-rose-700 dark:text-rose-400'
      : 'text-muted-foreground'

  if (showGeminiStatus || hideLocalStatus) {
    // When showGeminiStatus is true / public analyse page:
    // Online: show nothing — when it works, show nothing. Clean interface.
    if (gemini.status === 'online') {
      return null
    }

    // Offline / not configured / checking: show small amber pill "Analysis service unavailable"
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          textSizeClasses
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        <span>Analysis service unavailable</span>
      </div>
    )
  }

  // When showGeminiStatus is false (local model badge in dev sandbox):
  // Online: "Connected" with green dot — no model name
  // Offline: "Unavailable" with red dot — no model name
  const isOnline = status === 'online'
  const isChecking = status === 'checking'

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 font-medium', textSizeClasses)}
      title={isOnline ? 'Connected' : isChecking ? 'Checking...' : 'Unavailable'}
    >
      <span className="relative flex items-center justify-center">
        {isOnline && (
          <span
            className={cn(
              'absolute inline-flex rounded-full bg-emerald-400 opacity-75 animate-ping',
              dotSizeClasses
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full',
            dotSizeClasses,
            isOnline
              ? 'bg-emerald-500'
              : isChecking
              ? 'bg-slate-400 animate-pulse'
              : 'bg-rose-500'
          )}
        />
      </span>

      {showLabel && (
        <span
          className={cn(
            isOnline
              ? 'text-emerald-700 dark:text-emerald-400'
              : isChecking
              ? 'text-muted-foreground'
              : 'text-rose-700 dark:text-rose-400'
          )}
        >
          {isOnline ? 'Connected' : isChecking ? 'Checking...' : 'Unavailable'}
        </span>
      )}
    </div>
  )
}
