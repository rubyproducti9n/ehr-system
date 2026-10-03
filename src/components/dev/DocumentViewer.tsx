'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface OcrLine {
  text: string
  confidence: number
  bbox?: number[][]
}

export interface DocumentViewerProps {
  file: File | null
  ocrLines: OcrLine[] | null
  activeFieldSource: string | null
}

export function DocumentViewer({
  file,
  ocrLines,
  activeFieldSource,
}: DocumentViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showOcrLines, setShowOcrLines] = useState(true)

  // Generate object URL for image preview and revoke on cleanup
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setImageUrl(null)
    }
  }, [file])

  const isPdf = file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf')
  const isImage = file?.type.startsWith('image/')

  // Helper to check if an OCR line matches the focused field's source text
  const isLineHighlighted = useMemo(() => {
    return (lineText: string) => {
      if (!activeFieldSource || !activeFieldSource.trim()) return false
      const s = activeFieldSource.trim().toLowerCase()
      const t = lineText.trim().toLowerCase()
      return t.includes(s) || s.includes(t)
    }
  }, [activeFieldSource])

  if (!file) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center text-muted-foreground">
        <div className="mb-3 rounded-full bg-muted p-3">
          <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-semibold text-foreground">No Document Selected</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Upload a prescription image or PDF to preview the document and source text here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Document Preview Box */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/20 p-2 overflow-hidden">
        {isImage && imageUrl ? (
          <div className="relative w-full flex items-center justify-center max-h-[300px] lg:max-h-[440px] overflow-hidden rounded-lg bg-background/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={file.name}
              className="max-h-[300px] lg:max-h-[440px] w-auto max-w-full object-contain select-none transition-transform"
            />
          </div>
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-2.5 w-full">
            <div className="rounded-full bg-red-100 dark:bg-red-950/50 p-3 text-red-600 dark:text-red-400">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF text extracted — no visual preview available
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {(file.size / 1024).toFixed(1)} KB
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 w-full">
            <FileText className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">Document loaded</p>
          </div>
        )}
      </div>

      {/* Collapsible OCR Lines Section */}
      {ocrLines && ocrLines.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                OCR Lines ({ocrLines.length})
              </span>
              {activeFieldSource && (
                <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300">
                  <Sparkles className="h-2.5 w-2.5" /> Source active
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOcrLines(!showOcrLines)}
              className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {showOcrLines ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {showOcrLines && (
            <div className="flex flex-wrap gap-1.5 max-h-[160px] lg:max-h-[220px] overflow-y-auto p-1 text-xs">
              {ocrLines.map((line, idx) => {
                const highlighted = isLineHighlighted(line.text)
                const confPercent = Math.round(line.confidence * 100)

                let colorClasses =
                  'bg-muted/40 text-foreground border-border/80 hover:bg-muted'
                if (highlighted) {
                  colorClasses =
                    'bg-yellow-200 text-yellow-950 border-yellow-400 dark:bg-yellow-900/80 dark:text-yellow-100 dark:border-yellow-600 ring-2 ring-yellow-400 font-semibold shadow-xs scale-[1.02]'
                } else if (line.confidence < 0.5) {
                  colorClasses =
                    'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                } else if (line.confidence < 0.75) {
                  colorClasses =
                    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                }

                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-all duration-150 ${colorClasses}`}
                    title={`Confidence: ${confPercent}%`}
                  >
                    <span className="truncate max-w-[220px]">{line.text}</span>
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${
                        highlighted
                          ? 'bg-yellow-300 text-yellow-950 dark:bg-yellow-800 dark:text-yellow-100'
                          : line.confidence < 0.75
                          ? 'bg-background/80 text-foreground'
                          : 'bg-background/60 text-muted-foreground'
                      }`}
                    >
                      {confPercent}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
