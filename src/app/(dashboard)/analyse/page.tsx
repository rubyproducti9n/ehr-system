'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Info,
  X,
  Send,
  FileCheck,
  Lock,
} from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAppStore } from '@/store/useAppStore'
import { usePatients } from '@/hooks/usePatients'
import { useGeminiStatus } from '@/hooks/useGeminiStatus'
import { useReviewState } from '@/hooks/useReviewState'
import { ModelStatusBadge } from '@/components/dev/ModelStatusBadge'
import { ReviewSummaryBar } from '@/components/dev/ReviewSummaryBar'
import { FieldRenderer } from '@/components/dev/FieldRenderer'
import { createDocument } from '@/lib/services/documentService'
import { createPrescription } from '@/lib/services/prescriptionService'
import { createLabResult } from '@/lib/services/labResultService'
import { createAdtEvent } from '@/lib/services/adtService'
import { createEncounter } from '@/lib/services/encounterService'
import { createAuditLog, logFieldCorrections } from '@/lib/services/auditService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Document, FieldCorrection } from '@/types'
import { cn } from '@/lib/utils'

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

interface GeminiExtractResponse {
  success: boolean
  document_type?: string
  data: Record<string, unknown> | null
  raw_response: string | null
  token_usage?: {
    input: number
    output: number
    total: number
  }
  model_used: string
  error?: string
}

