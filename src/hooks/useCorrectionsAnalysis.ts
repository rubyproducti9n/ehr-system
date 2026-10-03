import { useMemo } from 'react'
import { ExtractionAuditLog, FieldCorrection } from '@/types'

export interface FieldStat {
  fieldPath: string
  correctionCount: number
  exampleOriginal: string | null
  exampleCorrected: string
}

export interface DocumentTypeStat {
  documentType: string
  totalExtractions: number
  totalCorrections: number
  correctionRate: number
}

export interface ConfidenceStat {
  confidence: string
  totalFields: number
  correctionCount: number
  errorRate: number
}

export interface CorrectionsAnalysis {
  totalCorrections: number
  byField: FieldStat[]
  byDocumentType: DocumentTypeStat[]
  byConfidence: ConfidenceStat[]
  recentCorrections: FieldCorrection[]
}

export function useCorrectionsAnalysis(
  corrections: FieldCorrection[],
  auditLogs: ExtractionAuditLog[] = []
): CorrectionsAnalysis {
  return useMemo(() => {
    // 1. Total Corrections
    const totalCorrections = corrections.length

    // 2. byField: group corrections by fieldPath, count occurrences, sort descending, top 20
    const fieldMap = new Map<
      string,
      { count: number; exampleOriginal: string | null; exampleCorrected: string }
    >()

    corrections.forEach((c) => {
      const existing = fieldMap.get(c.fieldPath)
      if (!existing) {
        fieldMap.set(c.fieldPath, {
          count: 1,
          exampleOriginal: c.originalValue,
          exampleCorrected: c.correctedValue,
        })
      } else {
        existing.count += 1
        if (!existing.exampleOriginal && c.originalValue) {
          existing.exampleOriginal = c.originalValue
        }
        if (c.correctedValue) {
          existing.exampleCorrected = c.correctedValue
        }
      }
    })

    const byField: FieldStat[] = Array.from(fieldMap.entries())
      .map(([fieldPath, stat]) => ({
        fieldPath,
        correctionCount: stat.count,
        exampleOriginal: stat.exampleOriginal,
        exampleCorrected: stat.exampleCorrected,
      }))
      .sort((a, b) => b.correctionCount - a.correctionCount)
      .slice(0, 20)

    // 3. byDocumentType: group by documentType, compute correctionRate = totalCorrections / totalExtractions * 100
    const docTypeMap = new Map<
      string,
      { totalExtractions: number; totalCorrections: number }
    >()

    auditLogs.forEach((log) => {
      const type = log.documentType || 'other'
      const existing = docTypeMap.get(type) || {
        totalExtractions: 0,
        totalCorrections: 0,
      }
      existing.totalExtractions += 1
      docTypeMap.set(type, existing)
    })

    corrections.forEach((c) => {
      const type = c.documentType || 'other'
      const existing = docTypeMap.get(type) || {
        totalExtractions: 0,
        totalCorrections: 0,
      }
      existing.totalCorrections += 1
      docTypeMap.set(type, existing)
    })

    const byDocumentType: DocumentTypeStat[] = Array.from(docTypeMap.entries())
      .map(([documentType, stats]) => {
        const rate =
          stats.totalExtractions > 0
            ? (stats.totalCorrections / stats.totalExtractions) * 100
            : stats.totalCorrections > 0
            ? 100
            : 0

        return {
          documentType,
          totalExtractions: stats.totalExtractions,
          totalCorrections: stats.totalCorrections,
          correctionRate: Math.round(rate * 10) / 10,
        }
      })
      .sort((a, b) => b.totalCorrections - a.totalCorrections)

    // 4. byConfidence: group by confidence field, compute errorRate = correctionCount / totalFields * 100
    const confLevels = ['high', 'medium', 'low']
    const highCorrections = corrections.filter(
      (c) => (c.confidence || '').toLowerCase() === 'high'
    ).length
    const medCorrections = corrections.filter(
      (c) => (c.confidence || '').toLowerCase() === 'medium'
    ).length
    const lowCorrections = corrections.filter(
      (c) => (c.confidence || '').toLowerCase() === 'low'
    ).length

    // Calculate total fields from logs
    let totalHighFields = 0
    let totalMedFields = 0
    let totalLowFields = 0

    auditLogs.forEach((log) => {
      totalHighFields += log.autoApprovedFields || 0
      totalMedFields += log.manuallyApprovedFields || 0
      totalLowFields += log.editedFields || 0
    })

    // If total fields for a category is lower than corrections, adjust baseline
    const highTotal = Math.max(totalHighFields, highCorrections)
    const medTotal = Math.max(totalMedFields, medCorrections)
    const lowTotal = Math.max(totalLowFields, lowCorrections)

    const byConfidence: ConfidenceStat[] = confLevels.map((lvl) => {
      let count = 0
      let total = 0
      if (lvl === 'high') {
        count = highCorrections
        total = highTotal
      } else if (lvl === 'medium') {
        count = medCorrections
        total = medTotal
      } else {
        count = lowCorrections
        total = lowTotal
      }

      const rate = total > 0 ? (count / total) * 100 : count > 0 ? 100 : 0

      return {
        confidence: lvl,
        totalFields: total,
        correctionCount: count,
        errorRate: Math.round(rate * 10) / 10,
      }
    })

    // 5. recentCorrections: last 10 corrections by correctedAt
    const recentCorrections = [...corrections]
      .sort(
        (a, b) =>
          new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime()
      )
      .slice(0, 10)

    return {
      totalCorrections,
      byField,
      byDocumentType,
      byConfidence,
      recentCorrections,
    }
  }, [corrections, auditLogs])
}
