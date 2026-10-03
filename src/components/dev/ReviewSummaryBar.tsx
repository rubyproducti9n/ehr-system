'use client'

import React from 'react'
import { CheckCircle2, AlertTriangle, PenLine, AlertCircle } from 'lucide-react'

export interface ReviewSummaryBarProps {
  total: number
  highCount: number
  mediumCount: number
  lowCount: number
  approvedCount: number
  editedCount: number
  pendingCount: number
  allReviewed: boolean
}

export function ReviewSummaryBar({
  total,
  highCount,
  approvedCount,
  editedCount,
  pendingCount,
  allReviewed,
}: ReviewSummaryBarProps) {
  const reviewedCount = highCount + approvedCount + editedCount
  const percentage = total > 0 ? Math.min(100, Math.round((reviewedCount / total) * 100)) : 100

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      {/* Header with Done count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Review Progress</span>
          {allReviewed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              In Progress
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-medium text-muted-foreground">
          {reviewedCount} / {total} done
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-300 ${
              allReviewed
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-end text-[10px] font-mono text-muted-foreground">
          {percentage}%
        </div>
      </div>

      {/* Stat Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-border/40">
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Auto-approved: <strong>{highCount}</strong>
        </span>

        {approvedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Confirmed: <strong>{approvedCount}</strong>
          </span>
        )}

        {editedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <PenLine className="h-3.5 w-3.5 text-blue-600" />
            Edited: <strong>{editedCount}</strong>
          </span>
        )}

        {pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ml-auto">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            Still needs review: <strong>{pendingCount} {pendingCount === 1 ? 'field' : 'fields'}</strong>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ml-auto">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All fields reviewed — ready to save
          </span>
        )}
      </div>
    </div>
  )
}
