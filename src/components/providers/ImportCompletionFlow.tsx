'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  X,
  UserCheck,
  UserX,
  RefreshCw,
  PlusCircle,
  HelpCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/useAppStore'
import { ParsedProvider, exportFailedRowsAsCsv } from '@/lib/importColumnMapper'
import { Provider } from '@/types'
import {
  getProviders,
  createProvider,
  updateProvider,
  checkProviderEmailAvailable,
  registerProviderEmail,
} from '@/lib/services/providerService'
import { addDrPrefix, validatePhone, validateEmail } from '@/lib/utils'
import { writeActivityLog, buildPerformedBy } from '@/lib/services/activityLogService'

interface ImportCompletionFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: ParsedProvider[]
  facilityId: string
  onComplete: (imported: number, skipped: number) => void
}

type Phase =
  | 'completing'
  | 'detecting-duplicates'
  | 'resolving-duplicates'
  | 'writing'
  | 'done'

interface DuplicateMatch {
  incoming: ParsedProvider
  existing: Provider
  matchReason: 'email_match' | 'name_phone_match'
}

type DuplicateResolution = 'skip' | 'overwrite' | 'import_new'

interface ResolvedWriteAction {
  action: 'create' | 'update'
  providerData: {
    name: string
    specialty: string
    phone: string
    email: string
    facilityId: string
    isImported?: boolean
    authProvisioned?: boolean
  }
  existingId?: string
  rawItem: ParsedProvider
}

interface FailedProvider {
  provider: ParsedProvider
  failReason: string
}

