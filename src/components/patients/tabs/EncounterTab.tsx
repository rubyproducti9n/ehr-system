'use client'

import { useState } from 'react'
import { Plus, Stethoscope, Loader2, FileText, Lock } from 'lucide-react'
import { useEncounters } from '@/hooks/useEncounters'
import { useProviders } from '@/hooks/useProviders'
import { useAppStore } from '@/store/useAppStore'
import { hasPermission } from '@/lib/roles'
import { createEncounter } from '@/lib/services/encounterService'
import { updatePatient } from '@/lib/services/patientService'
import { useToast } from '@/hooks/use-toast'
import { EncounterCard } from './EncounterCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { PageError } from '@/components/error/PageError'

interface EncounterTabProps {
  patientId: string
  showTranscript?: boolean
}

export function EncounterTab({ patientId, showTranscript = true }: EncounterTabProps) {
  const userRole = useAppStore((state) => state.userRole)
  const { encounters, loading: encLoading, error } = useEncounters(patientId)
  const { providers, loading: providersLoading } = useProviders()
  const { toast } = useToast()

  // Role check: If cannot view clinical records, show Lock EmptyState
  if (!hasPermission(userRole, 'canViewClinicalRecords')) {
    return (
      <EmptyState
        icon={Lock}
        title="Access Restricted"
        description="Your role does not have access to encounter records."
      />
    )
  }


  // Inline New Encounter form visibility
  const [showNewForm, setShowNewForm] = useState(false)

  // New form fields
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [providerId, setProviderId] = useState('')
  const [summary, setSummary] = useState('')
  const [transcript, setTranscript] = useState('')

  const [errors, setErrors] = useState<{
    visitDate?: string
    providerId?: string
    summary?: string
  }>({})
  const [saving, setSaving] = useState(false)

  const resetNewForm = () => {
    setVisitDate(new Date().toISOString().split('T')[0])
    setProviderId('')
    setSummary('')
    setTranscript('')
    setErrors({})
  }

  const validate = () => {
    const newErrors: {
      visitDate?: string
      providerId?: string
      summary?: string
    } = {}

    if (!visitDate) {
      newErrors.visitDate = 'Visit date is required'
    } else {
      const selected = new Date(visitDate)
      const now = new Date()
      now.setHours(23, 59, 59, 999)
      if (selected > now) {
        newErrors.visitDate = 'Visit date cannot be in the future'
      }
    }

    if (!providerId) {
      newErrors.providerId = 'Attending provider is required'
    }

    if (!summary.trim()) {
      newErrors.summary = 'Visit summary is required'
    } else if (summary.trim().length < 10) {
      newErrors.summary = 'Visit summary must be at least 10 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const hospitalId = useAppStore((state) => state.hospitalId)

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!hospitalId) return

    setSaving(true)
    try {
      const isoVisitDate = new Date(visitDate).toISOString()

      // 1. Create Encounter
      await createEncounter(hospitalId, patientId, {
        patientId,
        visitDate: isoVisitDate,
        providerId,
        summary: summary.trim(),
        transcript: transcript.trim(),
      })

      // 2. Update parent patient lastVisitDate automatically
      await updatePatient(hospitalId, patientId, { lastVisitDate: isoVisitDate })

      toast({
        title: 'Encounter created',
        description: 'Encounter added successfully',
      })

      resetNewForm()
      setShowNewForm(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error occurred while saving encounter'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    } finally {
      setSaving(false)
    }
  }

  const isLoading = encLoading || providersLoading

  return (
    <ErrorBoundary
      fallback={
        <PageError
          title="Failed to load Encounters"
          message="Try refreshing the page."
        />
      }
    >
      <div className='space-y-6'>
        {/* Top Bar Row */}
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-muted-foreground'>
            Encounters
          </span>
          {!showNewForm && (
            <Button
              onClick={() => {
                resetNewForm()
                setShowNewForm(true)
              }}
              size='sm'
              className='gap-1.5'
            >
              <Plus className='h-4 w-4' />
              New Encounter
            </Button>
          )}
        </div>

        {error && (
          <div className='rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'>
            {error}
          </div>
        )}

        {/* New Encounter Inline Form (Dashed Border Card) */}
        {showNewForm && (
          <div className='rounded-lg border-2 border-dashed border-primary/50 bg-slate-50/50 dark:bg-slate-900/20 p-5 space-y-4 shadow-sm'>
            <div className='flex items-center justify-between border-b pb-3'>
              <h4 className='text-sm font-semibold text-foreground flex items-center gap-2'>
                <Stethoscope className='h-4 w-4 text-primary' />
                New Clinical Encounter
              </h4>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    resetNewForm()
                    setShowNewForm(false)
                  }}
                  disabled={saving}
                  className='h-8 text-xs'
                >
                  Cancel
                </Button>
                <Button
                  type='button'
                  size='sm'
                  onClick={handleCreateEncounter}
                  disabled={saving}
                  className='h-8 text-xs'
                >
                  {saving ? (
                    <>
                      <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                      Saving...
                    </>
                  ) : (
                    'Save Encounter'
                  )}
                </Button>
              </div>
            </div>

            <form onSubmit={handleCreateEncounter} className='space-y-4 pt-1'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='new-visit-date'>
                    Visit Date <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='new-visit-date'
                    type='date'
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    disabled={saving}
                  />
                  {errors.visitDate && (
                    <p className='text-xs text-destructive'>{errors.visitDate}</p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='new-provider'>
                    Provider <span className='text-destructive'>*</span>
                  </Label>
                  <select
                    id='new-provider'
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    disabled={saving || providersLoading}
                    className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <option value=''>
                      {providersLoading
                        ? 'Loading providers...'
                        : providers.length === 0
                        ? 'No providers found'
                        : 'Select a provider'}
                    </option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.specialty})
                      </option>
                    ))}
                  </select>
                  {errors.providerId && (
                    <p className='text-xs text-destructive'>
                      {errors.providerId}
                    </p>
                  )}
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='new-summary'>
                  Visit Summary <span className='text-destructive'>*</span>
                </Label>
                <textarea
                  id='new-summary'
                  rows={5}
                  placeholder='Describe the visit, findings, and plan...'
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={saving}
                  className='flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                />
                {errors.summary && (
                  <p className='text-xs text-destructive'>{errors.summary}</p>
                )}
              </div>

              {showTranscript && (
                <div className='space-y-1.5'>
                  <Label htmlFor='new-transcript'>Transcript</Label>
                  <textarea
                    id='new-transcript'
                    rows={4}
                    placeholder='Paste or type the visit transcript here. AI transcription coming in a future update.'
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    disabled={saving}
                    className='flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  />
                  <p className='text-xs text-muted-foreground italic'>
                    AI-powered transcription will be available in Phase 2
                  </p>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Encounters List */}
        <div className='space-y-4 min-h-[260px]'>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className='rounded-lg border bg-card p-5 space-y-4 shadow-sm'
              >
                <div className='flex justify-between items-center'>
                  <Skeleton className='h-5 w-52' />
                  <div className='flex gap-1'>
                    <Skeleton className='h-8 w-8 rounded-md' />
                    <Skeleton className='h-8 w-8 rounded-md' />
                  </div>
                </div>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-24 w-full rounded-md' />
              </div>
            ))
          ) : encounters.length === 0 ? (
            <EmptyState
              icon={FileText}
              title='No encounters recorded'
              action={
                !showNewForm
                  ? {
                      label: 'New Encounter',
                      onClick: () => {
                        resetNewForm()
                        setShowNewForm(true)
                      },
                    }
                  : undefined
              }
            />
          ) : (
            encounters.map((enc) => (
              <EncounterCard
                key={enc.id}
                encounter={enc}
                patientId={patientId}
              />
            ))
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
