'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileText,
  Layers,
  Activity,
  Pill,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { Document, FieldCorrection } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { useReviewState } from '@/hooks/useReviewState'
import { extractTextFromFile } from '@/lib/documentTextExtractor'
import { DocumentViewer, OcrLine } from '@/components/dev/DocumentViewer'
import { FieldRenderer } from '@/components/dev/FieldRenderer'
import { ReviewSummaryBar } from '@/components/dev/ReviewSummaryBar'
import { ModelStatusBadge } from '@/components/dev/ModelStatusBadge'
import { createPrescription } from '@/lib/services/prescriptionService'
import { createEncounter } from '@/lib/services/encounterService'
import { createLabResult } from '@/lib/services/labResultService'
import { createAdtEvent } from '@/lib/services/adtService'
import { updatePatient } from '@/lib/services/patientService'
import { updateDocument } from '@/lib/services/documentService'
import { createAuditLog, logFieldCorrections } from '@/lib/services/auditService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DocumentAnalysisSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document
  patientId: string
}

interface OcrResult {
  avg_confidence: number
  preprocessing_applied: string[]
  lines: OcrLine[]
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

const formatElapsed = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export function DocumentAnalysisSheet({
  open,
  onOpenChange,
  document: doc,
  patientId,
}: DocumentAnalysisSheetProps) {
  const router = useRouter()
  const { toast } = useToast()
  const currentUser = useAppStore((state) => state.currentUser)
  const appSettings = useAppStore((state) => state.appSettings)

  const [step, setStep] = useState<
    'loading-file' | 'ocr-running' | 'ocr-done' | 'extracting' | 'reviewing' | 'saving' | 'done'
  >('loading-file')
  const [error, setError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Document file & OCR & LLM extraction
  const [fileObject, setFileObject] = useState<File | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [extractionResult, setExtractionResult] = useState<ExtractResponse | null>(null)
  const [showRawOutput, setShowRawOutput] = useState(false)
  const [activeFieldSource, setActiveFieldSource] = useState<string | null>(null)

  // Creation summary
  const [createdSummary, setCreatedSummary] = useState<{
    prescriptions: number
    labResults: number
    adtEvents: number
    encounters: number
  }>({ prescriptions: 0, labResults: 0, adtEvents: 0, encounters: 0 })

  // Review State for extracted fields
  const {
    reviewState,
    editedData,
    summaryStats,
    approveField,
    editField,
    resetReview,
  } = useReviewState(extractionResult?.data ?? null)

  const isStoredFile =
    Boolean(doc.fileUrl) &&
    Boolean(appSettings?.storageLocation) &&
    doc.fileUrl.startsWith(appSettings!.storageLocation!)

  const filename = doc.fileUrl ? doc.fileUrl.split(/[\/\\]/).pop() : ''
  const previewUrl =
    isStoredFile && filename
      ? `http://127.0.0.1:8765/patient-docs/${patientId}/${filename}`
      : doc.fileUrl && (doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://'))
      ? doc.fileUrl
      : ''

  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = () => {
    setElapsedSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => stopTimer()
  }, [])

  // Start analysis pipeline on open
  useEffect(() => {
    if (!open) {
      stopTimer()
      setStep('loading-file')
      setFileObject(null)
      setOcrResult(null)
      setExtractedText('')
      setExtractionResult(null)
      setError(null)
      setActiveFieldSource(null)
      resetReview()
      return
    }

    runPipeline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc.id])

  const runPipeline = async () => {
    if (!currentUser?.email) return
    setError(null)
    setStep('loading-file')
    startTimer()

    try {
      if (!previewUrl) {
        throw new Error(
          'Document file is not accessible from local storage. Ensure storage location is configured.'
        )
      }

      // Step 1: Load file blob from static server
      const fileRes = await fetch(previewUrl)
      if (!fileRes.ok) {
        throw new Error(`Failed to load file from storage (HTTP ${fileRes.status})`)
      }
      const blob = await fileRes.blob()
      const ext = (doc.fileUrl || '').split('.').pop()?.toLowerCase() || 'jpg'
      const mimeType =
        ext === 'pdf'
          ? 'application/pdf'
          : ext === 'png'
          ? 'image/png'
          : 'image/jpeg'
      const file = new File([blob], filename || doc.title, { type: mimeType })
      setFileObject(file)

      // Step 2: OCR Running
      setStep('ocr-running')
      const ocrExtraction = await extractTextFromFile(file, currentUser.email)
      const text = ocrExtraction.text.trim()
      setExtractedText(text)

      if (ocrExtraction.ocrResult) {
        setOcrResult(ocrExtraction.ocrResult as OcrResult)
      }

      if (!text || text.length < 5) {
        throw new Error(
          ocrExtraction.warning ||
            'OCR could not extract readable text from this document.'
        )
      }

      // Step 3: LLM Extraction
      setStep('extracting')
      const llmRes = await fetch('/api/dev/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify({
          text,
          document_type: 'auto',
        }),
      })

      if (!llmRes.ok) {
        const errorData = await llmRes.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.detail || 'Extraction request failed')
      }

