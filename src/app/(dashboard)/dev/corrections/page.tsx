'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Download,
  FileText,
  PenLine,
  Activity,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Bot,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { ExtractionAuditLog, FieldCorrection } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { getAllCorrections, getAllAuditLogs } from '@/lib/services/auditService'
import { useCorrectionsAnalysis } from '@/hooks/useCorrectionsAnalysis'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

export default function CorrectionsPage() {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const [corrections, setCorrections] = useState<FieldCorrection[]>([])
  const [auditLogs, setAuditLogs] = useState<ExtractionAuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!hospitalId) {
        setLoading(false)
        return
      }
      try {
        const [corrData, logData] = await Promise.all([
          getAllCorrections(hospitalId),
          getAllAuditLogs(hospitalId),
        ])
        setCorrections(corrData)
        setAuditLogs(logData)
      } catch (err) {
        console.error('Failed to load corrections and audit logs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [hospitalId])

  const analysis = useCorrectionsAnalysis(corrections, auditLogs)

  // Calculate total fields seen across all audit logs
  const totalFieldsAcrossLogs = auditLogs.reduce(
    (sum, log) => sum + (log.totalFields || 0),
    0
  )

  const overallCorrectionRate =
    totalFieldsAcrossLogs > 0
      ? ((corrections.length / totalFieldsAcrossLogs) * 100).toFixed(1) + '%'
      : '0.0%'

  const mostCorrectedField =
    analysis.byField.length > 0 ? analysis.byField[0].fieldPath : '—'

  const handleExport = () => {
    const jsonStr = JSON.stringify(corrections, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `ehr-corrections-${today}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getDocTypeColor = (rate: number) => {
    if (rate < 10) return 'bg-emerald-500'
    if (rate <= 25) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  const getDocTypeBadge = (type: string) => {
    const formatted = type.replace(/_/g, ' ')
    return (
      <Badge variant="outline" className="text-[10px] capitalize font-mono">
        {formatted}
      </Badge>
    )
  }

  const getConfidenceBadge = (confidence: string) => {
    const conf = confidence.toLowerCase()
    switch (conf) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3" /> high
          </span>
        )
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3" /> medium
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
            <XCircle className="h-3 w-3" /> low
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {confidence}
          </span>
        )
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Corrections Feedback
            </h1>
            <Badge className="border-amber-300 bg-amber-100 text-[10px] font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              DEV ONLY
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Field-level correction patterns from reviewer sessions. Use this data to improve prompts and identify weak extraction areas.
          </p>
        </div>

        <Button
          onClick={handleExport}
          disabled={loading || corrections.length === 0}
          className="gap-2 self-start sm:self-auto text-xs"
        >
          <Download className="h-4 w-4" />
          Export Dataset
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      ) : corrections.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="No corrections recorded yet"
          description="Run extractions and review fields to build this dataset."
          action={{
            label: 'Go to AI Document Processing',
            href: '/dev/ai-docs',
          }}
        />
      ) : (
        <>
          {/* SECTION 1: Summary Stats Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Extractions"
              value={auditLogs.length}
              icon={FileText}
              color="blue"
            />
            <StatCard
              label="Total Corrections"
              value={corrections.length}
              icon={PenLine}
              color="yellow"
            />
            <StatCard
              label="Overall Correction Rate"
              value={overallCorrectionRate}
              icon={Activity}
              color="gray"
            />
            <StatCard
              label="Most Corrected Field"
              value={mostCorrectedField}
              icon={Sparkles}
              color="red"
            />
          </div>

          {/* SECTION 2: Most Corrected Fields Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b p-4">
              <h2 className="text-sm font-semibold text-foreground">
                Most Corrected Fields (Top {Math.min(10, analysis.byField.length)})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fields where reviewer overrides were submitted most frequently
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Field Path</TableHead>
                    <TableHead className="font-semibold text-center w-[140px]">Correction Count</TableHead>
                    <TableHead className="font-semibold">Example Original</TableHead>
                    <TableHead className="font-semibold">Example Corrected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.byField.slice(0, 10).map((field) => {
                    const count = field.correctionCount
                    const badgeClass =
                      count > 10
                        ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                        : count > 5
                        ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'

                    return (
                      <TableRow key={field.fieldPath}>
                        <TableCell className="font-mono text-xs font-medium text-foreground">
                          {field.fieldPath}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badgeClass}`}
                          >
                            {count}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground italic max-w-[200px] truncate" title={field.exampleOriginal || 'null'}>
                          {field.exampleOriginal !== null && field.exampleOriginal !== undefined
                            ? field.exampleOriginal.length > 40
                              ? `${field.exampleOriginal.slice(0, 40)}…`
                              : field.exampleOriginal
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground max-w-[200px] truncate" title={field.exampleCorrected}>
                          {field.exampleCorrected
                            ? field.exampleCorrected.length > 40
                              ? `${field.exampleCorrected.slice(0, 40)}…`
                              : field.exampleCorrected
                            : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* SECTION 3 & 4: Two Column Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* SECTION 3: Correction Rate by Document Type */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Correction Rate by Document Type
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Percentage of extractions requiring reviewer corrections per document type
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                {analysis.byDocumentType.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No document data recorded</p>
                ) : (
                  analysis.byDocumentType.map((doc) => {
                    const clampedRate = Math.min(100, Math.max(0, doc.correctionRate))
                    const barColor = getDocTypeColor(clampedRate)

                    return (
                      <div key={doc.documentType} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground capitalize">
                            {doc.documentType.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            <strong className="text-foreground">{doc.correctionRate}%</strong>{' '}
                            ({doc.totalCorrections} corr / {doc.totalExtractions} docs)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${clampedRate}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* SECTION 4: Confidence Accuracy */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Confidence Calibration &amp; Error Rates
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Validates model confidence calibration against actual reviewer corrections
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {analysis.byConfidence.map((conf) => (
                  <div
                    key={conf.confidence}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      {getConfidenceBadge(conf.confidence)}
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {conf.totalFields} total fields evaluated
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {conf.correctionCount} corrected by reviewer
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground font-mono">
                        {conf.errorRate}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Error Rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 5: Recent Corrections Feed */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b p-4">
              <h2 className="text-sm font-semibold text-foreground">
                Recent Corrections Feed
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last 10 reviewer adjustments in chronological order
              </p>
            </div>

            <div className="divide-y divide-border">
              {analysis.recentCorrections.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No recent corrections found.
                </div>
              ) : (
                analysis.recentCorrections.map((corr) => (
                  <div
                    key={corr.id}
                    className="p-4 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-foreground">
                          {corr.fieldPath}
                        </span>
                        {getDocTypeBadge(corr.documentType)}
                        {corr.confidence && getConfidenceBadge(corr.confidence)}
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="line-through italic opacity-80 max-w-[200px] truncate" title={corr.originalValue || 'empty'}>
                          {corr.originalValue || '(empty)'}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        <span className="font-medium text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded max-w-[250px] truncate" title={corr.correctedValue}>
                          {corr.correctedValue}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 sm:text-right">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground/70" />
                          <span className="truncate max-w-[140px]" title={corr.correctedBy}>
                            {corr.correctedBy}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          <span>{formatDate(corr.correctedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
