'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Upload,
  FileText,
  AlertTriangle,
  FileCheck,
  X,
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { usePatients } from '@/hooks/usePatients'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import { useReviewState } from '@/hooks/useReviewState'
import { extractTextFromFile } from '@/lib/documentTextExtractor'
import { DocumentViewer, OcrLine } from '@/components/dev/DocumentViewer'
import { FieldRenderer } from '@/components/dev/FieldRenderer'
import { ReviewSummaryBar } from '@/components/dev/ReviewSummaryBar'
import { createDocument } from '@/lib/services/documentService'
import { createPrescription } from '@/lib/services/prescriptionService'
import { createLabResult } from '@/lib/services/labResultService'
import { createAuditLog, logFieldCorrections } from '@/lib/services/auditService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Document, FieldCorrection } from '@/types'

interface OcrResult {
  avg_confidence: number
  preprocessing_applied: string[]
  lines: OcrLine[]
}

function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || typeof obj !== 'object') return null
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj
  for (const token of tokens) {
    if (current === undefined || current === null) return null
    current = current[token]
  }
  return current !== undefined ? current : null
}

function getConfidenceAtPath(obj: Record<string, unknown>, path: string): string {
  if (!obj || typeof obj !== 'object') return 'unknown'
  if (path.endsWith('.value')) {
    const targetPath = path.slice(0, -6) + '.confidence'
    const conf = getValueAtPath(obj, targetPath)
    if (conf && typeof conf === 'string') return conf
  } else {
    const dotIndex = path.lastIndexOf('.')
    if (dotIndex !== -1) {
      const parentPath = path.substring(0, dotIndex)
      const directConf = getValueAtPath(obj, `${path}.confidence`)
      if (directConf && typeof directConf === 'string') return directConf
      const parentConf = getValueAtPath(obj, `${parentPath}.confidence`)
      if (parentConf && typeof parentConf === 'string') return parentConf
    }
  }
  const conf = getValueAtPath(obj, `${path}.confidence`)
  if (conf && typeof conf === 'string') return conf
  return 'unknown'
}

interface ExtractResponse {
  success: boolean
  document_type: string
  data: Record<string, unknown> | null
  raw_response: string | null
  inference_time_ms: number
  model_used: string
  error?: string
}

function buildDocumentTitle(docType: string, data: Record<string, unknown>): string {
  const dateVal = (data.date as { value?: string } | undefined)?.value ?? formatDate(new Date().toISOString())
  const typeLabel: Record<string, string> = {
    prescription: 'Prescription',
    opd_case_paper: 'OPD Case Paper',
    lab_report: 'Lab Report',
    discharge_summary: 'Discharge Summary',
    other: 'Medical Document',
  }
  return `${typeLabel[docType] ?? 'Document'} — ${dateVal}`
}

function mapToDocumentType(docType: string): Document['documentType'] {
  const map: Record<string, Document['documentType']> = {
    prescription: 'clinical',
    opd_case_paper: 'clinical',
    lab_report: 'lab',
    discharge_summary: 'clinical',
    other: 'other',
  }
  return map[docType] ?? 'other'
}

