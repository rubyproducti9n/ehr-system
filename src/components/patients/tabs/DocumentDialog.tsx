'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { Document } from '@/types'
import {
  createDocument,
  updateDocument,
} from '@/lib/services/documentService'
import { DOCUMENT_TYPES, DocumentTypeKey } from '@/lib/documentTypes'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { ModelStatusBadge } from '@/components/dev/ModelStatusBadge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

interface UploadedFileResult {
  originalName: string
  savedName: string
  path: string
  sizeKb: number
  type: 'image' | 'pdf'
}

interface DocumentDialogProps {
  patientId: string
  document?: Document
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentDialog({
  patientId,
  document: doc,
  open,
  onOpenChange,
}: DocumentDialogProps) {
  const router = useRouter()
  const isEdit = !!doc
  const { toast } = useToast()
  const currentUser = useAppStore((state) => state.currentUser)
  const appSettings = useAppStore((state) => state.appSettings)
  const isFeatureEnabled = useAppStore((state) => state.isFeatureEnabled)
  const isFeatureVisible = useAppStore((state) => state.isFeatureVisible)

  // Step 1 vs Step 2 for multi-file upload
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1: Files state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, 'pending' | 'uploading' | 'success' | 'error'>
  >({})
  const [uploadedResults, setUploadedResults] = useState<UploadedFileResult[]>([])

  // Step 2: Metadata form state
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState<DocumentTypeKey>('clinical')
  const [annotation, setAnnotation] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [autoAnalyse, setAutoAnalyse] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{
    title?: string
    documentType?: string
  }>({})

  // Object URLs for image previews
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  // Reset when sheet opens/closes
  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '')
      setDocumentType((doc.documentType as DocumentTypeKey) || 'clinical')
      setAnnotation(doc.annotation || '')
      setFileUrl(doc.fileUrl || '')
      setAutoAnalyse(false)
      setStep(2)
    } else {
      setTitle('')
      setDocumentType('clinical')
      setAnnotation('')
      setFileUrl('')
      setSelectedFiles([])
      setUploadedResults([])
      setUploadProgress({})
      setAutoAnalyse(true)
      setStep(1)
    }
    setErrors({})
  }, [doc, open])

  // Manage preview object URLs
  useEffect(() => {
    const urls: Record<string, string> = {}
    selectedFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        urls[file.name] = URL.createObjectURL(file)
      }
    })
    setPreviewUrls(urls)

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [selectedFiles])

  const handleFileDrop = (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).filter((file) => {
      const ext = file.name.toLowerCase()
      return (
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        ext.endsWith('.jpg') ||
        ext.endsWith('.jpeg') ||
        ext.endsWith('.png') ||
        ext.endsWith('.pdf')
      )
    })

    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const added = valid.filter((f) => !existingNames.has(f.name))
      return [...prev, ...added]
    })
  }

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName))
    setUploadProgress((prev) => {
      const updated = { ...prev }
      delete updated[fileName]
      return updated
    })
  }

  const handleUploadFiles = async () => {
    if (!selectedFiles.length || !currentUser?.email) return

    setUploading(true)
    const initialProgress: Record<string, 'pending' | 'uploading' | 'success' | 'error'> = {}
    selectedFiles.forEach((f) => {
      initialProgress[f.name] = 'uploading'
    })
    setUploadProgress(initialProgress)

    try {
      const formData = new FormData()
      formData.append('patientId', patientId)
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      const res = await fetch('/api/dev/upload', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser.email,
        },
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || `Upload failed with status ${res.status}`)
      }

      const data = await res.json()
      const saved: UploadedFileResult[] = data.files || []

      setUploadedResults(saved)
      const finalProgress: Record<string, 'pending' | 'uploading' | 'success' | 'error'> = {}
      selectedFiles.forEach((f) => {
        finalProgress[f.name] = 'success'
      })
      setUploadProgress(finalProgress)

      // Set default title from first file if empty
      if (!title && selectedFiles.length > 0) {
        const first = selectedFiles[0].name.replace(/\.[^/.]+$/, '')
        setTitle(first.replace(/[-_]/g, ' '))
      }

      // Move to Step 2
      setTimeout(() => {
        setStep(2)
        setUploading(false)
      }, 400)
    } catch (err) {
      setUploading(false)
      const errorProgress: Record<string, 'pending' | 'uploading' | 'success' | 'error'> = {}
      selectedFiles.forEach((f) => {
        errorProgress[f.name] = 'error'
      })
      setUploadProgress(errorProgress)

      toast({
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Unknown upload error',
        variant: 'destructive',
      })
    }
  }

  const validateStep2 = () => {
    const newErrors: { title?: string; documentType?: string } = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters'
    }

    if (!documentType) {
      newErrors.documentType = 'Document type is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const hospitalId = useAppStore((state) => state.hospitalId)

  const handleSaveStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return
    if (!hospitalId) return

    setSubmitting(true)
    try {
      const uploaderName =
        currentUser?.displayName || currentUser?.email || 'Clinical Staff'

      if (isEdit && doc) {
        await updateDocument(hospitalId, patientId, doc.id, {
          title: title.trim(),
          documentType,
          annotation: annotation.trim(),
          fileUrl: fileUrl.trim(),
        })
        toast({
          title: 'Document updated',
          description: 'Document details updated successfully.',
        })
        onOpenChange(false)
      } else {
        let firstSavedDoc: Document | null = null

        // Multi-file creation
        if (uploadedResults.length > 0) {
          for (let i = 0; i < uploadedResults.length; i++) {
            const saved = uploadedResults[i]
            const docTitle =
              uploadedResults.length === 1
                ? title.trim()
                : `${title.trim()} (${i + 1}/${uploadedResults.length})`

            const created = await createDocument(hospitalId, patientId, {
              patientId,
              title: docTitle,
              documentType,
              annotation: annotation.trim(),
              fileUrl: saved.path,
              uploadedBy: uploaderName,
            })
            if (!firstSavedDoc) firstSavedDoc = created
          }
        } else {
          // Manual entry without file
          const created = await createDocument(hospitalId, patientId, {
            patientId,
            title: title.trim(),
            documentType,
            annotation: annotation.trim(),
            fileUrl: fileUrl.trim(),
            uploadedBy: uploaderName,
          })
          firstSavedDoc = created
        }

        const canAutoAnalyse =
          isFeatureVisible('auto_analyse_on_upload') &&
          isFeatureEnabled('auto_analyse_on_upload') &&
          isFeatureVisible('ai_document_analysis') &&
          isFeatureEnabled('ai_document_analysis') &&
          isFeatureVisible('gemini_online_extraction') &&
          isFeatureEnabled('gemini_online_extraction')

        const shouldAnalyse =
          autoAnalyse &&
          canAutoAnalyse &&
          firstSavedDoc &&
          Boolean(firstSavedDoc.fileUrl)

        if (shouldAnalyse && firstSavedDoc) {
          toast({
            title: 'Document saved',
            description: 'Starting AI analysis and clinical extraction...',
          })
          onOpenChange(false)
          const encodedFileUrl = encodeURIComponent(firstSavedDoc.fileUrl || '')
          router.push(
            `/analyse?documentId=${firstSavedDoc.id}&patientId=${patientId}&fileUrl=${encodedFileUrl}`
          )
        } else {
          toast({
            title: 'Documents saved',
            description: `${uploadedResults.length || 1} document(s) saved to patient records.`,
          })
          onOpenChange(false)
        }
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error saving document',
        description: err instanceof Error ? err.message : 'Failed to save document.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[560px] p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-bold text-foreground">
              {isEdit ? 'Edit Document' : step === 1 ? 'Upload Patient Documents' : 'Document Metadata'}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {isEdit
                ? 'Update document record details'
                : step === 1
                ? 'Select or drop prescription images and medical PDFs'
                : 'Review uploaded files and assign metadata'}
            </SheetDescription>
          </SheetHeader>

          {/* STEP 1: File Selection & Upload */}
          {!isEdit && step === 1 && (
            <div className="space-y-4 pt-4">
              {/* Drop Zone */}
              <label
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  handleFileDrop(e.dataTransfer.files)
                }}
                className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => handleFileDrop(e.target.files)}
                  disabled={uploading}
                />
                <div className="mb-2.5 rounded-full bg-muted p-3 text-muted-foreground">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Drop images or PDFs here, or browse
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Supports JPG, PNG, PDF (multiple files allowed)
                </p>
              </label>

              {/* Selected Files Preview List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Selected Files ({selectedFiles.length})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles([])}
                      disabled={uploading}
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Clear all
                    </Button>
                  </div>

                  <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {selectedFiles.map((file) => {
                      const isImg = file.type.startsWith('image/')
                      const previewUrl = previewUrls[file.name]
                      const sizeKb = (file.size / 1024).toFixed(1)
                      const progress = uploadProgress[file.name]

                      return (
                        <div
                          key={file.name}
                          className="flex items-center justify-between rounded-lg border bg-card p-2.5 text-xs shadow-xs gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isImg && previewUrl ? (
                              <div className="h-12 w-12 rounded-md overflow-hidden bg-muted border shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={previewUrl}
                                  alt={file.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border shrink-0">
                                <FileText className="h-6 w-6" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate max-w-[240px]">
                                {file.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {sizeKb} KB {isImg ? '· Image' : '· PDF'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {progress === 'uploading' && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                            {progress === 'success' && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            )}
                            {progress === 'error' && (
                              <Badge variant="destructive" className="text-[10px]">
                                Failed
                              </Badge>
                            )}
                            {!uploading && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFile(file.name)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Remove file"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Document Metadata Form */}
          {(isEdit || step === 2) && (
            <form id="doc-metadata-form" onSubmit={handleSaveStep2} className="space-y-4 pt-4">
              {/* Uploaded Files Summary (if created via upload) */}
              {!isEdit && uploadedResults.length > 0 && (
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <span className="text-xs font-semibold text-foreground">
                    Uploaded Files ({uploadedResults.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {uploadedResults.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] text-muted-foreground bg-background/60 p-1.5 rounded border border-border/40"
                      >
                        <span className="truncate max-w-[240px] font-medium text-foreground">
                          {r.originalName}
                        </span>
                        <span className="font-mono text-[10px]">{r.sizeKb} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="doc-title" className="text-xs font-semibold">
                  Document Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="doc-title"
                  placeholder="e.g. Discharge Summary, Consent Form, Lab Report"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                  className="text-xs"
                />
                {errors.title && (
                  <p className="text-[11px] text-destructive">{errors.title}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-type" className="text-xs font-semibold">
                  Document Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="doc-type"
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(e.target.value as DocumentTypeKey)
                  }
                  disabled={submitting}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
                >
                  {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                {errors.documentType && (
                  <p className="text-[11px] text-destructive">{errors.documentType}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="doc-annotation" className="text-xs font-semibold">
                    Annotation / Notes
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {annotation.length} / 500
                  </span>
                </div>
                <textarea
                  id="doc-annotation"
                  rows={3}
                  maxLength={500}
                  placeholder="Enter clinical notes, remarks, or observations..."
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  disabled={submitting}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50 resize-none"
                />
              </div>

              {/* Auto-Analyse on Upload Feature Flag Controlled Section */}
              {!isEdit &&
                isFeatureVisible('auto_analyse_on_upload') &&
                isFeatureEnabled('auto_analyse_on_upload') &&
                isFeatureVisible('ai_document_analysis') &&
                isFeatureEnabled('ai_document_analysis') &&
                isFeatureVisible('gemini_online_extraction') &&
                isFeatureEnabled('gemini_online_extraction') && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <Label htmlFor="auto-analyse-toggle" className="text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer">
                        Auto-Analyse with AI
                      </Label>
                    </div>
                    <Switch
                      id="auto-analyse-toggle"
                      checked={autoAnalyse}
                      onCheckedChange={setAutoAnalyse}
                      disabled={submitting}
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Extract medications, dosages, lab tests, encounters, and vitals using Cloud AI immediately after saving.
                  </p>
                </div>
              )}

              {isEdit && (
                <div className="space-y-1.5">
                  <Label htmlFor="doc-url" className="text-xs font-semibold">
                    File URL / Path Reference
                  </Label>
                  <Input
                    id="doc-url"
                    placeholder="File path or URL"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    disabled={submitting}
                    className="text-xs font-mono"
                  />
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <SheetFooter className="border-t pt-4 mt-6">
          {!isEdit && step === 1 ? (
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
              <ModelStatusBadge size="sm" showLabel={true} />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={uploading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUploadFiles}
                  disabled={!selectedFiles.length || uploading}
                  className="text-xs font-semibold gap-1.5"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              {!isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Back to Files
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="doc-metadata-form"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save to Records'
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
