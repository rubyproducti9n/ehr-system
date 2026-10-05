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
  const isFeatureVisible = useAppStore((state) => state.isFeatureVisible)
  const [status, setStatus] = useState<Status>('checking')

  const showLocal = !hideLocalStatus && isFeatureVisible('local_ai_extraction')
  const showGemini = (showGeminiStatus || hideLocalStatus) && isFeatureVisible('gemini_online_extraction')

  const email = currentUser?.email
  const developer = isDeveloper(email, userRole)
  const gemini = useGeminiStatus(email, userRole)

  useEffect(() => {
    if (!developer || !email) return

    let isMounted = true

    async function checkStatus() {
      try {
        const headers: Record<string, string> = {
          'x-user-email': email!,
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

  const geminiLabel = hideLocalStatus
    ? gemini.status === 'online'
      ? 'Cloud AI: Connected'
      : gemini.status === 'key-missing'
      ? 'Cloud AI: Not Configured'
      : gemini.status === 'offline'
      ? 'Cloud AI: Unavailable'
      : 'Cloud AI: Checking...'
    : gemini.status === 'online'
    ? 'Gemini: Ready'
    : gemini.status === 'key-missing'
    ? 'Gemini: No Key'
    : gemini.status === 'offline'
    ? 'Gemini: Offline'
    : 'Gemini: Checking...'

  const geminiBadge = (
    <div
      className={cn('inline-flex items-center gap-1.5 font-medium', textSizeClasses)}
      title={geminiLabel}
    >
      <span className="relative flex items-center justify-center">
        {gemini.status === 'online' && (
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
            geminiDotColor
          )}
        />
      </span>

      {showLabel && <span className={geminiTextColor}>{geminiLabel}</span>}
    </div>
  )

  const localBadge = (
    <div
      className={cn('inline-flex items-center gap-1.5 font-medium', textSizeClasses)}
      title={
        status === 'online'
          ? 'Local AI Model is online'
          : status === 'offline'
          ? 'Local AI Model is offline'
          : 'Checking Local AI status...'
      }
    >
      <span className="relative flex items-center justify-center">
        {status === 'online' && (
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
            status === 'online'
              ? 'bg-emerald-500'
              : status === 'offline'
              ? 'bg-rose-500'
              : 'bg-slate-400 animate-pulse'
          )}
        />
      </span>

      {showLabel && (
        <span
          className={cn(
            status === 'online'
              ? 'text-emerald-700 dark:text-emerald-400'
              : status === 'offline'
              ? 'text-rose-700 dark:text-rose-400'
              : 'text-muted-foreground'
          )}
        >
          {showGeminiStatus
            ? status === 'online'
              ? 'Local AI: Online'
              : status === 'offline'
              ? 'Local AI: Offline'
              : 'Local AI: Checking...'
            : status === 'online'
            ? 'AI Online'
            : status === 'offline'
            ? 'AI Offline'
            : 'Checking...'}
        </span>
      )}
    </div>
  )

  if (showLocal && showGemini) {
    return (
      <div className="inline-flex items-center gap-2">
        {localBadge}
        <span className="h-3.5 w-px bg-border" />
        {geminiBadge}
      </div>
    )
  }

  if (showLocal) {
    return localBadge
  }

  if (showGemini) {
    return geminiBadge
  }

  return null
}
