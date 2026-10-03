'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { subscribeToFlags } from '@/lib/services/featureFlagService'
import { FeatureFlag } from '@/types'

export function useFeatureFlags(): {
  flags: Record<string, FeatureFlag>
  flagsList: FeatureFlag[]
  isEnabled: (key: string) => boolean
  isVisible: (key: string) => boolean
  loading: boolean
} {
  const [flagsList, setFlagsList] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToFlags((list) => {
      setFlagsList(list)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const flagsMap = useMemo(() => {
    const map: Record<string, FeatureFlag> = {}
    flagsList.forEach((flag) => {
      map[flag.key] = flag
    })
    return map
  }, [flagsList])

  // Fail-open: if flag is not found, default to true
  const isEnabled = useCallback(
    (key: string): boolean => {
      if (!flagsMap[key]) return true
      return flagsMap[key].enabled !== false
    },
    [flagsMap]
  )

  const isVisible = useCallback(
    (key: string): boolean => {
      if (!flagsMap[key]) return true
      return flagsMap[key].visible !== false
    },
    [flagsMap]
  )

  return {
    flags: flagsMap,
    flagsList,
    isEnabled,
    isVisible,
    loading,
  }
}
