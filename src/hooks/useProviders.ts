'use client'

import { useState, useEffect } from 'react'
import { Provider } from '@/types'
import { subscribeToProviders } from '@/lib/services/providerService'
import { useAppStore } from '@/store/useAppStore'

export function useProviders(): {
  providers: Provider[]
  loading: boolean
  error: string | null
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId) {
      setProviders([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToProviders(hospitalId, (data) => {
        setProviders(data)
        setLoading(false)
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load providers'
      setError(message)
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [hospitalId])

  return { providers, loading, error }
}