      const data: ExtractResponse = await llmRes.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'AI extraction failed to produce structured data')
      }

      setExtractionResult(data)
      setStep('reviewing')
      stopTimer()
    } catch (err: unknown) {
      stopTimer()
      const message = err instanceof Error ? err.message : 'Analysis pipeline failed'
      setError(message)
    }
  }

  const hospitalId = useAppStore((state) => state.hospitalId)

  const handleSave = async () => {
    if (!extractionResult?.data || !currentUser?.email || !hospitalId) return
    setStep('saving')

    try {
      const data = editedData
      const docType = extractionResult.document_type
      const now = new Date().toISOString()
      let pCount = 0
      let lCount = 0
      let aCount = 0
      let eCount = 0

      // 1. Prescriptions & OPD Case Papers
      if (['prescription', 'opd_case_paper'].includes(docType)) {
        const medications = Array.isArray(data.medications) ? data.medications : []
        for (const med of medications) {
          if (!med || typeof med !== 'object') continue
          const m = med as Record<string, unknown>
          if (!m.name) continue

          await createPrescription(hospitalId, patientId, {
            patientId,
            medicationName: String(m.name),
            dosage: m.dosage ? String(m.dosage) : '',
            frequency: String(m.frequency_decoded ?? m.frequency ?? ''),
            route: m.route ? String(m.route) : 'Oral',
            prescribedDate: String(
              (data.date as { value?: string } | undefined)?.value ?? now
            ),
            prescribingDoctorId: '',
            status: 'active',
            notes: `AI extracted. Source: "${m.source_text ? String(m.source_text) : ''}". Generic: ${
              m.generic_name ? String(m.generic_name) : 'unknown'
            }`,
          })
          pCount++
        }
      }

      // 2. OPD Case Papers: Encounter + Patient lastVisitDate
      if (docType === 'opd_case_paper') {
        const visitDate = String(
          (data.date as { value?: string } | undefined)?.value ?? now
        )
        const diagVal = String(
          (data.diagnosis as { value?: string } | undefined)?.value ?? 'Not extracted'
        )
        const facVal = String(
          (data.facility_name as { value?: string } | undefined)?.value ?? 'Unknown'
        )

        await createEncounter(hospitalId, patientId, {
          patientId,
          visitDate,
          providerId: '',
          summary: `OPD Visit. Diagnosis: ${diagVal}. Facility: ${facVal}`,
          transcript: '',
        })
        eCount++

        await updatePatient(hospitalId, patientId, {
          lastVisitDate: visitDate,
        })
      }

      // 3. Lab Report: Lab Result Record
      if (docType === 'lab_report') {
        const tests = Array.isArray(data.tests) ? data.tests : []
        const content = tests
          .map(
            (t: Record<string, unknown>) =>
              `${t.test_name ?? 'Unknown'}: ${t.value ?? '—'} ${t.unit ?? ''} (ref: ${
                t.reference_range ?? '—'
              }) [${t.flag ?? 'normal'}]`
          )
          .join('\n')

        const collDate = String(
          (data.collection_date as { value?: string } | undefined)?.value ?? now
        )

        await createLabResult(hospitalId, patientId, {
          patientId,
          title: `Lab Report — ${formatDate(collDate)}`,
          content: content || 'No tests extracted',
          resultDate: collDate,
          providerId: '',
        })
        lCount++
      }

      // 4. Discharge Summary: ADT Event + Discharge Prescriptions
      if (docType === 'discharge_summary') {
        const admitDate =
          (data.admission_date as { value?: string } | undefined)?.value ?? null
        const dischargeDate =
          (data.discharge_date as { value?: string } | undefined)?.value ?? null
        const finalDiag =
          (data.final_diagnosis as { value?: string } | undefined)?.value ??
          'Not extracted'

        await createAdtEvent(hospitalId, patientId, {
          patientId,
          admitDate,
          dischargedDate: dischargeDate,
          reAdmitDate: null,
          effectiveDate: dischargeDate,
          notes: `AI extracted from discharge summary. Final diagnosis: ${finalDiag}`,
        })
        aCount++

        const dischargeMeds = Array.isArray(data.discharge_medications)
          ? data.discharge_medications
          : Array.isArray(data.medications)
          ? data.medications
          : []

        for (const med of dischargeMeds) {
          if (!med || typeof med !== 'object') continue
          const m = med as Record<string, unknown>
          if (!m.name) continue

          await createPrescription(hospitalId, patientId, {
            patientId,
            medicationName: String(m.name),
            dosage: m.dosage ? String(m.dosage) : '',
            frequency: String(m.frequency_decoded ?? m.frequency ?? ''),
            route: m.route ? String(m.route) : 'Oral',
            prescribedDate: dischargeDate || now,
            prescribingDoctorId: '',
            status: 'active',
            notes: `AI extracted from discharge summary. Source: "${
              m.source_text ? String(m.source_text) : ''
            }". Generic: ${m.generic_name ? String(m.generic_name) : 'unknown'}`,
          })
          pCount++
        }
      }

      // 5. Immutable Audit Log
      const auditLogId = await createAuditLog(hospitalId, {
        timestamp: new Date().toISOString(),
        documentType: extractionResult.document_type,
        patientId,
        performedBy: currentUser.email,
        ocrConfidence: ocrResult?.avg_confidence ?? 0,
        totalFields: summaryStats.total,
        autoApprovedFields: summaryStats.highCount,
        manuallyApprovedFields: summaryStats.approvedCount,
        editedFields: summaryStats.editedCount,
        modelUsed: extractionResult.model_used,
        inferenceTimeMs: extractionResult.inference_time_ms,
        preprocessingApplied: ocrResult?.preprocessing_applied ?? [],
        rawModelOutput: extractionResult.raw_response,
        finalData: editedData,
      })

      // 6. Field Corrections
      const corrections: Omit<FieldCorrection, 'id'>[] = []
      Object.entries(reviewState).forEach(([path, status]) => {
        if (status !== 'edited') return
        const original = getValueAtPath(extractionResult.data!, path)
        const corrected = getValueAtPath(editedData, path)
        corrections.push({
          auditLogId,
          fieldPath: path,
          originalValue:
            original !== null && original !== undefined ? String(original) : null,
          correctedValue: String(corrected ?? ''),
          correctedBy: currentUser.email,
          correctedAt: new Date().toISOString(),
          confidence: getConfidenceAtPath(extractionResult.data!, path),
          documentType: extractionResult.document_type,
          patientId,
        })
      })
      if (corrections.length > 0) {
        await logFieldCorrections(hospitalId, corrections)
      }

      // 7. Update Document Record annotation with AI stamp
      const currentAnnotation = doc.annotation?.trim() || ''
      const stamp = `AI analysed on ${formatDate(new Date().toISOString())}`
      const updatedAnnotation = currentAnnotation
        ? `${currentAnnotation} | ${stamp}`
        : stamp

      await updateDocument(hospitalId, patientId, doc.id, {
        annotation: updatedAnnotation,
      })

      setCreatedSummary({
        prescriptions: pCount,
        labResults: lCount,
        adtEvents: aCount,
        encounters: eCount,
      })

      setStep('done')
      toast({
        title: 'Analysis Saved to Record',
        description: 'Clinical records, audit log, and document status updated.',
      })
    } catch (err: unknown) {
      setStep('reviewing')
      const message = err instanceof Error ? err.message : 'Save operation failed'
      toast({
        title: 'Save Failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-4xl p-6 flex flex-col justify-between overflow-y-auto w-full"
      >
        <div className="space-y-4">
          <SheetHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
              <SheetTitle className="text-lg font-bold text-foreground truncate">
                Analyse Document — {doc.title}
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Extract and review clinical data from this document
            </SheetDescription>
          </SheetHeader>

          {/* Error State */}
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive">
              <XCircle className="h-10 w-10" />
              <div>
                <p className="text-sm font-semibold">Analysis Failed</p>
                <p className="text-xs mt-1 text-muted-foreground max-w-md">
                  {error}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={runPipeline}
                className="gap-1.5 text-xs mt-2"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry Analysis
              </Button>
            </div>
          ) : step === 'done' ? (
            /* DONE: SUCCESS STATE */
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                  Analysis complete
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Created:{' '}
                  <strong>{createdSummary.prescriptions}</strong> prescriptions,{' '}
                  <strong>{createdSummary.labResults}</strong> lab results,{' '}
                  <strong>{createdSummary.adtEvents}</strong> ADT events,{' '}
                  <strong>{createdSummary.encounters}</strong> encounters
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                {createdSummary.prescriptions > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false)
                      router.push(`/patients/${patientId}?tab=rx`)
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Pill className="h-3.5 w-3.5 text-primary" /> View Prescriptions
                  </Button>
                )}
                {createdSummary.labResults > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false)
                      router.push(`/patients/${patientId}?tab=lab`)
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Activity className="h-3.5 w-3.5 text-primary" /> View Lab Results
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            /* SIDE-BY-SIDE TWO-COLUMN LAYOUT */
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              {/* LEFT COLUMN (40%): Document Viewer */}
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground border-b pb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Document Preview</span>
                </div>

                {fileObject ? (
                  <DocumentViewer
                    file={fileObject}
                    ocrLines={ocrResult?.lines ?? null}
                    activeFieldSource={activeFieldSource}
                  />
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                    <p className="text-xs">Loading document...</p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (60%): Status / Review / Save */}
              <div className="lg:col-span-3 rounded-xl border border-border bg-card p-4 space-y-4">
                {step === 'loading-file' && (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 rounded-lg border border-dashed min-h-[220px]">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs font-semibold text-foreground">
                      Loading document from storage...
                    </p>
                  </div>
                )}

                {step === 'ocr-running' && (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-2.5 rounded-lg border border-dashed min-h-[220px]">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Running OCR on document...
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        Elapsed: {formatElapsed(elapsedSeconds)}
                      </p>
                    </div>
                  </div>
                )}

                {step === 'extracting' && (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-2.5 rounded-lg border border-dashed min-h-[220px]">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Extracting fields with local AI model...
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        Elapsed: {formatElapsed(elapsedSeconds)}
                      </p>
                    </div>
                  </div>
                )}

                {step === 'saving' && (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-2.5 rounded-lg border border-dashed min-h-[220px]">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs font-semibold text-foreground">
                      Saving to patient record...
                    </p>
                  </div>
                )}

                {step === 'reviewing' && extractionResult?.data && (
                  <div className="space-y-4">
                    {/* Header meta */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      <div>
                        Type:{' '}
                        <span className="font-semibold text-foreground capitalize">
                          {extractionResult.document_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div>
                        Inference:{' '}
                        <span className="font-semibold text-foreground">
                          {extractionResult.inference_time_ms}ms
                        </span>
                      </div>
                      {ocrResult && (
                        <div>
                          OCR Conf:{' '}
                          <span className="font-semibold text-foreground">
                            {Math.round(ocrResult.avg_confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Review Summary Bar */}
                    <ReviewSummaryBar {...summaryStats} />

                    {/* Structured Fields Renderer */}
                    <div className="max-h-[300px] overflow-y-auto rounded-lg border bg-card p-2.5">
                      <FieldRenderer
                        data={extractionResult.data}
                        onFieldChange={editField}
                        onFieldApprove={approveField}
                        reviewState={reviewState}
                        onFieldFocus={setActiveFieldSource}
                      />
                    </div>

                    {/* Collapsible Raw Output */}
                    {extractionResult.raw_response && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setShowRawOutput(!showRawOutput)}
                          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          {showRawOutput ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          {showRawOutput ? 'Hide raw output' : 'Show raw output'}
                        </button>
                        {showRawOutput && (
                          <pre className="max-h-32 overflow-x-auto rounded bg-muted p-2 text-[10px] font-mono text-foreground whitespace-pre-wrap">
                            {extractionResult.raw_response}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Save Controls */}
                    <div className="rounded-xl border border-border bg-muted/10 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {['prescription', 'opd_case_paper'].includes(
                            extractionResult.document_type
                          ) &&
                            `Will create ${
                              Array.isArray(editedData.medications)
                                ? editedData.medications.length
                                : 0
                            } prescription record(s)`}
                          {extractionResult.document_type === 'lab_report' &&
                            'Will create 1 lab result record'}
                          {extractionResult.document_type === 'discharge_summary' &&
                            'Will create ADT event + prescriptions'}
                        </span>
                        <ModelStatusBadge size="sm" showLabel={true} />
                      </div>

                      <Button
                        onClick={handleSave}
                        disabled={!summaryStats.allReviewed}
                        className="w-full gap-2 text-xs font-semibold"
                      >
                        <FileCheck className="h-4 w-4" /> Save to Patient Record
                      </Button>

                      {!summaryStats.allReviewed ? (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
                          {summaryStats.pendingCount} field
                          {summaryStats.pendingCount !== 1 ? 's' : ''} still require review
                          before saving
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-medium">
                          ✓ All fields reviewed — ready to save
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-3 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
