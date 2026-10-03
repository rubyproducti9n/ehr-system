'use client'

import { useState, useEffect } from 'react'
import { Document } from '@/types'
import { subscribeToDocuments } from '@/lib/services/documentService'
import { useAppStore } from '@/store/useAppStore'

export function useDocuments(patientId: string): {
  documents: Document[]
  loading: boolean
  error: string | null
} {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalId || !patientId) {
      setDocuments([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToDocuments(hospitalId, patientId, (data) => {
        // Sort by uploadedAt descending
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.uploadedAt || 0).getTime()
          const timeB = new Date(b.uploadedAt || 0).getTime()
          return timeB - timeA
        })
        setDocuments(sorted)
        setLoading(false)
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load documents'
      setError(message)
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [hospitalId, patientId])

  return { documents, loading, error }
}
