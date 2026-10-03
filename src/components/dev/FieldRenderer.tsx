'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Pill,
  Activity,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PenLine,
  Check,
  X,
  FileText,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ReviewState, Confidence, ReviewStatus } from '@/hooks/useReviewState'

export interface FieldRendererProps {
  data: Record<string, unknown>
  onFieldChange: (path: string, newValue: string) => void
  onFieldApprove: (path: string) => void
  reviewState: ReviewState
  onFieldFocus?: (sourceText: string | null) => void
}

function formatKeyLabel(key: string): string {
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function normalizeConfidence(conf?: unknown): Confidence {
  if (conf === 'low' || conf === 'medium' || conf === 'high') return conf
  return 'high'
}

function getConfidenceBadge(confidence: Confidence) {
  switch (confidence) {
    case 'high':
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800">
          high
        </span>
      )
    case 'medium':
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          medium
        </span>
      )
    case 'low':
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
          low
        </span>
      )
  }
}

function getFieldBorderClass(confidence: Confidence): string {
  switch (confidence) {
    case 'medium':
      return 'border-l-2 border-amber-400 pl-2'
    case 'low':
      return 'border-l-2 border-red-500 pl-2'
    default:
      return ''
  }
}

interface SingleFieldRowProps {
  label: string
  value: unknown
  sourceText?: string | null
  confidence: Confidence
  path: string
  reviewState: ReviewState
  onFieldChange: (path: string, newValue: string) => void
  onFieldApprove: (path: string) => void
  onFieldFocus?: (sourceText: string | null) => void
  activeEditingPath: string | null
  setActiveEditingPath: (path: string | null) => void
}