function buildDocumentTitle(docType: string, data: Record<string, unknown>): string {
  const dateVal =
    (data.date as { value?: string } | undefined)?.value ??
    formatDate(new Date().toISOString())
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

function AnalyseContent() {
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const hospitalId = useAppStore((state) => state.hospitalId)
  const appSettings = useAppStore((state) => state.appSettings)
  const isFeatureEnabled = useAppStore((state) => state.isFeatureEnabled)
  const { patients, loading: patientsLoading } = usePatients()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const documentId = searchParams.get('documentId')
  const patientIdParam = searchParams.get('patientId')
  const fileUrlParam = searchParams.get('fileUrl')

  const gemini = useGeminiStatus(currentUser?.email, userRole)

  // Model Selection
  const [selectedModel, setSelectedModel] = useState<string>(appSettings?.aiModel || 'gemini-3.8-flash')
  const [supportedModels, setSupportedModels] = useState<string[]>([
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
  ])

  useEffect(() => {
    if (gemini.supportedModels && gemini.supportedModels.length > 0) {
      setSupportedModels(gemini.supportedModels)
    }
    if (appSettings?.aiModel) {
      setSelectedModel(appSettings.aiModel)
    } else if (gemini.model) {
      setSelectedModel((prev) => (gemini.supportedModels?.includes(prev) ? prev : gemini.model!))
    }
  }, [gemini.supportedModels, gemini.model, appSettings?.aiModel])

  // Local state
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState<GeminiExtractResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeFieldSource, setActiveFieldSource] = useState<string | null>(null)
  const [loadedDocTitle, setLoadedDocTitle] = useState<string | null>(null)

  // Save state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-load document from URL params if provided
  useEffect(() => {
    if (documentId && patientIdParam && fileUrlParam) {
      setSelectedPatientId(patientIdParam)
      const decodedUrl = decodeURIComponent(fileUrlParam)
      const filename = decodedUrl.split(/[\/\\]/).pop() || 'patient_document.jpg'
      setLoadedDocTitle(filename)

      const fetchDocFile = async () => {
        try {
          const res = await fetch(decodedUrl)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const blob = await res.blob()
          const fileObj = new File([blob], filename, {
            type: blob.type || 'image/jpeg',
          })
          setFile(fileObj)
          setResult(null)
          setError(null)
          setSaveSuccess(false)
          setSavedPatientId(null)
          setActiveFieldSource(null)
        } catch (err) {
          console.error('Failed to load document from URL:', err)
          toast({
            title: 'Failed to load document',
            description: 'Could not fetch the document image from storage.',
            variant: 'destructive',
          })
        }
      }

      fetchDocFile()
    }
  }, [documentId, patientIdParam, fileUrlParam, toast])

  // Clean up object URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [file])

  // Review State for extracted fields
  const {
    reviewState,
    editedData,
    summaryStats,
    approveField,
    editField,
    resetReview,
  } = useReviewState(result?.data ?? null)

  const handleFileSelect = (selected: File) => {
    if (!selected.type.startsWith('image/')) {
      toast({
        title: 'Unsupported file type',
        description: 'Please upload an image file (PNG, JPG, WEBP).',
        variant: 'destructive',
      })
      return
    }
    setFile(selected)
    setLoadedDocTitle(null)
    setResult(null)
    setError(null)
    setSaveSuccess(false)
    setSavedPatientId(null)
    setActiveFieldSource(null)
    resetReview()
  }

  const handleClear = () => {
    setFile(null)
    setLoadedDocTitle(null)
    setResult(null)
    setError(null)
    setSaveSuccess(false)
    setSavedPatientId(null)
    setActiveFieldSource(null)
    setElapsedSeconds(0)
    resetReview()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const runGeminiExtraction = async () => {
    if (!file || !currentUser?.email) return
    setIsExtracting(true)
    setElapsedSeconds(0)
    setResult(null)
    setError(null)
    setSaveSuccess(false)
    setSavedPatientId(null)
    setActiveFieldSource(null)
    resetReview()

    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-email': currentUser.email,
      }
      if (userRole) {
        headers['x-user-role'] = userRole
      }

      const response = await fetch('/api/dev/gemini/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_base64: base64,
          mime_type: file.type,
          filename: file.name,
          model: selectedModel,
        }),
      })

      const data: GeminiExtractResponse = await response.json()
      if (!data.success) {
        setError(data.error ?? 'Extraction failed')
      } else {
        setResult(data)
        toast({
          title: 'AI service connected successfully',
          description: 'Document information extracted successfully.',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      clearInterval(timer)
      setIsExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!result?.data || !selectedPatientId || !currentUser?.email || !hospitalId) return

    setIsSaving(true)
    try {
      const data = editedData
      const now = new Date().toISOString()
      const docType = result.document_type || 'prescription'

      // 1. Create Document record
      await createDocument(hospitalId, selectedPatientId, {
        patientId: selectedPatientId,
        title: buildDocumentTitle(docType, data),
        documentType: mapToDocumentType(docType),
        annotation: `Extracted via Cloud AI on ${formatDate(now)}`,
        fileUrl: '',
        uploadedBy: currentUser.email,
      })

      // 2. Create Prescription records for prescriptions & OPD papers
      if (['prescription', 'opd_case_paper'].includes(docType)) {
        const medications = Array.isArray(data.medications) ? data.medications : []
        for (const med of medications) {
          if (!med || typeof med !== 'object') continue
          const medObj = med as Record<string, unknown>
          if (!medObj.name) continue
          await createPrescription(hospitalId, selectedPatientId, {
            patientId: selectedPatientId,
            medicationName: String(medObj.name),
            dosage: medObj.dosage ? String(medObj.dosage) : '',
            frequency: medObj.frequency_decoded
              ? String(medObj.frequency_decoded)
              : medObj.frequency
              ? String(medObj.frequency)
              : '',
            route: medObj.route ? String(medObj.route) : 'Oral',
            prescribedDate: now,
            prescribingDoctorId: '',
            status: 'active',
            notes: `Source: "${medObj.source_text ? String(medObj.source_text) : ''}" · AI extracted`,
          })
        }
      }

      // 3. Create Lab Result record if lab report
      if (docType === 'lab_report') {
        const tests = Array.isArray(data.tests) ? data.tests : []
        const content = tests
          .map(
            (t: Record<string, unknown>) =>
              `${t.test_name ?? 'Unknown'}: ${t.value ?? '—'} ${t.unit ?? ''} (ref: ${t.reference_range ?? '—'})`
          )
          .join('\n')
        await createLabResult(hospitalId, selectedPatientId, {
          patientId: selectedPatientId,
          title: `Lab Report — ${formatDate(now)}`,
          content: content || 'No tests extracted',
          resultDate: now,
          providerId: '',
        })
      }

      // 4. Create ADT Event if discharge summary
      if (docType === 'discharge_summary') {
        await createAdtEvent(hospitalId, selectedPatientId, {
          patientId: selectedPatientId,
          admitDate: null,
          dischargedDate: now,
          reAdmitDate: null,
          effectiveDate: now,
          notes: 'Discharge summary imported via AI extraction',
        })
      }

      // 5. Create Encounter
      await createEncounter(hospitalId, selectedPatientId, {
        patientId: selectedPatientId,
        visitDate: now,
        providerId: '',
        summary: `Clinical document analysed by Cloud AI service`,
        transcript: '',
      })

      // 6. Build and write Audit Log
      const auditLogId = await createAuditLog(hospitalId, {
        timestamp: new Date().toISOString(),
        documentType: docType,
        patientId: selectedPatientId,
        performedBy: currentUser.email,
        ocrConfidence: 100,
        totalFields: summaryStats.total,
        autoApprovedFields: summaryStats.highCount,
        manuallyApprovedFields: summaryStats.approvedCount,
        editedFields: summaryStats.editedCount,
        modelUsed: result.model_used || 'cloud-ai',
        inferenceTimeMs: elapsedSeconds * 1000,
        preprocessingApplied: ['vision-direct'],
        rawModelOutput: result.raw_response,
        finalData: editedData,
      })

      // 7. Collect all edited fields and write corrections
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
          documentType: docType,
          patientId: selectedPatientId,
        })
      })
      if (corrections.length > 0) {
        await logFieldCorrections(hospitalId, corrections)
      }

      setSaveSuccess(true)
      setSavedPatientId(selectedPatientId)
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

  if (!isFeatureEnabled('ai_document_analysis')) {
    return (
      <div className="py-12">
        <EmptyState
          icon={Lock}
          title="Feature Disabled"
          description="This feature has been disabled by your administrator."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AI Document Analysis
          </h1>
          <Badge className="border-blue-300 bg-blue-100 text-[10px] font-semibold text-blue-900 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            ONLINE
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Extract patient information, medications, and vitals from prescription images using cloud AI.
        </p>
      </div>

      {/* Status Bar */}
      <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between bg-card">
        <ModelStatusBadge showGeminiStatus={true} hideLocalStatus={true} size="md" />

        {!gemini.configured ? (
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              AI service not configured.{' '}
              <Link href="/settings" className="underline hover:text-amber-900 font-semibold">
                Go to Settings to configure API key
              </Link>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>AI Engine: Active</span>
          </div>
        )}
      </div>

      {/* Info Banner when loaded from patient documents */}
      {loadedDocTitle && file && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            Loaded from patient documents — <strong>{loadedDocTitle}</strong>
          </span>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 40% Upload & Preview (Sticky) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Document Image
              </span>
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={isExtracting}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>

            {!file ? (
              /* Upload Drag & Drop Box */
              <div
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
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/20 hover:bg-muted/40'
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Drag and drop prescription image
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  PNG, JPG, WEBP supported
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold"
                >
                  Browse Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0])
                    }
                  }}
                />
              </div>
            ) : (
              /* Image Preview */
              <div className="space-y-3">
                <div className="relative max-h-[500px] overflow-auto rounded-lg border bg-muted/40 p-2 flex items-center justify-center">
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="max-h-[460px] w-auto object-contain rounded shadow-sm"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="truncate max-w-[200px] font-medium text-foreground">
                    {file.name}
                  </span>
                  <span>{Math.round(file.size / 1024)} KB</span>
                </div>
              </div>
            )}

            {/* Active Field Source Display */}
            {activeFieldSource && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40 text-xs">
                <p className="font-semibold text-amber-900 dark:text-amber-300 mb-0.5">
                  Source text:
                </p>
                <p className="font-mono text-amber-800 dark:text-amber-200 break-words">
                  {activeFieldSource}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 60% Extraction, Review & Save */}
        <div className="lg:col-span-7 space-y-4">
          {!file ? (
            /* State Idle: No file */
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground min-h-[360px]">
              <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Upload a prescription image to begin</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Cloud AI will extract patient details, vitals, diagnosis, and medications directly.
              </p>
            </div>
          ) : !result && !error ? (
            /* State Ready / Extracting */
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <h2 className="text-base font-semibold text-foreground">
                    Ready for Document Analysis
                  </h2>
                </div>
                <ModelStatusBadge showGeminiStatus={true} hideLocalStatus={true} size="sm" />
              </div>

              <p className="text-xs text-muted-foreground">
                Click below to analyse the document image for clinical information extraction.
              </p>

              <div className="space-y-2">
                <Button
                  onClick={runGeminiExtraction}
                  disabled={isExtracting || !gemini.configured}
                  className="w-full gap-2 text-sm font-semibold py-6 shadow"
                  title={!gemini.configured ? 'Configure API key in Settings first' : undefined}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {elapsedSeconds < 3 ? 'Sending to AI service...' : 'Waiting for response...'} (
                      {formatElapsed(elapsedSeconds)})
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyse Document
                    </>
                  )}
                </Button>

                {!gemini.configured && (
                  <p className="text-xs text-amber-600 font-medium text-center">
                    API key required — configure in Settings
                  </p>
                )}
              </div>
            </div>
          ) : error ? (
            /* State Error */
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-destructive">
                    Analysis Error
                  </h3>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={runGeminiExtraction}
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </Button>
                <Link
                  href="/settings"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Check Settings <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : result?.data ? (
            /* State Extracted: Results & Review */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  Extracted Information
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Analyse Another Document
                </Button>
              </div>

              {/* Review Summary Bar */}
              <ReviewSummaryBar {...summaryStats} />

              {/* Field Review Renderer */}
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <FieldRenderer
                  data={result.data}
                  onFieldChange={editField}
                  onFieldApprove={approveField}
                  reviewState={reviewState}
                  onFieldFocus={setActiveFieldSource}
                />
              </div>

              {/* Patient Selection & Save Record */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Save to Patient Record
                  </h3>
                </div>

                {saveSuccess ? (
                  <div className="space-y-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-xs dark:border-emerald-800 dark:bg-emerald-950/40">
                    <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Analysis saved successfully!
                    </div>
                    <p className="text-emerald-800 dark:text-emerald-300">
                      Document, prescriptions, clinical encounters, and audit log have been recorded.
                    </p>
                    {savedPatientId && (
                      <Link
                        href={`/patients/${savedPatientId}`}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400 pt-1"
                      >
                        View Patient Record <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Select Patient:
                      </label>
                      <select
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        disabled={patientsLoading || isSaving}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">-- Choose a patient --</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.dob ? `DOB: ${p.dob}` : 'No DOB'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!summaryStats.allReviewed && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Please review and confirm all fields before saving.
                      </p>
                    )}

                    <Button
                      onClick={handleSave}
                      disabled={
                        !summaryStats.allReviewed ||
                        !selectedPatientId ||
                        isSaving
                      }
                      className="w-full gap-2 text-xs font-semibold"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving to Record...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Save to Patient Record
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function AnalysePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Document Analysis...</div>}>
      <AnalyseContent />
    </Suspense>
  )
}