const formatElapsed = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function AIDocsDevPage() {
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const { patients, loading: patientsLoading } = usePatients()
  const { toast } = useToast()

  // Backend health
  const health = useBackendHealth(currentUser?.email ?? '', userRole)

  // File & Input state
  const [file, setFile] = useState<File | null>(null)
  const [fileText, setFileText] = useState<string>('')
  const [manualText, setManualText] = useState<string>('')
  const [pageCount, setPageCount] = useState<number>(1)
  const [extractionMethod, setExtractionMethod] = useState<'pdf-text' | 'image-ocr' | 'image-placeholder' | null>(null)
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // OCR active line highlighting
  const [activeFieldSource, setActiveFieldSource] = useState<string | null>(null)

  // Inference state
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState<ExtractResponse | null>(null)
  const [inferenceError, setInferenceError] = useState<string | null>(null)
  const [showRawOutput, setShowRawOutput] = useState(false)

  // Review State for extracted fields
  const {
    reviewState,
    editedData,
    summaryStats,
    approveField,
    editField,
    resetReview,
  } = useReviewState(result?.data ?? null)

  // Save state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; auditLogId?: string }>({ success: false })
  const [lastOcrResult, setLastOcrResult] = useState<OcrResult | null>(null)

  const textForInference = manualText.trim() || fileText.trim()

  const handleFileSelect = async (selected: File) => {
    setFile(selected)
    setFileLoading(true)
    setFileText('')
    setManualText('')
    setExtractionMethod(null)
    setExtractionWarning(null)
    setResult(null)
    setInferenceError(null)
    setSaveResult({ success: false })
    setLastOcrResult(null)
    setActiveFieldSource(null)
    resetReview()

    try {
      const res = await extractTextFromFile(selected, currentUser?.email ?? '', userRole)
      setFileText(res.text)
      setPageCount(res.pageCount)
      setExtractionMethod(res.method)
      if (res.ocrResult) {
        setLastOcrResult(res.ocrResult as OcrResult)
      }
      if (res.warning) {
        setExtractionWarning(res.warning)
      }
    } catch (err) {
      setExtractionWarning(`Error reading document: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setFileLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setFileText('')
    setManualText('')
    setExtractionMethod(null)
    setExtractionWarning(null)
    setResult(null)
    setInferenceError(null)
    setSaveResult({ success: false })
    setLastOcrResult(null)
    setActiveFieldSource(null)
    setElapsedSeconds(0)
    resetReview()
  }

  const handleResetAll = () => {
    handleClear()
    setSelectedPatientId('')
    resetReview()
  }

  const runExtraction = async () => {
    if (!currentUser?.email) return
    setIsRunning(true)
    setElapsedSeconds(0)
    setResult(null)
    setInferenceError(null)
    setSaveResult({ success: false })
    setActiveFieldSource(null)
    resetReview()

    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-email': currentUser.email,
      }
      if (userRole) {
        headers['x-user-role'] = userRole
      }

      const response = await fetch('/api/dev/llm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: textForInference,
          document_type: 'auto',
        }),
      })

      const data: ExtractResponse = await response.json()
      setResult(data)
      if (!data.success) {
        setInferenceError(data.error ?? 'Extraction failed')
      }
    } catch (err) {
      setInferenceError(err instanceof Error ? err.message : 'Network error')
    } finally {
      clearInterval(timer)
      setIsRunning(false)
    }
  }

  const hospitalId = useAppStore((state) => state.hospitalId)

  const handleSave = async () => {
    if (!result?.data || !selectedPatientId || !currentUser?.email || !hospitalId) return

    setIsSaving(true)
    try {
      const data = editedData
      const now = new Date().toISOString()
      const filename = result.model_used.split(/[\/\\]/).pop() || result.model_used

      // 1. Always create a Document record
      await createDocument(hospitalId, selectedPatientId, {
        patientId: selectedPatientId,
        title: buildDocumentTitle(result.document_type, data),
        documentType: mapToDocumentType(result.document_type),
        annotation: `Extracted by AI pipeline on ${formatDate(now)}. Model: ${filename}`,
        fileUrl: '',
        uploadedBy: currentUser.email,
      })

      // 2. For prescriptions and OPD case papers: also create Prescription records
      if (['prescription', 'opd_case_paper'].includes(result.document_type)) {
        const medications = Array.isArray(data.medications) ? data.medications : []
        for (const med of medications) {
          if (!med || typeof med !== 'object') continue
          const medObj = med as Record<string, unknown>
          if (!medObj.name) continue
          await createPrescription(hospitalId, selectedPatientId, {
            patientId: selectedPatientId,
            medicationName: String(medObj.name),
            dosage: medObj.dosage ? String(medObj.dosage) : '',
            frequency: medObj.frequency ? String(medObj.frequency) : '',
            route: medObj.route ? String(medObj.route) : 'Oral',
            prescribedDate: now,
            prescribingDoctorId: '',
            status: 'active',
            notes: `Source: "${medObj.source_text ? String(medObj.source_text) : ''}" · AI extracted`,
          })
        }
      }

      // 3. For lab reports: create a Lab Result record
      if (result.document_type === 'lab_report') {
        const tests = Array.isArray(data.tests) ? data.tests : []
        const content = tests
          .map((t: Record<string, unknown>) => `${t.test_name ?? 'Unknown'}: ${t.value ?? '—'} ${t.unit ?? ''} (ref: ${t.reference_range ?? '—'})`)
          .join('\n')
        await createLabResult(hospitalId, selectedPatientId, {
          patientId: selectedPatientId,
          title: `Lab Report — ${formatDate(now)}`,
          content: content || 'No tests extracted',
          resultDate: now,
          providerId: '',
        })
      }

      // Step 1 — build and write the audit log:
      const auditLogId = await createAuditLog(hospitalId, {
        timestamp: new Date().toISOString(),
        documentType: result.document_type,
        patientId: selectedPatientId,
        performedBy: currentUser.email,
        ocrConfidence: lastOcrResult?.avg_confidence ?? 0,
        totalFields: summaryStats.total,
        autoApprovedFields: summaryStats.highCount,
        manuallyApprovedFields: summaryStats.approvedCount,
        editedFields: summaryStats.editedCount,
        modelUsed: result.model_used,
        inferenceTimeMs: result.inference_time_ms,
        preprocessingApplied: lastOcrResult?.preprocessing_applied ?? [],
        rawModelOutput: result.raw_response,
        finalData: editedData,
      })

      // Step 2 — collect all edited fields and write corrections:
      const corrections: Omit<FieldCorrection, 'id'>[] = []
      Object.entries(reviewState).forEach(([path, status]) => {
        if (status !== 'edited') return
        const original = getValueAtPath(result.data!, path)
        const corrected = getValueAtPath(editedData, path)
        corrections.push({
          auditLogId,
          fieldPath: path,
          originalValue: original !== null && original !== undefined ? String(original) : null,
          correctedValue: String(corrected ?? ''),
          correctedBy: currentUser.email,
          correctedAt: new Date().toISOString(),
          confidence: getConfidenceAtPath(result.data!, path),
          documentType: result.document_type,
          patientId: selectedPatientId,
        })
      })
      if (corrections.length > 0) {
        await logFieldCorrections(hospitalId, corrections)
      }

      setSaveResult({ success: true, auditLogId })
      toast({
        title: 'Saved to patient record',
        description: 'Document, clinical records, and audit log created',
      })
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Tooltip descriptions for disabled Run button
  const getRunDisabledTooltip = () => {
    if (health.status !== 'online') return 'Start the Python backend server first'
    if (textForInference.length < 10) return 'Upload a document or paste text first (min 10 chars)'
    return undefined
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AI Document Processing
          </h1>
          <Badge className="border-amber-300 bg-amber-100 text-[10px] font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            DEV ONLY
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          OCR and LLM extraction workflow prototype for clinical documents, lab reports, and prescriptions.
        </p>
      </div>

      {/* Dynamic Status Banner */}
      <div
        className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between transition-colors ${
          health.status === 'online'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
            : health.status === 'offline'
            ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100'
            : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
        }`}
      >
        <div className="flex items-start gap-3">
          {health.status === 'online' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : health.status === 'offline' ? (
            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Loader2 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-spin" />
          )}

          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Pipeline Status:{' '}
              {health.status === 'online'
                ? 'Online'
                : health.status === 'offline'
                ? 'Offline'
                : 'Checking...'}
            </p>
            <p className="text-xs opacity-90">
              Model: <span className="font-mono font-medium">{health.modelName || '—'}</span>
              {' · '}
              GPU Layers:{' '}
              <span className="font-mono font-medium">
                {health.gpuLayers === -1 || (health.gpuLayers !== null && health.gpuLayers > 0)
                  ? `GPU: ${health.gpuLayers} layers offloaded`
                  : 'CPU only (no GPU offload)'}
              </span>
              {' · '}
              OCR:{' '}
              <span className="font-mono font-medium">
                {health.ocrReady ? 'Ready ✓' : 'Not installed'}
              </span>
              {health.lastChecked ? (
                <>
                  {' · '}Last checked: {health.lastChecked.toLocaleTimeString()}
                </>
              ) : null}
            </p>
          </div>
        </div>

        {health.status === 'offline' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => health.checkHealth()}
            className="gap-1.5 self-start border-rose-300 text-xs text-rose-900 dark:border-rose-700 dark:text-rose-300 sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>

      {/* Two-Panel Layout */}
      {!result?.data ? (
        /* BEFORE EXTRACTION: 50/50 Layout */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Panel: Upload & Document Preview */}
          <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  1. Source Document
                </h2>
              </div>
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>

            {!file ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  if (e.dataTransfer.files?.[0]) {
                    handleFileSelect(e.dataTransfer.files[0])
                  }
                }}
                className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0])
                    }
                  }}
                />
                {fileLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs font-semibold text-foreground">Reading document / running OCR preprocessing...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Drop a prescription image or PDF here
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      or click to browse your computer
                    </p>
                    <p className="mt-3 text-[10px] text-muted-foreground font-mono">
                      Supported: JPG, PNG, PDF (Scanned or Digital)
                    </p>
                  </>
                )}
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {extractionMethod === 'image-ocr' ? 'OCR processed' : `Pages: ${pageCount}`} · Characters extracted: {fileText.length.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {extractionWarning && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>{extractionWarning}</span>
                  </div>
                )}

                <DocumentViewer
                  file={file}
                  ocrLines={lastOcrResult?.lines ?? null}
                  activeFieldSource={activeFieldSource}
                />
              </div>
            )}
          </div>

          {/* Right Panel: Extraction Controls & Text Input */}
          <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-foreground">
                  2. Extraction Controls
                </h2>
              </div>
              <Button
                size="sm"
                disabled={health.status !== 'online' || textForInference.length < 10 || isRunning}
                onClick={runExtraction}
                title={getRunDisabledTooltip()}
                className="h-8 px-3 text-xs font-medium gap-1.5"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Extracting ({formatElapsed(elapsedSeconds)})
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Run Extraction
                  </>
                )}
              </Button>
            </div>

            {isRunning ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 rounded-lg border border-dashed flex-1 min-h-[220px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Running AI Extraction...</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    Elapsed: {formatElapsed(elapsedSeconds)}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Classification and structured JSON schema extraction in progress. Do not close this tab.
                </p>
              </div>
            ) : inferenceError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive flex-1">
                <XCircle className="h-8 w-8" />
                <div>
                  <p className="text-sm font-semibold">Extraction failed</p>
                  <p className="text-xs mt-1 text-muted-foreground">{inferenceError}</p>
                </div>
                <Button size="sm" variant="outline" onClick={runExtraction} className="text-xs">
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-xs font-medium text-foreground">
                    {extractionMethod === 'image-ocr'
                      ? 'Extracted OCR Text / Manual Override:'
                      : 'Document text for extraction:'}
                  </label>
                  <textarea
                    placeholder={
                      extractionMethod === 'image-ocr'
                        ? 'Extracted OCR text will appear here. You can also edit or paste additional text...'
                        : 'Paste or type prescription/clinical text manually (min 10 chars)...'
                    }
                    value={manualText || (extractionMethod === 'image-ocr' ? fileText : fileText)}
                    onChange={(e) => {
                      setManualText(e.target.value)
                      if (fileText && extractionMethod !== 'image-ocr') {
                        setFileText('')
                      }
                    }}
                    className="flex-1 min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    aria-label="Document text"
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                    <span>
                      {textForInference.length >= 10
                        ? 'Ready for extraction'
                        : 'Minimum 10 characters required'}
                    </span>
                    <span>{textForInference.length.toLocaleString()} characters ready</span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2 text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    <span>How it works</span>
                  </div>
                  <p className="text-[11px]">
                    1. Upload an image or PDF. The engine performs image preprocessing and OCR extraction.
                  </p>
                  <p className="text-[11px]">
                    2. Click <strong>Run Extraction</strong> to categorize the document and extract structured clinical fields with confidence tagging.
                  </p>
                  <p className="text-[11px]">
                    3. Review flagged fields in the side-by-side view before committing to the patient record.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* AFTER EXTRACTION: 40/60 Sticky Side-by-Side Review Layout */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
          {/* LEFT PANEL (40% width): Sticky Document Viewer */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] flex flex-col space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <h2 className="text-sm font-semibold text-foreground truncate">
                  Source Document
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            </div>

            {file && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span className="truncate max-w-[200px]" title={file.name}>
                  {file.name}
                </span>
                <span className="font-mono">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            )}

            <DocumentViewer
              file={file}
              ocrLines={lastOcrResult?.lines ?? null}
              activeFieldSource={activeFieldSource}
            />
          </div>

          {/* RIGHT PANEL (60% width): Scrollable Field Review & Save Controls */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-sm space-y-5 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            {/* Header & Meta Row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Extracted Fields Review
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runExtraction}
                  disabled={isRunning}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Re-extract
                </Button>
              </div>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <div>
                  Type: <span className="font-semibold text-foreground capitalize">{result.document_type.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  Inference: <span className="font-semibold text-foreground">{result.inference_time_ms}ms</span>
                </div>
                {lastOcrResult && (
                  <div>
                    OCR Avg Conf: <span className="font-semibold text-foreground">{Math.round(lastOcrResult.avg_confidence * 100)}%</span>
                  </div>
                )}
                <div className="truncate max-w-[130px]" title={result.model_used}>
                  Model: <span className="font-semibold text-foreground">{result.model_used.split(/[\/\\]/).pop()}</span>
                </div>
              </div>
            </div>

            {/* Review Summary Bar */}
            <ReviewSummaryBar {...summaryStats} />

            {/* Structured Field Renderer with Line Highlight linkage */}
            <div className="rounded-lg border bg-card p-3">
              <FieldRenderer
                data={result.data}
                onFieldChange={editField}
                onFieldApprove={approveField}
                reviewState={reviewState}
                onFieldFocus={setActiveFieldSource}
              />
            </div>

            {/* Collapsible Raw Model Output */}
            {result.raw_response && (
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRawOutput(!showRawOutput)}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {showRawOutput ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showRawOutput ? 'Hide raw model output' : 'Show raw model output'}
                </button>
                {showRawOutput && (
                  <pre className="max-h-48 overflow-x-auto rounded-md bg-muted p-2.5 text-[10px] font-mono text-foreground whitespace-pre-wrap">
                    {result.raw_response}
                  </pre>
                )}
              </div>
            )}

            {/* Save & Patient Association Section */}
            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Commit to Patient Record
                </h3>
              </div>

              {saveResult.success ? (
                <div className="flex flex-col items-center justify-center p-5 text-center space-y-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      Saved successfully!
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Document, clinical records, and immutable audit log created in patient profile.
                    </p>
                    {saveResult.auditLogId && (
                      <p className="text-xs font-mono text-muted-foreground pt-1">
                        Audit Log ID: {saveResult.auditLogId}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                    <Button asChild size="sm" className="flex-1 text-xs gap-1.5">
                      <Link href={`/patients/${selectedPatientId}`}>
                        View Patient Record <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAll}
                      className="flex-1 text-xs"
                    >
                      Process Another Document
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Patient Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Target patient for linking:
                    </label>
                    <select
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      disabled={patientsLoading || !result?.data}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      aria-label="Target patient selector"
                    >
                      <option value="">Select patient to link this document to...</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.dob ? `DOB: ${p.dob}` : 'No DOB'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Summary of what will be created */}
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
                    <p className="font-semibold text-foreground">Records to be created:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                      <li>
                        1 Document in <strong>Documents tab</strong> ({result.document_type})
                      </li>
                      {['prescription', 'opd_case_paper'].includes(result.document_type) && (
                        <li>
                          {Array.isArray(result.data.medications) ? result.data.medications.length : 0} Medication orders in <strong>Prescriptions tab</strong>
                        </li>
                      )}
                      {result.document_type === 'lab_report' && (
                        <li>
                          1 Lab Report in <strong>Lab Results tab</strong>
                        </li>
                      )}
                      <li>
                        1 Immutable Audit Log &amp; field correction records
                      </li>
                    </ul>
                  </div>

                  {/* Save Button */}
                  <div className="space-y-2 pt-2">
                    <Button
                      disabled={
                        !result?.success ||
                        !selectedPatientId ||
                        isSaving ||
                        saveResult.success ||
                        !summaryStats.allReviewed
                      }
                      onClick={handleSave}
                      className="w-full gap-2 text-xs font-semibold"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving to EHR...
                        </>
                      ) : (
                        <>
                          <FileCheck className="h-4 w-4" />
                          Save to Patient Record
                        </>
                      )}
                    </Button>

                    {!summaryStats.allReviewed ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
                        {summaryStats.pendingCount} field{summaryStats.pendingCount !== 1 ? 's' : ''} still require review before saving
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
                        ✓ All fields reviewed — ready to save
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
