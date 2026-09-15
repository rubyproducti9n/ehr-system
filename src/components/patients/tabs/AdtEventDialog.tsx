'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { AdtEvent } from '@/types'
import { createAdtEvent, updateAdtEvent } from '@/lib/services/adtService'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface AdtEventDialogProps {
  patientId: string
  event?: AdtEvent
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Convert ISO string to YYYY-MM-DD for date input
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

export function AdtEventDialog({
  patientId,
  event,
  open,
  onOpenChange,
}: AdtEventDialogProps) {
  const isEdit = !!event
  const { toast } = useToast()

  const [effectiveDate, setEffectiveDate] = useState('')
  const [admitDate, setAdmitDate] = useState('')
  const [dischargedDate, setDischargedDate] = useState('')
  const [reAdmitDate, setReAdmitDate] = useState('')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<{
    form?: string
    dischargedDate?: string
    reAdmitDate?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (event) {
      setEffectiveDate(toDateInputValue(event.effectiveDate))
      setAdmitDate(toDateInputValue(event.admitDate))
      setDischargedDate(toDateInputValue(event.dischargedDate))
      setReAdmitDate(toDateInputValue(event.reAdmitDate))
      setNotes(event.notes || '')
    } else {
      setEffectiveDate('')
      setAdmitDate('')
      setDischargedDate('')
      setReAdmitDate('')
      setNotes('')
    }
    setErrors({})
  }, [event, open])

  const validate = () => {
    const newErrors: {
      form?: string
      dischargedDate?: string
      reAdmitDate?: string
    } = {}

    // Rule: At least one date field must be filled
    if (!effectiveDate && !admitDate && !dischargedDate && !reAdmitDate) {
      newErrors.form = 'Please enter at least one date'
    }

    // Rule: Discharged date cannot be before admit date
    if (admitDate && dischargedDate) {
      const admitTime = new Date(admitDate).getTime()
      const dischargeTime = new Date(dischargedDate).getTime()
      if (dischargeTime < admitTime) {
        newErrors.dischargedDate = 'Discharged date cannot be before admit date'
      }
    }

    // Rule: Re-admit date cannot be before discharged date
    if (dischargedDate && reAdmitDate) {
      const dischargeTime = new Date(dischargedDate).getTime()
      const reAdmitTime = new Date(reAdmitDate).getTime()
      if (reAdmitTime < dischargeTime) {
        newErrors.reAdmitDate = 'Re-admit date cannot be before discharged date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = {
        effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : null,
        admitDate: admitDate ? new Date(admitDate).toISOString() : null,
        dischargedDate: dischargedDate ? new Date(dischargedDate).toISOString() : null,
        reAdmitDate: reAdmitDate ? new Date(reAdmitDate).toISOString() : null,
        notes: notes.trim(),
      }

      if (isEdit && event) {
        await updateAdtEvent(patientId, event.id, payload)
      } else {
        await createAdtEvent(patientId, {
          patientId,
          ...payload,
        })
      }

      toast({
        title: 'ADT event saved',
        description: isEdit ? 'ADT event has been updated.' : 'New ADT event has been recorded.',
      })

      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving event',
        description: err?.message || 'Failed to save ADT event.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit ADT Event' : 'Add ADT Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          {errors.form && (
            <div className='rounded-md bg-destructive/15 p-3 text-xs text-destructive font-medium'>
              {errors.form}
            </div>
          )}

          <div className='space-y-1.5'>
            <Label htmlFor='effective-date'>Effective Date</Label>
            <Input
              id='effective-date'
              type='date'
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              disabled={submitting}
            />
            <p className='text-[11px] text-muted-foreground'>
              The date this event record takes effect.
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='admit-date'>Admit Date</Label>
              <Input
                id='admit-date'
                type='date'
                value={admitDate}
                onChange={(e) => setAdmitDate(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='discharged-date'>Discharged Date</Label>
              <Input
                id='discharged-date'
                type='date'
                value={dischargedDate}
                onChange={(e) => setDischargedDate(e.target.value)}
                disabled={submitting}
              />
              {errors.dischargedDate && (
                <p className='text-xs text-destructive'>{errors.dischargedDate}</p>
              )}
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='readmit-date'>Re-admit Date</Label>
            <Input
              id='readmit-date'
              type='date'
              value={reAdmitDate}
              onChange={(e) => setReAdmitDate(e.target.value)}
              disabled={submitting}
            />
            {errors.reAdmitDate && (
              <p className='text-xs text-destructive'>{errors.reAdmitDate}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <div className='flex justify-between items-center'>
              <Label htmlFor='adt-notes'>Notes</Label>
              <span className='text-[11px] text-muted-foreground'>
                {notes.length} / 500
              </span>
            </div>
            <textarea
              id='adt-notes'
              rows={3}
              maxLength={500}
              placeholder='Enter admission/discharge details, transfer reasons, or clinical notes...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            />
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
