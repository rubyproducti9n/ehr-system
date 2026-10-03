'use client'

import { useState, useEffect, useCallback } from 'react'

export interface BackendHealth {
  status: 'checking' | 'online' | 'offline'
  modelName: string | null
  gpuLayers: number | null
  lastChecked: Date | null
  ocrReady: boolean
  checkHealth: () => Promise<void>
}

export function useBackendHealth(userEmail: string, userRole?: string | null): BackendHealth {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [modelName, setModelName] = useState<string | null>(null)
  const [gpuLayers, setGpuLayers] = useState<number | null>(null)
  const [ocrReady, setOcrReady] = useState<boolean>(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkHealth = useCallback(async () => {
    if (!userEmail) return

    try {
      const headers: Record<string, string> = {
        'x-user-email': userEmail,
      }
      if (userRole) {
        headers['x-user-role'] = userRole
      }

      const res = await fetch('/api/dev/llm', {
        headers,
        cache: 'no-store',
      })

      if (res.ok) {
        const data = await res.json()
        if (data.status === 'ok') {
          setStatus('online')
          const fullPath = data.model?.active_model_path || ''
          const filename = fullPath.split(/[\/\\]/).pop() || fullPath || null
          setModelName(filename)
          setGpuLayers(typeof data.model?.n_gpu_layers === 'number' ? data.model.n_gpu_layers : null)
          setOcrReady(Boolean(data.ocr_available))
        } else {
          setStatus('offline')
          setOcrReady(false)
        }
      } else {
        setStatus('offline')
        setOcrReady(false)
      }
    } catch {
      setStatus('offline')
      setOcrReady(false)
    } finally {
      setLastChecked(new Date())
    }
  }, [userEmail, userRole])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30_000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return {
    status,
    modelName,
    gpuLayers,
    lastChecked,
    ocrReady,
    checkHealth,
  }
}
