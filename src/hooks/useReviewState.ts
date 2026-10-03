'use client'

import { useState, useEffect, useCallback } from 'react'

export type ReviewStatus = 'pending' | 'approved' | 'edited'
export type Confidence = 'high' | 'medium' | 'low'

export interface ReviewState {
  [fieldPath: string]: ReviewStatus
}

export interface SummaryStats {
  total: number
  highCount: number
  mediumCount: number
  lowCount: number
  approvedCount: number
  editedCount: number
  pendingCount: number
  allReviewed: boolean
}

export interface UseReviewStateReturn {
  reviewState: ReviewState
  editedData: Record<string, unknown>
  summaryStats: SummaryStats
  approveField: (path: string) => void
  editField: (path: string, newValue: string) => void
  resetReview: () => void
}

/**
 * Deep clones an object safely.
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Sets a value in an object using dot and array index notation.
 * e.g. "patient_name.value", "medications[0].name", "vitals.bp.value"
 */
function setDeepValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = deepClone(obj)
  const tokens: (string | number)[] = []
  const regex = /([a-zA-Z0-9_]+)|\[(\d+)\]/g
  let match
  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1])
    } else if (match[2] !== undefined) {
      tokens.push(parseInt(match[2], 10))
    }
  }

  // eslint-disable-next-line @type-fest/no-explicit-any, @typescript-eslint/no-explicit-any
  let current: any = clone
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i]
    if (current[token] === undefined || current[token] === null) {
      const nextToken = tokens[i + 1]
      current[token] = typeof nextToken === 'number' ? [] : {}
    }
    current = current[token]
  }

  if (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1]
    current[lastToken] = value
  }

  return clone
}

interface FieldMeta {
  path: string
  confidence: Confidence
}

/**
 * Discovers all reviewable fields and their confidence levels from extraction data.
 */
function extractReviewableFields(data: Record<string, unknown> | null): FieldMeta[] {
  if (!data || typeof data !== 'object') return []

  const fields: FieldMeta[] = []

  const isValueWithConfidence = (val: unknown): val is { value: unknown; confidence?: string; source_text?: string } => {
    return typeof val === 'object' && val !== null && 'value' in val
  }

  const normalizeConfidence = (conf?: unknown): Confidence => {
    if (conf === 'low' || conf === 'medium' || conf === 'high') return conf
    return 'high'
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === 'document_type' || key === 'reasoning') continue

    // 1. Array of medications
    if ((key === 'medications' || key === 'discharge_medications') && Array.isArray(value)) {
      value.forEach((med, idx) => {
        if (!med || typeof med !== 'object') return
        const medObj = med as Record<string, unknown>
        const itemConfidence = normalizeConfidence(medObj.confidence)

        const subKeys = ['name', 'generic_name', 'dosage', 'frequency', 'frequency_decoded', 'route', 'duration']
        for (const subKey of subKeys) {
          if (subKey in medObj) {
            const subVal = medObj[subKey]
            if (isValueWithConfidence(subVal)) {
              fields.push({
                path: `${key}[${idx}].${subKey}.value`,
                confidence: normalizeConfidence(subVal.confidence || itemConfidence),
              })
            } else {
              fields.push({
                path: `${key}[${idx}].${subKey}`,
                confidence: itemConfidence,
              })
            }
          }
        }
      })
      continue
    }

    // 2. Array of lab tests
    if (key === 'tests' && Array.isArray(value)) {
      value.forEach((test, idx) => {
        if (!test || typeof test !== 'object') return
        const testObj = test as Record<string, unknown>
        const itemConfidence = normalizeConfidence(testObj.confidence)

        const subKeys = ['test_name', 'value', 'unit', 'reference_range', 'flag']
        for (const subKey of subKeys) {
          if (subKey in testObj) {
            const subVal = testObj[subKey]
            if (isValueWithConfidence(subVal)) {
              fields.push({
                path: `tests[${idx}].${subKey}.value`,
                confidence: normalizeConfidence(subVal.confidence || itemConfidence),
              })
            } else {
              fields.push({
                path: `tests[${idx}].${subKey}`,
                confidence: itemConfidence,
              })
            }
          }
        }
      })
      continue
    }

    // 3. Vitals object
    if (key === 'vitals' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const vitalsObj = value as Record<string, unknown>
      for (const [vitalKey, vitalVal] of Object.entries(vitalsObj)) {
        if (isValueWithConfidence(vitalVal)) {
          fields.push({
            path: `vitals.${vitalKey}.value`,
            confidence: normalizeConfidence(vitalVal.confidence),
          })
        } else {
          fields.push({
            path: `vitals.${vitalKey}`,
            confidence: 'high',
          })
        }
      }
      continue
    }

    // 4. Object containing { value, source_text, confidence }
    if (isValueWithConfidence(value)) {
      fields.push({
        path: `${key}.value`,
        confidence: normalizeConfidence(value.confidence),
      })
      continue
    }

    // 5. Generic nested object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = extractReviewableFields(value as Record<string, unknown>)
      for (const f of nested) {
        fields.push({
          path: `${key}.${f.path}`,
          confidence: f.confidence,
        })
      }
      continue
    }

    // 6. Primitive field
    fields.push({
      path: key,
      confidence: 'high',
    })
  }

  return fields
}