export function ImportCompletionFlow({
  open,
  onOpenChange,
  providers,
  facilityId,
  onComplete,
}: ImportCompletionFlowProps) {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)

  const [phase, setPhase] = useState<Phase>('completing')

  // Phase 1 state: incomplete items
  const [incompleteList, setIncompleteList] = useState<ParsedProvider[]>([])
  const [completedList, setCompletedList] = useState<ParsedProvider[]>([])
  const [completionIndex, setCompletionIndex] = useState(0)
  const [confirmSkipOpen, setConfirmSkipOpen] = useState(false)
  const [skippedCount, setSkippedCount] = useState(0)

  // Current incomplete item editing state
  const [editName, setEditName] = useState('')
  const [editSpecialty, setEditSpecialty] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Phase 2 & 3 state: duplicates
  const [duplicateList, setDuplicateList] = useState<DuplicateMatch[]>([])
  const [dupeIndex, setDupeIndex] = useState(0)
  const [nonDupeProviders, setNonDupeProviders] = useState<ParsedProvider[]>([])
  const [resolvedActions, setResolvedActions] = useState<ResolvedWriteAction[]>([])

  // Phase 4 state: writing
  const [writingIndex, setWritingIndex] = useState(0)
  const [totalToWrite, setTotalToWrite] = useState(0)
  const [currentWritingName, setCurrentWritingName] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [failedList, setFailedList] = useState<FailedProvider[]>([])

  // Initialize on open
  useEffect(() => {
    if (open && providers.length > 0) {
      const incomplete = providers.filter((p) => !p.isComplete)
      const complete = providers.filter((p) => p.isComplete)

      setIncompleteList(incomplete)
      setCompletedList(complete)
      setCompletionIndex(0)
      setSkippedCount(0)
      setFailedList([])
      setImportedCount(0)
      setResolvedActions([])
      setConfirmSkipOpen(false)

      if (incomplete.length === 0) {
        // Skip straight to duplicate detection
        setPhase('detecting-duplicates')
      } else {
        setPhase('completing')
        // Pre-fill first incomplete item
        const first = incomplete[0]
        setEditName(first.mapped.name || '')
        setEditSpecialty(first.mapped.specialty || '')
        setEditPhone(first.mapped.phone || '')
        setEditEmail(first.mapped.email || '')
        setFieldErrors({})
      }
    }
  }, [open, providers])

  // Update edit form when completionIndex changes
  useEffect(() => {
    if (phase === 'completing' && incompleteList[completionIndex]) {
      const curr = incompleteList[completionIndex]
      setEditName(curr.mapped.name || '')
      setEditSpecialty(curr.mapped.specialty || '')
      setEditPhone(curr.mapped.phone || '')
      setEditEmail(curr.mapped.email || '')
      setFieldErrors({})
      setConfirmSkipOpen(false)
    }
  }, [phase, completionIndex, incompleteList])

  // ---------------------------------------------------------------------------
  // PHASE 1: Completing Incomplete Rows Handlers
  // ---------------------------------------------------------------------------
  const currentIncomplete = incompleteList[completionIndex]

  const validateEditForm = () => {
    const errors: Record<string, string> = {}
    if (!editName.trim()) {
      errors.name = 'Name is required'
    } else if (editName.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }

    if (!editSpecialty.trim()) {
      errors.specialty = 'Specialty is required'
    }

    if (!editPhone.trim()) {
      errors.phone = 'Phone number is required'
    } else {
      const pErr = validatePhone(editPhone.trim())
      if (pErr) errors.phone = pErr
    }

    if (!editEmail.trim()) {
      errors.email = 'Email address is required'
    } else {
      const eErr = validateEmail(editEmail.trim())
      if (eErr) errors.email = eErr
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveIncomplete = () => {
    if (!validateEditForm() || !currentIncomplete) return

    const updatedProvider: ParsedProvider = {
      ...currentIncomplete,
      mapped: {
        name: addDrPrefix(editName.trim()),
        specialty: editSpecialty.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim().toLowerCase(),
      },
      missingFields: [],
      isComplete: true,
    }

    const nextCompleted = [...completedList, updatedProvider]
    setCompletedList(nextCompleted)

    if (completionIndex + 1 < incompleteList.length) {
      setCompletionIndex((prev) => prev + 1)
    } else {
      // Transition to Phase 2
      setPhase('detecting-duplicates')
    }
  }

  const handleConfirmSkip = () => {
    setSkippedCount((prev) => prev + 1)
    setConfirmSkipOpen(false)

    if (completionIndex + 1 < incompleteList.length) {
      setCompletionIndex((prev) => prev + 1)
    } else {
      // Transition to Phase 2
      setPhase('detecting-duplicates')
    }
  }

  // ---------------------------------------------------------------------------
  // PHASE 2: Duplicate Detection
  // ---------------------------------------------------------------------------
  const runDuplicateDetection = useCallback(async () => {
    if (!hospitalId) {
      setPhase('done')
      return
    }

    try {
      const existingList = await getProviders(hospitalId)
      const allToImport = [...completedList]

      const dupes: DuplicateMatch[] = []
      const nonDupes: ParsedProvider[] = []

      for (const incoming of allToImport) {
        const inEmail = incoming.mapped.email.trim().toLowerCase()
        const inName = incoming.mapped.name.trim().toLowerCase().replace(/^dr\.?\s+/i, '')
        const inPhoneDigits = incoming.mapped.phone.replace(/\D/g, '')

        let matchFound: DuplicateMatch | null = null

        for (const existing of existingList) {
          const exEmail = (existing.email || '').trim().toLowerCase()
          const exName = (existing.name || '').trim().toLowerCase().replace(/^dr\.?\s+/i, '')
          const exPhoneDigits = (existing.phone || '').replace(/\D/g, '')

          // Check Email Match
          if (inEmail && exEmail && inEmail === exEmail) {
            matchFound = {
              incoming,
              existing,
              matchReason: 'email_match',
            }
            break
          }

          // Check Name + Phone Match
          if (
            inName &&
            exName &&
            inName === exName &&
            inPhoneDigits &&
            exPhoneDigits &&
            inPhoneDigits === exPhoneDigits
          ) {
            matchFound = {
              incoming,
              existing,
              matchReason: 'name_phone_match',
            }
            break
          }
        }

        if (matchFound) {
          dupes.push(matchFound)
        } else {
          nonDupes.push(incoming)
        }
      }

      setDuplicateList(dupes)
      setNonDupeProviders(nonDupes)
      setDupeIndex(0)

      if (dupes.length === 0) {
        // Direct write for non-duplicate list
        const initialActions: ResolvedWriteAction[] = nonDupes.map((p) => ({
          action: 'create',
          providerData: {
            name: addDrPrefix(p.mapped.name),
            specialty: p.mapped.specialty,
            phone: p.mapped.phone,
            email: p.mapped.email,
            facilityId,
            isImported: true,
            authProvisioned: false,
          },
          rawItem: p,
        }))
        setResolvedActions(initialActions)
        setPhase('writing')
      } else {
        setPhase('resolving-duplicates')
      }
    } catch (err) {
      console.error('Error checking duplicates:', err)
      // Fallback: Proceed to write non-duplicate items
      setPhase('writing')
    }
  }, [hospitalId, completedList, facilityId])

  useEffect(() => {
    if (phase === 'detecting-duplicates') {
      const timer = setTimeout(() => {
        runDuplicateDetection()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [phase, runDuplicateDetection])

  // ---------------------------------------------------------------------------
  // PHASE 3: Resolving Duplicates
  // ---------------------------------------------------------------------------
  const currentDupe = duplicateList[dupeIndex]

  const handleResolveDuplicate = (resolution: DuplicateResolution) => {
    if (!currentDupe) return

    let nextActions = [...resolvedActions]

    if (resolution === 'skip') {
      setSkippedCount((prev) => prev + 1)
    } else if (resolution === 'overwrite') {
      nextActions.push({
        action: 'update',
        existingId: currentDupe.existing.id,
        providerData: {
          name: addDrPrefix(currentDupe.incoming.mapped.name),
          specialty: currentDupe.incoming.mapped.specialty,
          phone: currentDupe.incoming.mapped.phone,
          email: currentDupe.incoming.mapped.email,
          facilityId,
        },
        rawItem: currentDupe.incoming,
      })
    } else if (resolution === 'import_new') {
      nextActions.push({
        action: 'create',
        providerData: {
          name: addDrPrefix(currentDupe.incoming.mapped.name),
          specialty: currentDupe.incoming.mapped.specialty,
          phone: currentDupe.incoming.mapped.phone,
          email: currentDupe.incoming.mapped.email,
          facilityId,
          isImported: true,
          authProvisioned: false,
        },
        rawItem: currentDupe.incoming,
      })
    }

    setResolvedActions(nextActions)

    if (dupeIndex + 1 < duplicateList.length) {
      setDupeIndex((prev) => prev + 1)
    } else {
      // Include all nonDupeProviders as 'create' actions
      const fullActions: ResolvedWriteAction[] = [
        ...nonDupeProviders.map((p) => ({
          action: 'create' as const,
          providerData: {
            name: addDrPrefix(p.mapped.name),
            specialty: p.mapped.specialty,
            phone: p.mapped.phone,
            email: p.mapped.email,
            facilityId,
            isImported: true,
            authProvisioned: false,
          },
          rawItem: p,
        })),
        ...nextActions,
      ]

      setResolvedActions(fullActions)
      setPhase('writing')
    }
  }

  // ---------------------------------------------------------------------------
  // PHASE 4: Writing to Firebase Sequentially
  // ---------------------------------------------------------------------------
  const executeWrites = useCallback(async () => {
    if (!hospitalId || resolvedActions.length === 0) {
      setPhase('done')
      return
    }

    setTotalToWrite(resolvedActions.length)
    let successful = 0
    const failures: FailedProvider[] = []

    for (let i = 0; i < resolvedActions.length; i++) {
      const item = resolvedActions[i]
      setWritingIndex(i + 1)
      setCurrentWritingName(item.providerData.name)

      // Before creating provider, check cross-hospital email uniqueness
      if (item.providerData.email) {
        try {
          const emailCheck = await checkProviderEmailAvailable(
            item.providerData.email,
            hospitalId
          )
          if (!emailCheck.available) {
            failures.push({
              provider: item.rawItem,
              failReason: 'This email is already registered under another hospital and cannot be added here.',
            })
            continue
          }
        } catch (checkErr) {
          console.error('Error checking email availability:', checkErr)
        }
      }

      try {
        if (item.action === 'update' && item.existingId) {
          await updateProvider(hospitalId, item.existingId, item.providerData)
        } else {
          await createProvider(hospitalId, item.providerData)
        }

        // Register email in global lookup
        if (item.providerData.email) {
          try {
            await registerProviderEmail(
              item.providerData.email,
              hospitalId,
              item.providerData.name
            )
          } catch (regErr) {
            console.error('Failed to register provider email:', regErr)
          }
        }

        successful++
        setImportedCount(successful)
      } catch (err) {
        console.error(`Failed to write provider ${item.providerData.name}:`, err)
        failures.push({
          provider: item.rawItem,
          failReason: 'Failed to write record to database.',
        })
      }

      // Small delay for smooth progress UI
      await new Promise((resolve) => setTimeout(resolve, 60))
    }

    setFailedList(failures)

    if (currentUser && userRole) {
      await writeActivityLog({
        hospitalId,
        action: 'provider.import',
        performedBy: buildPerformedBy(currentUser, userRole),
        entity: { type: 'provider', id: 'bulk', label: `${successful} Providers` },
        summary: `Imported ${successful} providers from file`,
        metadata: { importedCount: successful, skippedCount, failedCount: failures.length },
      })
    }

    setPhase('done')
  }, [hospitalId, resolvedActions, currentUser, userRole, skippedCount])

  useEffect(() => {
    if (phase === 'writing' && resolvedActions.length > 0) {
      executeWrites()
    } else if (phase === 'writing' && resolvedActions.length === 0) {
      setPhase('done')
    }
  }, [phase, resolvedActions, executeWrites])

  // Unmapped columns from raw record for Phase 1 context
  const unmappedRawData = useMemo(() => {
    if (!currentIncomplete) return []
    const mappedHeaderValues = Object.values(currentIncomplete.raw)
    return Object.entries(currentIncomplete.raw).filter(([key]) => {
      const norm = key.toLowerCase()
      return !['name', 'specialty', 'phone', 'email'].some((f) => norm.includes(f))
    })
  }, [currentIncomplete])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-background border shadow-2xl"
        onInteractOutside={(e) => {
          // Prevent accidental dismiss during writing or completing
          if (phase === 'writing' || phase === 'detecting-duplicates') {
            e.preventDefault()
          }
        }}
      >
        {/* PHASE 1: COMPLETING */}
        {phase === 'completing' && currentIncomplete && (
          <>
            <DialogHeader className="px-6 pt-5 pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Complete Provider Information
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold">
                  {completionIndex + 1} of {incompleteList.length}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Provider {completionIndex + 1} of {incompleteList.length} —{' '}
                <span className="font-semibold text-foreground">
                  {currentIncomplete.mapped.name || 'Unnamed Provider'}
                </span>
              </DialogDescription>
              <div className="pt-2">
                <Progress
                  value={completionIndex}
                  max={incompleteList.length}
                  className="h-1.5"
                />
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {confirmSkipOpen ? (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Skip this provider?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This provider record will be excluded from the import entirely.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmSkipOpen(false)}
                    >
                      No, Keep
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleConfirmSkip}
                    >
                      Yes, Skip
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Name field */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="provider-name"
                      className={`text-xs font-semibold flex items-center justify-between ${
                        !currentIncomplete.mapped.name ? 'text-destructive font-bold' : ''
                      }`}
                    >
                      <span>Full Name *</span>
                      {!currentIncomplete.mapped.name && (
                        <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.2 rounded font-normal">
                          Missing in file
                        </span>
                      )}
                    </Label>
                    <Input
                      id="provider-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins, MD"
                      className={
                        !currentIncomplete.mapped.name || fieldErrors.name
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-destructive">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Specialty field */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="provider-specialty"
                      className={`text-xs font-semibold flex items-center justify-between ${
                        !currentIncomplete.mapped.specialty ? 'text-destructive font-bold' : ''
                      }`}
                    >
                      <span>Specialty *</span>
                      {!currentIncomplete.mapped.specialty && (
                        <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.2 rounded font-normal">
                          Missing in file
                        </span>
                      )}
                    </Label>
                    <Input
                      id="provider-specialty"
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value)}
                      placeholder="e.g. Cardiology"
                      className={
                        !currentIncomplete.mapped.specialty || fieldErrors.specialty
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }
                    />
                    {fieldErrors.specialty && (
                      <p className="text-xs text-destructive">{fieldErrors.specialty}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone field */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="provider-phone"
                        className={`text-xs font-semibold flex items-center justify-between ${
                          !currentIncomplete.mapped.phone ? 'text-destructive font-bold' : ''
                        }`}
                      >
                        <span>Phone *</span>
                        {!currentIncomplete.mapped.phone && (
                          <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.2 rounded font-normal">
                            Missing
                          </span>
                        )}
                      </Label>
                      <Input
                        id="provider-phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. 555-0199"
                        className={
                          !currentIncomplete.mapped.phone || fieldErrors.phone
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }
                      />
                      {fieldErrors.phone && (
                        <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                      )}
                    </div>

                    {/* Email field */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="provider-email"
                        className={`text-xs font-semibold flex items-center justify-between ${
                          !currentIncomplete.mapped.email ? 'text-destructive font-bold' : ''
                        }`}
                      >
                        <span>Email *</span>
                        {!currentIncomplete.mapped.email && (
                          <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.2 rounded font-normal">
                            Missing
                          </span>
                        )}
                      </Label>
                      <Input
                        id="provider-email"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="sjenkins@hospital.org"
                        className={
                          !currentIncomplete.mapped.email || fieldErrors.email
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }
                      />
                      {fieldErrors.email && (
                        <p className="text-xs text-destructive">{fieldErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Unmapped row data helper */}
                  {unmappedRawData.length > 0 && (
                    <div className="pt-2 border-t text-xs space-y-1">
                      <p className="text-muted-foreground font-medium">
                        Other data from file:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {unmappedRawData.map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-[11px] text-muted-foreground"
                          >
                            <strong className="mr-1 text-foreground">{k}:</strong> {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmSkipOpen(true)}
                disabled={confirmSkipOpen}
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                Skip this provider
              </Button>
              <Button size="sm" onClick={handleSaveIncomplete} disabled={confirmSkipOpen}>
                Save & Continue
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* PHASE 2: DETECTING DUPLICATES */}
        {phase === 'detecting-duplicates' && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Checking for duplicates...</h3>
              <p className="text-xs text-muted-foreground">
                Comparing incoming providers with existing hospital records
              </p>
            </div>
          </div>
        )}

        {/* PHASE 3: RESOLVING DUPLICATES */}
        {phase === 'resolving-duplicates' && currentDupe && (
          <>
            <DialogHeader className="px-6 pt-5 pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Duplicate Providers Found
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold">
                  {dupeIndex + 1} of {duplicateList.length}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Resolve duplicate for provider {dupeIndex + 1} of {duplicateList.length}
              </DialogDescription>
              <div className="pt-2">
                <Progress
                  value={dupeIndex}
                  max={duplicateList.length}
                  className="h-1.5"
                />
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Match Reason Banner */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {currentDupe.matchReason === 'email_match'
                    ? 'This email address already exists in your provider list.'
                    : 'A provider with this name and phone number already exists.'}
                </span>
              </div>

              {/* Two-Column Comparison */}
              <div className="grid grid-cols-2 gap-3">
                {/* Left: In file */}
                <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      In Your File
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Incoming
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong className="text-muted-foreground">Name:</strong>{' '}
                      <span className="font-semibold text-foreground">
                        {currentDupe.incoming.mapped.name}
                      </span>
                    </p>
                    <p>
                      <strong className="text-muted-foreground">Specialty:</strong>{' '}
                      {currentDupe.incoming.mapped.specialty}
                    </p>
                    <p>
                      <strong className="text-muted-foreground">Phone:</strong>{' '}
                      <span className="font-mono">{currentDupe.incoming.mapped.phone}</span>
                    </p>
                    <p>
                      <strong className="text-muted-foreground">Email:</strong>{' '}
                      <span className="text-muted-foreground">
                        {currentDupe.incoming.mapped.email}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right: Already exists */}
                <div className="border rounded-lg p-3 bg-card space-y-2 border-amber-500/30">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Already Exists
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600 dark:text-amber-400"
                    >
                      Database
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong className="text-muted-foreground">Name:</strong>{' '}
                      <span className="font-semibold text-foreground">
                        {currentDupe.existing.name}
                      </span>
                    </p>
                    <p>
                      <strong className="text-muted-foreground">Specialty:</strong>{' '}
                      {currentDupe.existing.specialty}
                    </p>
                    <p>
                      <strong className="text-muted-foreground">Phone:</strong>{' '}
                      <span className="font-mono">{currentDupe.existing.phone}</span>
                    </p>
                    <p>
                      <strong className="text-muted-foreground">Email:</strong>{' '}
                      <span className="text-muted-foreground">
                        {currentDupe.existing.email}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolveDuplicate('skip')}
                className="w-full sm:w-auto text-xs"
              >
                Skip — don't import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolveDuplicate('overwrite')}
                className="w-full sm:w-auto text-xs border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50"
              >
                Overwrite existing
              </Button>
              <Button
                size="sm"
                onClick={() => handleResolveDuplicate('import_new')}
                className="w-full sm:w-auto text-xs"
              >
                Import as new
              </Button>
            </DialogFooter>
          </>
        )}

        {/* PHASE 4: WRITING */}
        {phase === 'writing' && (
          <div className="p-8 space-y-5 text-center">
            <div className="p-4 rounded-full bg-primary/10 text-primary w-14 h-14 mx-auto flex items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg">Importing Providers...</h3>
              <p className="text-xs text-muted-foreground">
                Writing providers sequentially to hospital database
              </p>
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <Progress value={writingIndex} max={totalToWrite || 1} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {writingIndex} of {totalToWrite} processed
                </span>
                <span className="font-medium text-primary">
                  {Math.round((writingIndex / (totalToWrite || 1)) * 100)}%
                </span>
              </div>
            </div>

            {currentWritingName && (
              <p className="text-xs font-mono text-muted-foreground truncate max-w-xs mx-auto">
                Saving: {currentWritingName}
              </p>
            )}
          </div>
        )}

        {/* PHASE 5: DONE */}
        {phase === 'done' && (
          <div className="p-8 space-y-6 text-center">
            <div className="p-4 rounded-full bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 w-16 h-16 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-xl text-foreground">Import Complete</h3>
              <p className="text-xs text-muted-foreground">
                The provider records have been processed and synced.
              </p>
            </div>

            {/* Summary Box */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
              <div className="border rounded-lg p-3 bg-card border-green-500/30">
                <p className="text-[10px] uppercase font-bold text-green-700 dark:text-green-400">
                  Imported
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">
                  {importedCount}
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-card">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">
                  Skipped
                </p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {skippedCount}
                </p>
              </div>

              <div
                className={`border rounded-lg p-3 bg-card ${
                  failedList.length > 0 ? 'border-destructive/40 bg-destructive/5' : ''
                }`}
              >
                <p
                  className={`text-[10px] uppercase font-bold ${
                    failedList.length > 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  Failed
                </p>
                <p
                  className={`text-xl font-bold mt-0.5 ${
                    failedList.length > 0 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {failedList.length}
                </p>
              </div>
            </div>

            {/* Failure List & Download Option */}
            {(() => {
              const emailConflicts = failedList.filter((f) => f.failReason.includes('another hospital'))
              const writeFailures = failedList.filter((f) => !f.failReason.includes('another hospital'))

              if (failedList.length === 0) return null

              return (
                <div className="space-y-3 max-w-md mx-auto text-left">
                  {emailConflicts.length > 0 && (
                    <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                      <p className="font-medium">
                        {emailConflicts.length} provider{emailConflicts.length !== 1 ? 's' : ''} not imported
                      </p>
                      <p className="text-xs mt-0.5">
                        These email addresses are already associated with providers at another hospital and cannot be duplicated.
                      </p>
                      <ul className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
                        {emailConflicts.map((f, i) => (
                          <li key={i} className="text-xs">
                            • {f.provider.mapped.name || 'Unnamed'} ({f.provider.mapped.email})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {writeFailures.length > 0 && (
                    <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-destructive">
                          {writeFailures.length} Failed Row(s)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportFailedRowsAsCsv(writeFailures.map((f) => f.provider))}
                          className="h-7 text-xs gap-1.5 border-destructive/30 text-destructive bg-background hover:bg-destructive/10"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download CSV
                        </Button>
                      </div>
                      <div className="max-h-24 overflow-y-auto divide-y divide-destructive/20 text-xs text-muted-foreground">
                        {writeFailures.map((f, idx) => (
                          <div key={idx} className="py-1 flex justify-between">
                            <span>{f.provider.mapped.name || 'Unnamed'}</span>
                            <span className="font-mono text-[11px]">{f.provider.mapped.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="pt-2 flex justify-center">
              <Button
                onClick={() => {
                  onComplete(importedCount, skippedCount)
                  onOpenChange(false)
                }}
                className="w-full max-w-xs"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
