'use client'

import { useState, useEffect } from 'react'
import { Document } from '@/types'
import { subscribeToDocuments } from '@/lib/services/documentService'

export function useDocuments(patientId: string): {
  documents: Document[]
  loading: boolean
  error: string | null
} {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) {
      setDocuments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: () => void = () => {}

    try {
      unsubscribe = subscribeToDocuments(patientId, (data) => {
        // Sort by uploadedAt descending
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.uploadedAt || 0).getTime()
          const timeB = new Date(b.uploadedAt || 0).getTime()
          return timeB - timeA
        })
        setDocuments(sorted)
        setLoading(false)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load documents')
      setLoading(false)
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [patientId])

  return { documents, loading, error }
}
