'use client'

import { useState, useEffect, useCallback } from 'react'

export interface GeminiStatus {
  status: 'checking' | 'online' | 'offline' | 'key-missing'
  configured: boolean
  keyPreview: string | null
  model: string | null
  supportedModels?: string[]
}

export function useGeminiStatus(
  userEmail?: string | null,
  userRole?: string | null
): GeminiStatus {
  const [geminiState, setGeminiState] = useState<GeminiStatus>({
    status: 'checking',
    configured: false,
    keyPreview: null,
    model: null,
    supportedModels: [],
  })

  const checkStatus = useCallback(async () => {
    if (!userEmail) {
      setGeminiState({
        status: 'offline',
        configured: false,
        keyPreview: null,
        model: null,
        supportedModels: [],
      })
      return
    }

    try {
      const headers: Record<string, string> = {
        'x-user-email': userEmail,
      }
      if (userRole) {
        headers['x-user-role'] = userRole
      }

      const res = await fetch('/api/dev/gemini/status', {
        method: 'GET',
        headers,
        cache: 'no-store',
      })

      if (!res.ok) {
        setGeminiState({
          status: 'offline',
          configured: false,
          keyPreview: null,
          model: null,
          supportedModels: [],
        })
        return
      }

      const data = await res.json()
      if (data.configured) {
        setGeminiState({
          status: 'online',
          configured: true,
          keyPreview: data.key_preview ?? null,
          model: data.model ?? null,
          supportedModels: data.supported_models ?? [],
        })
      } else {
        setGeminiState({
          status: 'key-missing',
          configured: false,
          keyPreview: null,
          model: data.model ?? null,
          supportedModels: data.supported_models ?? [],
        })
      }
    } catch {
      setGeminiState({
        status: 'offline',
        configured: false,
        keyPreview: null,
        model: null,
        supportedModels: [],
      })
    }
  }, [userEmail, userRole])

  useEffect(() => {
    if (!userEmail) {
      setGeminiState({
        status: 'offline',
        configured: false,
        keyPreview: null,
        model: null,
      })
      return
    }

    checkStatus()
    const interval = setInterval(checkStatus, 60_000)

    return () => clearInterval(interval)
  }, [checkStatus, userEmail, userRole])

  return geminiState
}