function SingleFieldRow({
  label,
  value,
  sourceText,
  confidence,
  path,
  reviewState,
  onFieldChange,
  onFieldApprove,
  onFieldFocus,
  activeEditingPath,
  setActiveEditingPath,
}: SingleFieldRowProps) {
  const isEditing = activeEditingPath === path
  const [inputValue, setInputValue] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const status: ReviewStatus = reviewState[path] ?? (confidence === 'high' ? 'approved' : 'pending')
  const displayVal = value !== null && value !== undefined && value !== '' ? String(value) : null

  useEffect(() => {
    if (isEditing) {
      setInputValue(displayVal ?? '')
      // Auto focus on next tick
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isEditing, displayVal])

  const handleStartEdit = () => {
    setActiveEditingPath(path)
    onFieldFocus?.(sourceText ?? null)
  }

  const handleSaveEdit = () => {
    onFieldChange(path, inputValue)
    setActiveEditingPath(null)
    onFieldFocus?.(null)
  }

  const handleCancelEdit = () => {
    setActiveEditingPath(null)
    onFieldFocus?.(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  return (
    <div
      onClick={() => onFieldFocus?.(sourceText ?? null)}
      className={`group rounded-lg border border-border/60 bg-muted/10 p-2 text-xs space-y-1 transition-colors cursor-pointer hover:border-primary/40 ${getFieldBorderClass(
        confidence
      )}`}
    >
      {/* Header Line: Badge + Label + Status/Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {getConfidenceBadge(confidence)}
          <span className="font-semibold text-foreground truncate">{label}</span>
        </div>

        {/* Right side status / action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {status === 'edited' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
              <PenLine className="h-3.5 w-3.5" />
              Approved after edit
            </span>
          )}

          {status === 'approved' && confidence !== 'high' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmed
            </span>
          )}

          {status === 'approved' && confidence === 'high' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}

          {status === 'pending' && confidence === 'medium' && !isEditing && (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFieldApprove(path)}
                className="h-6 px-2 text-[11px] font-medium border-amber-300 text-amber-900 dark:border-amber-700 dark:text-amber-300 hover:bg-amber-100"
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="h-6 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Edit
              </Button>
            </div>
          )}

          {status === 'pending' && confidence === 'low' && !isEditing && (
            <div className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="h-6 px-2 text-[11px] font-medium border-red-300 text-red-900 dark:border-red-700 dark:text-red-300 hover:bg-red-100"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFieldApprove(path)}
                className="h-6 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Confirm
              </Button>
            </div>
          )}

          {status !== 'pending' && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Value Line: Either Editable Input or Display Value */}
      <div className="pt-0.5">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 text-xs font-medium"
              placeholder="Enter value..."
            />
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="text-foreground font-medium">
            {displayVal !== null ? (
              <span>{displayVal}</span>
            ) : (
              <span className="text-muted-foreground italic">—</span>
            )}
          </div>
        )}
      </div>

      {/* Source Text line */}
      {sourceText ? (
        <p className="text-[10px] text-muted-foreground/80 italic pt-0.5">
          Source: &ldquo;{sourceText}&rdquo;
        </p>
      ) : null}
    </div>
  )
}

export function FieldRenderer({
  data,
  onFieldChange,
  onFieldApprove,
  reviewState,
  onFieldFocus,
}: FieldRendererProps) {
  const [activeEditingPath, setActiveEditingPath] = useState<string | null>(null)

  if (!data || typeof data !== 'object') {
    return <span className="text-muted-foreground">—</span>
  }

  const entries = Object.entries(data)

  const isValueWithMeta = (
    obj: unknown
  ): obj is { value: unknown; source_text?: string | null; confidence?: string } => {
    return typeof obj === 'object' && obj !== null && 'value' in obj
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => {
        // Skip document_type and reasoning in body
        if (key === 'document_type' || key === 'reasoning') {
          return null
        }

        // 1. Array of medications (e.g. medications or discharge_medications)
        if ((key === 'medications' || key === 'discharge_medications') && Array.isArray(value)) {
          return (
            <div key={key} className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Pill className="h-3.5 w-3.5 text-primary" />
                <span>Medications ({value.length})</span>
              </div>
              {value.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No medications extracted</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {value.map((med: Record<string, unknown>, idx: number) => {
                    const itemConfidence = normalizeConfidence(med.confidence)
                    const subFields = [
                      { key: 'name', label: 'Name' },
                      { key: 'generic_name', label: 'Generic Name' },
                      { key: 'dosage', label: 'Dosage' },
                      { key: 'frequency', label: 'Frequency' },
                      { key: 'frequency_decoded', label: 'Frequency (Decoded)' },
                      { key: 'route', label: 'Route' },
                      { key: 'duration', label: 'Duration' },
                    ]

                    // Calculate overall medication confidence = lowest among sub-fields
                    let overallConf: Confidence = itemConfidence
                    for (const sf of subFields) {
                      const sfVal = med[sf.key]
                      const sfConf = isValueWithMeta(sfVal)
                        ? normalizeConfidence(sfVal.confidence)
                        : itemConfidence
                      if (sfConf === 'low') {
                        overallConf = 'low'
                        break
                      }
                      if (sfConf === 'medium') {
                        overallConf = 'medium'
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border bg-card p-3.5 space-y-3 shadow-xs"
                      >
                        {/* Medication Card Header */}
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              💊 Medication {idx + 1}
                              {med.name ? (
                                <span className="font-normal text-muted-foreground text-xs">
                                  — {String(med.name)}
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Overall:</span>
                            {getConfidenceBadge(overallConf)}
                          </div>
                        </div>

                        {/* Sub-fields rows */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {subFields.map(({ key: sfKey, label: sfLabel }) => {
                            if (!(sfKey in med)) return null

                            const sfVal = med[sfKey]
                            const sfIsMeta = isValueWithMeta(sfVal)
                            const val = sfIsMeta ? sfVal.value : sfVal
                            const src = sfIsMeta ? sfVal.source_text : null
                            const conf = sfIsMeta
                              ? normalizeConfidence(sfVal.confidence)
                              : itemConfidence
                            const path = sfIsMeta
                              ? `${key}[${idx}].${sfKey}.value`
                              : `${key}[${idx}].${sfKey}`

                            return (
                              <SingleFieldRow
                                key={sfKey}
                                label={sfLabel}
                                value={val}
                                sourceText={src}
                                confidence={conf}
                                path={path}
                                reviewState={reviewState}
                                onFieldChange={onFieldChange}
                                onFieldApprove={onFieldApprove}
                                onFieldFocus={onFieldFocus}
                                activeEditingPath={activeEditingPath}
                                setActiveEditingPath={setActiveEditingPath}
                              />
                            )
                          })}
                        </div>

                        {/* Overall Medication Source Text */}
                        {med.source_text ? (
                          <p className="text-[10px] text-muted-foreground/80 italic pt-1 border-t border-border/40">
                            Source: &ldquo;{String(med.source_text)}&rdquo;
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        // 2. Array of lab tests
        if (key === 'tests' && Array.isArray(value)) {
          return (
            <div key={key} className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                <span>Lab Tests ({value.length})</span>
              </div>
              {value.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No tests extracted</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {value.map((test: Record<string, unknown>, idx: number) => {
                    const itemConfidence = normalizeConfidence(test.confidence)
                    const subFields = [
                      { key: 'test_name', label: 'Test Name' },
                      { key: 'value', label: 'Value' },
                      { key: 'unit', label: 'Unit' },
                      { key: 'reference_range', label: 'Reference Range' },
                      { key: 'flag', label: 'Flag' },
                    ]

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border bg-card p-3 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="font-semibold text-xs text-foreground">
                            🧪 Test {idx + 1}: {String(test.test_name || 'Unnamed')}
                          </span>
                          {test.flag ? (
                            <span className="rounded bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-1.5 py-0.5 text-[10px] font-medium">
                              {String(test.flag)}
                            </span>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {subFields.map(({ key: sfKey, label: sfLabel }) => {
                            if (!(sfKey in test)) return null
                            const sfVal = test[sfKey]
                            const sfIsMeta = isValueWithMeta(sfVal)
                            const val = sfIsMeta ? sfVal.value : sfVal
                            const src = sfIsMeta ? sfVal.source_text : null
                            const conf = sfIsMeta
                              ? normalizeConfidence(sfVal.confidence)
                              : itemConfidence
                            const path = sfIsMeta
                              ? `tests[${idx}].${sfKey}.value`
                              : `tests[${idx}].${sfKey}`

                            return (
                              <SingleFieldRow
                                key={sfKey}
                                label={sfLabel}
                                value={val}
                                sourceText={src}
                                confidence={conf}
                                path={path}
                                reviewState={reviewState}
                                onFieldChange={onFieldChange}
                                onFieldApprove={onFieldApprove}
                                onFieldFocus={onFieldFocus}
                                activeEditingPath={activeEditingPath}
                                setActiveEditingPath={setActiveEditingPath}
                              />
                            )
                          })}
                        </div>
                        {test.source_text ? (
                          <p className="text-[10px] text-muted-foreground/80 italic pt-1 border-t border-border/40">
                            Source: &ldquo;{String(test.source_text)}&rdquo;
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        // 3. Vitals Object (rendered as 2-column grid of field rows)
        if (key === 'vitals' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const vitalsObj = value as Record<string, unknown>
          return (
            <div key={key} className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>Vitals</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(vitalsObj).map(([vitalKey, vitalVal]) => {
                  const isMeta = isValueWithMeta(vitalVal)
                  const val = isMeta ? vitalVal.value : vitalVal
                  const src = isMeta ? vitalVal.source_text : null
                  const conf = isMeta ? normalizeConfidence(vitalVal.confidence) : 'high'
                  const path = isMeta ? `vitals.${vitalKey}.value` : `vitals.${vitalKey}`

                  return (
                    <SingleFieldRow
                      key={vitalKey}
                      label={formatKeyLabel(vitalKey)}
                      value={val}
                      sourceText={src}
                      confidence={conf}
                      path={path}
                      reviewState={reviewState}
                      onFieldChange={onFieldChange}
                      onFieldApprove={onFieldApprove}
                      onFieldFocus={onFieldFocus}
                      activeEditingPath={activeEditingPath}
                      setActiveEditingPath={setActiveEditingPath}
                    />
                  )
                })}
              </div>
            </div>
          )
        }

        // 4. Object containing { value, source_text, confidence }
        if (isValueWithMeta(value)) {
          const conf = normalizeConfidence(value.confidence)
          const path = `${key}.value`

          return (
            <SingleFieldRow
              key={key}
              label={formatKeyLabel(key)}
              value={value.value}
              sourceText={value.source_text}
              confidence={conf}
              path={path}
              reviewState={reviewState}
              onFieldChange={onFieldChange}
              onFieldApprove={onFieldApprove}
              onFieldFocus={onFieldFocus}
              activeEditingPath={activeEditingPath}
              setActiveEditingPath={setActiveEditingPath}
            />
          )
        }

        // 5. Generic nested object fallback
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return (
            <div key={key} className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>{formatKeyLabel(key)}</span>
              </div>
              <div className="pl-3 border-l border-border space-y-2">
                {Object.entries(value as Record<string, unknown>).map(([subK, subV]) => {
                  const isMeta = isValueWithMeta(subV)
                  const val = isMeta ? subV.value : subV
                  const src = isMeta ? subV.source_text : null
                  const conf = isMeta ? normalizeConfidence(subV.confidence) : 'high'
                  const path = isMeta ? `${key}.${subK}.value` : `${key}.${subK}`

                  return (
                    <SingleFieldRow
                      key={subK}
                      label={formatKeyLabel(subK)}
                      value={val}
                      sourceText={src}
                      confidence={conf}
                      path={path}
                      reviewState={reviewState}
                      onFieldChange={onFieldChange}
                      onFieldApprove={onFieldApprove}
                      onFieldFocus={onFieldFocus}
                      activeEditingPath={activeEditingPath}
                      setActiveEditingPath={setActiveEditingPath}
                    />
                  )
                })}
              </div>
            </div>
          )
        }

        // 6. Primitive string/number/boolean value
        return (
          <SingleFieldRow
            key={key}
            label={formatKeyLabel(key)}
            value={value}
            confidence="high"
            path={key}
            reviewState={reviewState}
            onFieldChange={onFieldChange}
            onFieldApprove={onFieldApprove}
            onFieldFocus={onFieldFocus}
            activeEditingPath={activeEditingPath}
            setActiveEditingPath={setActiveEditingPath}
          />
        )
      })}
    </div>
  )
}
