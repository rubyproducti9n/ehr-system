'use client'

import { useState, useEffect } from 'react'
import { Provider } from '@/types'
import { subscribeToProviders } from '@/lib/services/providerService'

export function useProviders(): {
  providers: Provider[]
  loading: boolean
  error: string | null
} {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToProviders((data) => {
        setProviders(data)
        setLoading(false)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load providers')
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  return { providers, loading, error }
}