function calculateSummaryStats(
  fieldMetas: FieldMeta[],
  reviewState: ReviewState
): SummaryStats {
  let highCount = 0
  let mediumCount = 0
  let lowCount = 0
  let approvedCount = 0
  let editedCount = 0
  let pendingCount = 0

  for (const meta of fieldMetas) {
    const status = reviewState[meta.path] ?? (meta.confidence === 'high' ? 'approved' : 'pending')

    if (meta.confidence === 'high') {
      highCount++
    } else if (meta.confidence === 'medium') {
      mediumCount++
    } else if (meta.confidence === 'low') {
      lowCount++
    }

    if (status === 'pending') {
      pendingCount++
    } else if (status === 'edited') {
      editedCount++
    } else if (status === 'approved') {
      if (meta.confidence !== 'high') {
        approvedCount++
      }
    }
  }

  const total = fieldMetas.length
  const allReviewed = total === 0 || pendingCount === 0

  return {
    total,
    highCount,
    mediumCount,
    lowCount,
    approvedCount,
    editedCount,
    pendingCount,
    allReviewed,
  }
}

export function useReviewState(
  extractionData: Record<string, unknown> | null
): UseReviewStateReturn {
  const [reviewState, setReviewState] = useState<ReviewState>({})
  const [editedData, setEditedData] = useState<Record<string, unknown>>({})
  const [fieldMetas, setFieldMetas] = useState<FieldMeta[]>([])

  // Initialize or update review state when extractionData changes
  useEffect(() => {
    if (!extractionData) {
      setReviewState({})
      setEditedData({})
      setFieldMetas([])
      return
    }

    const fields = extractReviewableFields(extractionData)
    const initialReviewState: ReviewState = {}

    for (const field of fields) {
      if (field.confidence === 'high') {
        initialReviewState[field.path] = 'approved'
      } else {
        initialReviewState[field.path] = 'pending'
      }
    }

    setFieldMetas(fields)
    setReviewState(initialReviewState)
    setEditedData(deepClone(extractionData))
  }, [extractionData])

  const approveField = useCallback((path: string) => {
    setReviewState((prev) => ({
      ...prev,
      [path]: 'approved',
    }))
  }, [])

  const editField = useCallback((path: string, newValue: string) => {
    setReviewState((prev) => ({
      ...prev,
      [path]: 'edited',
    }))
    setEditedData((prev) => setDeepValue(prev, path, newValue))
  }, [])

  const resetReview = useCallback(() => {
    setReviewState({})
    setEditedData({})
    setFieldMetas([])
  }, [])

  const summaryStats = calculateSummaryStats(fieldMetas, reviewState)

  return {
    reviewState,
    editedData,
    summaryStats,
    approveField,
    editField,
    resetReview,
  }
}
