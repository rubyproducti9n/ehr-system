'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Prescription } from '@/types'
import {
  createPrescription,
  updatePrescription,
} from '@/lib/services/prescriptionService'
import { useProviders } from '@/hooks/useProviders'
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

interface PrescriptionDialogProps {
  patientId: string
  prescription?: Prescription
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROUTE_OPTIONS = [
  'Oral',
  'IV',
  'Topical',
  'Inhaled',
  'Subcutaneous',
  'Intramuscular',
  'Gargle',
  'Other',
] as const

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

export function PrescriptionDialog({
  patientId,
  prescription,
  open,
  onOpenChange,
}: PrescriptionDialogProps) {
  const isEdit = !!prescription
  const { toast } = useToast()
  const { providers, loading: providersLoading } = useProviders()

  const [medicationName, setMedicationName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [route, setRoute] = useState('')
  const [prescribedDate, setPrescribedDate] = useState('')
  const [prescribingDoctorId, setPrescribingDoctorId] = useState('')
  const [status, setStatus] = useState<Prescription['status']>('active')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<{
    medicationName?: string
    dosage?: string
    frequency?: string
    route?: string
    prescribedDate?: string
    prescribingDoctorId?: string
    status?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (prescription) {
      setMedicationName(prescription.medicationName || '')
      setDosage(prescription.dosage || '')
      setFrequency(prescription.frequency || '')
      setRoute(prescription.route || 'Oral')
      setPrescribedDate(toDateInputValue(prescription.prescribedDate))
      setPrescribingDoctorId(prescription.prescribingDoctorId || '')
      setStatus(prescription.status || 'active')
      setNotes(prescription.notes || '')
    } else {
      setMedicationName('')
      setDosage('')
      setFrequency('')
      setRoute('Oral')
      setPrescribedDate(new Date().toISOString().split('T')[0])
      setPrescribingDoctorId('')
      setStatus('active')
      setNotes('')
    }
    setErrors({})
  }, [prescription, open])

  const validate = () => {
    const newErrors: {
      medicationName?: string
      dosage?: string
      frequency?: string
      route?: string
      prescribedDate?: string
      prescribingDoctorId?: string
      status?: string
    } = {}

    if (!medicationName.trim()) {
      newErrors.medicationName = 'Medication name is required'
    } else if (medicationName.trim().length < 2) {
      newErrors.medicationName = 'Medication name must be at least 2 characters'
    }

    if (!dosage.trim()) {
      newErrors.dosage = 'Dosage is required (e.g. 500 mg)'
    }

    if (!frequency.trim()) {
      newErrors.frequency = 'Frequency is required (e.g. Once daily, 1-0-1)'
    }

    if (!route) {
      newErrors.route = 'Route is required'
    }

    if (!prescribedDate) {
      newErrors.prescribedDate = 'Prescribed date is required'
    } else {
      const selected = new Date(prescribedDate)
      const now = new Date()
      now.setHours(23, 59, 59, 999)
      if (selected > now) {
        newErrors.prescribedDate = 'Prescribed date cannot be in the future'
      }
    }

    if (!prescribingDoctorId) {
      newErrors.prescribingDoctorId = 'Prescribing doctor is required'
    }

    if (!status) {
      newErrors.status = 'Status is required'
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
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        route: route.trim(),
        prescribedDate: new Date(prescribedDate).toISOString(),
        prescribingDoctorId,
        status,
        notes: notes.trim(),
      }

      if (isEdit && prescription) {
        await updatePrescription(patientId, prescription.id, payload)
      } else {
        await createPrescription(patientId, { patientId, ...payload })
      }

      toast({
        title: 'Prescription saved',
        description: isEdit
          ? 'Prescription updated successfully.'
          : 'New medication prescribed successfully.',
      })

      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving prescription',
        description: err?.message || 'Failed to save prescription.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[540px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Prescription' : 'Add Prescription'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='rx-medication'>
              Medication Name <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='rx-medication'
              placeholder='e.g. Amoxicillin, Lisinopril, Metformin'
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              disabled={submitting}
            />
            {errors.medicationName && (
              <p className='text-xs text-destructive'>{errors.medicationName}</p>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='rx-dosage'>
                Dosage <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='rx-dosage'
                placeholder='e.g. 500 mg, 10 ml'
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                disabled={submitting}
              />
              {errors.dosage && (
                <p className='text-xs text-destructive'>{errors.dosage}</p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='rx-frequency'>
                Frequency <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='rx-frequency'
                placeholder='e.g. Once daily, 1-0-1, Every 8 hrs'
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                disabled={submitting}
              />
              {errors.frequency && (
                <p className='text-xs text-destructive'>{errors.frequency}</p>
              )}
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='rx-route'>
                Route <span className='text-destructive'>*</span>
              </Label>
              <select
                id='rx-route'
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                disabled={submitting}
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {ROUTE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.route && (
                <p className='text-xs text-destructive'>{errors.route}</p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='rx-date'>
                Prescribed Date <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='rx-date'
                type='date'
                value={prescribedDate}
                onChange={(e) => setPrescribedDate(e.target.value)}
                disabled={submitting}
              />
              {errors.prescribedDate && (
                <p className='text-xs text-destructive'>{errors.prescribedDate}</p>
              )}
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='rx-doctor'>
                Prescribing Doctor <span className='text-destructive'>*</span>
              </Label>
              <select
                id='rx-doctor'
                value={prescribingDoctorId}
                onChange={(e) => setPrescribingDoctorId(e.target.value)}
                disabled={submitting || providersLoading}
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <option value=''>
                  {providersLoading
                    ? 'Loading doctors...'
                    : providers.length === 0
                    ? 'No doctors available'
                    : 'Select a doctor'}
                </option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.specialty})
                  </option>
                ))}
              </select>
              {errors.prescribingDoctorId && (
                <p className='text-xs text-destructive'>
                  {errors.prescribingDoctorId}
                </p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='rx-status'>
                Status <span className='text-destructive'>*</span>
              </Label>
              <select
                id='rx-status'
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Prescription['status'])
                }
                disabled={submitting}
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <option value='active'>Active</option>
                <option value='completed'>Completed</option>
                <option value='discontinued'>Discontinued</option>
              </select>
              {errors.status && (
                <p className='text-xs text-destructive'>{errors.status}</p>
              )}
            </div>
          </div>

          <div className='space-y-1.5'>
            <div className='flex justify-between items-center'>
              <Label htmlFor='rx-notes'>Clinical Notes / Instructions</Label>
              <span className='text-[11px] text-muted-foreground'>
                {notes.length} / 300
              </span>
            </div>
            <textarea
              id='rx-notes'
              rows={2}
              maxLength={300}
              placeholder='e.g. Take with food. Finish full course.'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className='flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
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
                'Save Prescription'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
