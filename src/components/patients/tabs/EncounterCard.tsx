'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  FileText,
} from 'lucide-react'
import { Encounter } from '@/types'
import { updateEncounter, deleteEncounter } from '@/lib/services/encounterService'
import { useProviders } from '@/hooks/useProviders'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EncounterCardProps {
  encounter: Encounter
  patientId: string
  onDeleted?: () => void
}

function toDateInputValue(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export function EncounterCard({
  encounter,
  patientId,
  onDeleted,
}: EncounterCardProps) {
  const { providers, loading: providersLoading } = useProviders()
  const { toast } = useToast()

  const [mode, setMode] = useState<'read' | 'edit'>('read')
  const [showTranscript, setShowTranscript] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [discardConfirm, setDiscardConfirm] = useState(false)

  // Edit form state
  const [visitDate, setVisitDate] = useState('')
  const [providerId, setProviderId] = useState('')
  const [summary, setSummary] = useState('')
  const [transcript, setTranscript] = useState('')

  const [errors, setErrors] = useState<{
    visitDate?: string
    providerId?: string
    summary?: string
  }>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Pre-fill on mount / encounter change
  useEffect(() => {
    if (encounter) {
      setVisitDate(toDateInputValue(encounter.visitDate))
      setProviderId(encounter.providerId || '')
      setSummary(encounter.summary || '')
      setTranscript(encounter.transcript || '')
    }
    setErrors({})
    setDiscardConfirm(false)
    setDeleteConfirm(false)
  }, [encounter, mode])

  // Track if edit form was modified
  const isDirty = useMemo(() => {
    return (
      visitDate !== toDateInputValue(encounter.visitDate) ||
      providerId !== (encounter.providerId || '') ||
      summary !== (encounter.summary || '') ||
      transcript !== (encounter.transcript || '')
    )
  }, [visitDate, providerId, summary, transcript, encounter])

  const providerMap = useMemo(() => {
    const map = new Map<string, string>()
    providers.forEach((p) => map.set(p.id, p.name))
    return map
  }, [providers])

  const doctorName = encounter.providerId
    ? providerMap.get(encounter.providerId) || 'Doctor'
    : 'Doctor'

  const handleCancelEdit = () => {
    if (isDirty) {
      setDiscardConfirm(true)
    } else {
      setMode('read')
    }
  }

  const handleConfirmDiscard = () => {
    setDiscardConfirm(false)
    setMode('read')
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await updateEncounter(patientId, encounter.id, {
        visitDate: new Date(visitDate).toISOString(),
        providerId,
        summary: summary.trim(),
        transcript: transcript.trim(),
      })

      toast({
        title: 'Encounter updated',
        description: 'Clinical encounter notes have been saved.',
      })

      setMode('read')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err?.message || 'Error occurred while updating encounter.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteEncounter(patientId, encounter.id)
      toast({
        title: 'Encounter deleted',
        description: 'The encounter record has been permanently removed.',
      })
      if (onDeleted) onDeleted()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err?.message || 'Error occurred while removing encounter.',
      })
      setDeleting(false)
    }
  }

  // ================= READ MODE =================
  if (mode === 'read') {
    return (
      <div className='rounded-lg border bg-card p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors'>
        {/* Header row: Visit Date + Doctor + Actions */}
        <div className='flex items-start justify-between gap-2'>
          <div className='space-y-0.5 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-sm font-semibold text-foreground'>
                Visit: {formatDate(encounter.visitDate)}
              </span>
              <span className='text-muted-foreground'>·</span>
              <span className='text-sm font-medium text-foreground'>
                Dr. {doctorName}
              </span>
            </div>
            <p className='text-xs text-muted-foreground'>
              Updated: {formatDate(encounter.updatedAt)}
            </p>
          </div>

          {/* Action buttons or Inline Delete confirmation */}
          <div>
            {deleteConfirm ? (
              <div className='flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-md'>
                <span className='text-xs font-medium text-destructive'>
                  Confirm delete?
                </span>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className='h-6 px-2 text-xs'
                >
                  Yes
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className='h-6 px-2 text-xs'
                >
                  No
                </Button>
              </div>
            ) : (
              <div className='flex items-center gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setMode('edit')}
                  className='h-8 w-8 text-muted-foreground hover:text-foreground'
                  title='Edit Encounter'
                >
                  <Edit className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setDeleteConfirm(true)}
                  className='h-8 w-8 text-muted-foreground hover:text-destructive'
                  title='Delete Encounter'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className='border-t pt-3 space-y-3'>
          {/* Visit Summary */}
          <div className='space-y-1'>
            <h5 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase'>
              VISIT SUMMARY
            </h5>
            <p className='text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed'>
              {encounter.summary}
            </p>
          </div>

          {/* Transcript section (if present) */}
          {encounter.transcript && encounter.transcript.trim().length > 0 && (
            <div className='pt-2 border-t space-y-2'>
              <div className='flex items-center justify-between'>
                <h5 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase'>
                  TRANSCRIPT
                </h5>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowTranscript(!showTranscript)}
                  className='h-6 px-2 text-xs text-primary gap-1'
                >
                  {showTranscript ? (
                    <>
                      <ChevronUp className='h-3.5 w-3.5' /> Hide Transcript
                    </>
                  ) : (
                    <>
                      <ChevronDown className='h-3.5 w-3.5' /> Show Transcript
                    </>
                  )}
                </Button>
              </div>

              {showTranscript && (
                <div className='rounded-md bg-muted/40 p-3 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed border border-border/50'>
                  {encounter.transcript}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ================= EDIT MODE (INLINE) =================
  return (
    <div className='rounded-lg border-2 border-primary/40 bg-card p-5 shadow-md space-y-4'>
      {/* Header: Editing label + Save / Cancel */}
      <div className='flex items-center justify-between gap-2 border-b pb-3'>
        <span className='text-sm text-muted-foreground italic font-medium'>
          Editing encounter
        </span>

        <div>
          {discardConfirm ? (
            <div className='flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md'>
              <span className='text-xs font-medium text-amber-700 dark:text-amber-400'>
                Discard changes?
              </span>
              <Button
                size='sm'
                variant='destructive'
                onClick={handleConfirmDiscard}
                className='h-6 px-2 text-xs'
              >
                Yes
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setDiscardConfirm(false)}
                className='h-6 px-2 text-xs'
              >
                No
              </Button>
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCancelEdit}
                disabled={saving}
                className='h-8 text-xs'
              >
                Cancel
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={handleSaveEdit}
                disabled={saving}
                className='h-8 text-xs'
              >
                {saving ? (
                  <>
                    <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form Body */}
      <form onSubmit={handleSaveEdit} className='space-y-4 pt-1'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label htmlFor={'edit-visitDate-' + encounter.id}>
              Visit Date <span className='text-destructive'>*</span>
            </Label>
            <Input
              id={'edit-visitDate-' + encounter.id}
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
            <Label htmlFor={'edit-provider-' + encounter.id}>
              Provider <span className='text-destructive'>*</span>
            </Label>
            <select
              id={'edit-provider-' + encounter.id}
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
              <p className='text-xs text-destructive'>{errors.providerId}</p>
            )}
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor={'edit-summary-' + encounter.id}>
            Visit Summary <span className='text-destructive'>*</span>
          </Label>
          <textarea
            id={'edit-summary-' + encounter.id}
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

        <div className='space-y-1.5'>
          <Label htmlFor={'edit-transcript-' + encounter.id}>Transcript</Label>
          <textarea
            id={'edit-transcript-' + encounter.id}
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
      </form>
    </div>
  )
}
