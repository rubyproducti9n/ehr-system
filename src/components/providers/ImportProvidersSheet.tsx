'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Minus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFacilities } from '@/hooks/useFacilities'
import {
  ColumnMapping,
  ParsedProvider,
  ImportParseResult,
  parseFile,
  applyMapping,
} from '@/lib/importColumnMapper'

interface ImportProvidersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportReady: (providers: ParsedProvider[], facilityId: string) => void
}

type ImportStep = 'upload' | 'mapping' | 'preview'
type FilterTab = 'all' | 'complete' | 'incomplete'

const TARGET_FIELDS: { key: keyof ColumnMapping; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Full Name', placeholder: 'e.g. Dr. Jane Smith' },
  { key: 'specialty', label: 'Specialty', placeholder: 'e.g. Cardiology' },
  { key: 'phone', label: 'Phone Number', placeholder: 'e.g. +1 555-0199' },
  { key: 'email', label: 'Email Address', placeholder: 'e.g. jsmith@hospital.org' },
]

export function ImportProvidersSheet({
  open,
  onOpenChange,
  onImportReady,
}: ImportProvidersSheetProps) {
  const { facilities, loading: facilitiesLoading } = useFacilities()

  // Step state
  const [step, setStep] = useState<ImportStep>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  // Parsed file state
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null)
  const [currentMapping, setCurrentMapping] = useState<ColumnMapping>({
    name: null,
    specialty: null,
    phone: null,
    email: null,
  })
  const [confidenceMap, setConfidenceMap] = useState<Record<keyof ColumnMapping, 'exact' | 'fuzzy' | 'none'>>({
    name: 'none',
    specialty: 'none',
    phone: 'none',
    email: 'none',
  })

  // Facility assignment
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('')

  // Step 3 state
  const [parsedProviders, setParsedProviders] = useState<ParsedProvider[]>([])
  const [filterTab, setFilterTab] = useState<FilterTab>('all')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Reset state when opened or closed
  useEffect(() => {
    if (open) {
      setStep('upload')
      setSelectedFile(null)
      setParsing(false)
      setParseError(null)
      setParseResult(null)
      setCurrentMapping({ name: null, specialty: null, phone: null, email: null })
      setParsedProviders([])
      setFilterTab('all')
      if (facilities.length === 1) {
        setSelectedFacilityId(facilities[0].id)
      } else {
        setSelectedFacilityId('')
      }
    }
  }, [open, facilities])

  // Handle file selection
  const handleFile = async (file: File) => {
    const validExts = ['.xlsx', '.xls', '.csv']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validExts.includes(ext)) {
      setParseError('Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.')
      return
    }

    setSelectedFile(file)
    setParsing(true)
    setParseError(null)

    const result = await parseFile(file)
    setParsing(false)

    if (result.error) {
      setParseError(result.error)
      return
    }

    setParseResult(result)
    setCurrentMapping(result.detectedMapping)
    setConfidenceMap(result.detectionConfidence)

    if (facilities.length === 1) {
      setSelectedFacilityId(facilities[0].id)
    }

    setStep('mapping')
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  // Live preview for first 3 rows in mapping step
  const livePreviewRows = useMemo(() => {
    if (!parseResult || parseResult.rows.length === 0) return []
    return applyMapping(parseResult.rows.slice(0, 3), currentMapping)
  }, [parseResult, currentMapping])

  // Mapping validity check
  const isMappingValid = useMemo(() => {
    if (!selectedFacilityId) return false
    const hasName = Boolean(currentMapping.name)
    const hasOtherField = Boolean(
      currentMapping.specialty || currentMapping.phone || currentMapping.email
    )
    return hasName && hasOtherField
  }, [selectedFacilityId, currentMapping])

  // Advance to Step 3
  const handleProceedToPreview = () => {
    if (!parseResult || !isMappingValid) return
    const allParsed = applyMapping(parseResult.rows, currentMapping)
    setParsedProviders(allParsed)
    setFilterTab('all')
    setStep('preview')
  }

  // Summary counts for Step 3
  const completeCount = useMemo(() => {
    return parsedProviders.filter((p) => p.isComplete).length
  }, [parsedProviders])

  const incompleteCount = useMemo(() => {
    return parsedProviders.length - completeCount
  }, [parsedProviders, completeCount])

  const filteredProviders = useMemo(() => {
    if (filterTab === 'complete') return parsedProviders.filter((p) => p.isComplete)
    if (filterTab === 'incomplete') return parsedProviders.filter((p) => !p.isComplete)
    return parsedProviders
  }, [parsedProviders, filterTab])

  // Proceed to Import
  const handleFinalImport = () => {
    if (!parsedProviders.length || !selectedFacilityId) return
    onImportReady(parsedProviders, selectedFacilityId)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden bg-background"
      >
        {/* Header with Step Indicator */}
        <SheetHeader className="px-6 py-4 border-b shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Providers
            </SheetTitle>
            <div className="flex items-center gap-1.5">
              {(['upload', 'mapping', 'preview'] as ImportStep[]).map((s, idx) => {
                const stepNum = idx + 1
                const isActive = step === s
                const isPassed =
                  (step === 'mapping' && idx === 0) ||
                  (step === 'preview' && (idx === 0 || idx === 1))

                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isPassed
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {stepNum}
                    </span>
                    {idx < 2 && <span className="h-0.5 w-4 bg-muted" />}
                  </div>
                )
              })}
            </div>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {step === 'upload' && 'Step 1 of 3 — Upload your provider spreadsheet (.xlsx, .xls, .csv)'}
            {step === 'mapping' && 'Step 2 of 3 — Confirm column mapping and assign hospital facility'}
            {step === 'preview' && 'Step 3 of 3 — Review parsed data before proceeding to import'}
          </SheetDescription>
        </SheetHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4 pt-2">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[0.99]'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0])
                    }
                  }}
                />

                <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-base mb-1">
                  Drop your Excel or CSV file here
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Drag and drop your spreadsheet or click to browse from your computer
                </p>

                <Button variant="outline" size="sm" type="button" className="pointer-events-none">
                  Select File
                </Button>
              </div>

              {parsing && (
                <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/40 border">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{selectedFile?.name}</p>
                    <p className="text-xs text-muted-foreground">Reading and analyzing columns...</p>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">File Upload Error</p>
                    <p className="text-xs">{parseError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setParseError(null)
                        setSelectedFile(null)
                        fileInputRef.current?.click()
                      }}
                      className="mt-2 h-7 text-xs bg-background text-foreground"
                    >
                      Try another file
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-muted/30 p-4 border text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">File Requirements & Guidelines:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Supported formats: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong></li>
                  <li>Maximum <strong>400 rows</strong> per import batch</li>
                  <li>The first row should contain column headers (e.g. Name, Specialty, Phone, Email)</li>
                  <li>Incomplete rows with missing details can be completed in the next step</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && parseResult && (
            <div className="space-y-6">
              {/* File stats card */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{selectedFile?.name}</span>
                  <span className="text-muted-foreground">
                    ({(Number(selectedFile?.size || 0) / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Badge variant="secondary" className="font-medium text-xs">
                  {parseResult.totalRows} {parseResult.totalRows === 1 ? 'provider' : 'providers'} detected
                </Badge>
              </div>

              {/* Facility Selection */}
              <div className="space-y-2 bg-card p-4 rounded-lg border">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Assign all providers to hospital: <span className="text-destructive">*</span></span>
                  {facilitiesLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </label>
                <select
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  disabled={facilitiesLoading || facilities.length === 0}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {facilitiesLoading
                      ? 'Loading hospitals...'
                      : facilities.length === 0
                      ? 'No hospitals found'
                      : '— Select a hospital facility —'}
                  </option>
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} {fac.address ? `(${fac.address})` : ''}
                    </option>
                  ))}
                </select>
                {facilities.length === 0 && !facilitiesLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>No hospitals configured. Add a hospital first before importing.</span>
                  </div>
                )}
              </div>

              {/* Column Mapping Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Field Mapping
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {parseResult.headers.length} spreadsheet columns available
                  </span>
                </div>

                <div className="border rounded-lg overflow-hidden bg-card divide-y">
                  {TARGET_FIELDS.map((field) => {
                    const currentHeader = currentMapping[field.key]
                    const confidence = confidenceMap[field.key]

                    return (
                      <div
                        key={field.key}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="sm:w-1/3 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">
                              {field.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                              Required
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{field.placeholder}</p>
                        </div>

                        <div className="sm:w-1/2">
                          <select
                            value={currentHeader || ''}
                            onChange={(e) => {
                              const val = e.target.value || null
                              setCurrentMapping((prev) => ({
                                ...prev,
                                [field.key]: val,
                              }))
                              setConfidenceMap((prev) => ({
                                ...prev,
                                [field.key]: val ? 'exact' : 'none',
                              }))
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">(Not in file / leave blank)</option>
                            {parseResult.headers.map((h) => (
                              <option key={h} value={h}>
                                Column: {h}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:w-1/6 flex items-center justify-end">
                          {confidence === 'exact' && (
                            <div
                              className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"
                              title="Auto-detected exact match"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="hidden sm:inline text-[11px]">Match</span>
                            </div>
                          )}
                          {confidence === 'fuzzy' && (
                            <div
                              className="flex items-center gap-1 text-xs text-amber-500 font-medium"
                              title="Detected via fuzzy similarity"
                            >
                              <HelpCircle className="h-4 w-4" />
                              <span className="hidden sm:inline text-[11px]">Fuzzy</span>
                            </div>
                          )}
                          {confidence === 'none' && (
                            <div
                              className="flex items-center gap-1 text-xs text-muted-foreground"
                              title="Not mapped"
                            >
                              <Minus className="h-4 w-4" />
                              <span className="hidden sm:inline text-[11px]">Unset</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Live Preview of first 3 rows */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Preview (First 3 Rows)
                  </h4>
                  <span className="text-[11px] text-muted-foreground italic">
                    Updates dynamically with dropdown changes
                  </span>
                </div>

                <div className="border rounded-lg overflow-x-auto bg-card">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Specialty</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {livePreviewRows.map((p, idx) => (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="p-2.5 text-center text-muted-foreground">{idx + 1}</td>
                          <td className="p-2.5 font-medium">
                            {p.mapped.name ? (
                              p.mapped.name
                            ) : (
                              <span className="text-destructive italic font-normal">— missing —</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {p.mapped.specialty ? (
                              p.mapped.specialty
                            ) : (
                              <span className="text-destructive italic font-normal">— missing —</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {p.mapped.phone ? (
                              p.mapped.phone
                            ) : (
                              <span className="text-destructive italic font-sans font-normal">— missing —</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {p.mapped.email ? (
                              p.mapped.email
                            ) : (
                              <span className="text-destructive italic font-normal">— missing —</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW ALL ROWS */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-lg p-3.5 bg-card">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Total Rows
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {parsedProviders.length}
                  </p>
                </div>
                <div className="border border-green-500/30 rounded-lg p-3.5 bg-green-50/30 dark:bg-green-950/20">
                  <p className="text-[11px] font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">
                    Complete (Ready)
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-0.5">
                    {completeCount}
                  </p>
                </div>
                <div className="border border-amber-500/30 rounded-lg p-3.5 bg-amber-50/30 dark:bg-amber-950/20">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Need Completion
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {incompleteCount}
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      filterTab === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({parsedProviders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('complete')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      filterTab === 'complete'
                        ? 'bg-background text-green-600 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Ready ({completeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('incomplete')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      filterTab === 'incomplete'
                        ? 'bg-background text-amber-600 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Incomplete ({incompleteCount})
                  </button>
                </div>

                <span className="text-xs text-muted-foreground">
                  Showing {filteredProviders.length} of {parsedProviders.length}
                </span>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-x-auto bg-card max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted border-b">
                    <tr className="font-semibold text-muted-foreground">
                      <th className="p-2.5 w-12 text-center">Row #</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Specialty</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProviders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No providers found in this filter view.
                        </td>
                      </tr>
                    ) : (
                      filteredProviders.map((p) => (
                        <tr key={p.rowIndex} className="hover:bg-muted/10">
                          <td className="p-2.5 text-center text-muted-foreground font-mono">
                            {p.rowIndex + 1}
                          </td>
                          <td className="p-2.5 font-medium">
                            {p.mapped.name || (
                              <span className="text-destructive italic font-normal">— missing —</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {p.mapped.specialty || (
                              <span className="text-destructive italic font-normal">— missing —</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {p.mapped.phone || (
                              <span className="text-destructive italic font-sans font-normal">— missing —</span>
                            )}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {p.mapped.email || (
                              <span className="text-destructive italic font-normal">— missing —</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            {p.isComplete ? (
                              <Badge
                                variant="outline"
                                className="border-green-500/40 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 text-[10px] font-semibold"
                              >
                                Ready
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-semibold"
                              >
                                Incomplete — {p.missingFields.join(', ')}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 border-t shrink-0 bg-muted/20 flex items-center justify-between">
          {step === 'upload' && (
            <div className="flex items-center justify-end w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}

          {step === 'mapping' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('upload')
                  setSelectedFile(null)
                  setParseResult(null)
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Re-upload File
              </Button>

              <Button
                onClick={handleProceedToPreview}
                disabled={!isMappingValid}
                className="gap-1.5"
              >
                Preview All {parseResult?.totalRows ?? 0} Rows
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('mapping')}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Mapping
              </Button>

              <div className="flex items-center gap-3">
                {incompleteCount > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 hidden sm:inline">
                    You will be prompted to complete {incompleteCount} provider{incompleteCount > 1 ? 's' : ''} before import
                  </span>
                )}
                <Button onClick={handleFinalImport} className="gap-1.5">
                  Proceed to Import ({parsedProviders.length} providers)
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
