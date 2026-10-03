'use client'

import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Patient } from '@/types'
import { createPatient } from '@/lib/services/patientService'
import { createAdtEvent } from '@/lib/services/adtService'
import { useFacilities } from '@/hooks/useFacilities'
import { useProviders } from '@/hooks/useProviders'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { calculateAge } from '@/lib/utils'
import { PatientFormFields } from '@/components/patients/PatientFormFields'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface NewPatientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewPatientSheet({ open, onOpenChange }: NewPatientSheetProps) {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const { toast } = useToast()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { providers, loading: providersLoading } = useProviders()

  // Form states
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [dob, setDob] = useState('')
  const [allergiesInput, setAllergiesInput] = useState('')
  const [facilityId, setFacilityId] = useState('')
  const [currentDoctorId, setCurrentDoctorId] = useState('')
  const [status, setStatus] = useState<Patient['status']>('active')
  const [patientType, setPatientType] = useState<'in-patient' | 'out-patient' | ''>('')
  const [admitDate, setAdmitDate] = useState('')

  const [errors, setErrors] = useState<{
    name?: string
    gender?: string
    dob?: string
    facilityId?: string
    status?: string
    patientType?: string
    admitDate?: string
  }>({})

  const [submitting, setSubmitting] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

  // Track if any field was modified
  const isTouched = useMemo(() => {
    return (
      name !== '' ||
      gender !== '' ||
      dob !== '' ||
      allergiesInput !== '' ||
      facilityId !== '' ||
      currentDoctorId !== '' ||
      status !== 'active' ||
      patientType !== '' ||
      admitDate !== ''
    )
  }, [name, gender, dob, allergiesInput, facilityId, currentDoctorId, status, patientType, admitDate])

  // Filter providers to chosen facility
  const filteredProviders = useMemo(() => {
    if (!facilityId) return []
    return providers.filter((p) => p.facilityId === facilityId)
  }, [providers, facilityId])

  // Computed age
  const computedAge = useMemo(() => {
    if (!dob) return null
    return calculateAge(dob)
  }, [dob])

  const resetForm = () => {
    setName('')
    setGender('')
    setDob('')
    setAllergiesInput('')
    setFacilityId('')
    setCurrentDoctorId('')
    setStatus('active')
    setPatientType('')
    setAdmitDate('')
    setErrors({})
  }

  const handleFacilityChange = (newFacilityId: string) => {
    setFacilityId(newFacilityId)
    // Reset doctor if not in new facility
    if (currentDoctorId) {
      const isDocInNewFac = providers.some(
        (p) => p.id === currentDoctorId && p.facilityId === newFacilityId
      )
      if (!isDocInNewFac) {
        setCurrentDoctorId('')
      }
    }
  }

  const handleRequestClose = () => {
    if (isTouched && !submitting) {
      setDiscardDialogOpen(true)
    } else {
      resetForm()
      onOpenChange(false)
    }
  }

  const handleConfirmDiscard = () => {
    setDiscardDialogOpen(false)
    resetForm()
    onOpenChange(false)
  }

  const validate = () => {
    const newErrors: {
      name?: string
      gender?: string
      dob?: string
      facilityId?: string
      status?: string
      patientType?: string
      admitDate?: string
    } = {}

    if (!name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Full name must be at least 2 characters'
    }

    if (!gender) {
      newErrors.gender = 'Gender is required'
    }

    if (!dob) {
      newErrors.dob = 'Date of birth is required'
    } else {
      const birthDate = new Date(dob)
      const now = new Date()
      if (birthDate > now) {
        newErrors.dob = 'Date of birth cannot be in the future'
      }
    }

    if (!facilityId) {
      newErrors.facilityId = 'Hospital is required'
    }

    if (!status) {
      newErrors.status = 'Status is required'
    }

    if (!patientType) {
      newErrors.patientType = 'Patient type is required'
    }

    if (patientType && !admitDate) {
      newErrors.admitDate = 'Admit date is required'
    } else if (patientType && admitDate) {
      const admit = new Date(admitDate)
      const now = new Date()
      const todayIso = now.toISOString().split('T')[0]
      if (admitDate > todayIso) {
        newErrors.admitDate = 'Admit date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !hospitalId) return

    setSubmitting(true)
    try {
      const allergies = allergiesInput
        ? allergiesInput
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : []

      const age = calculateAge(dob)

      const newPatient = await createPatient(hospitalId, {
        name: name.trim(),
        gender: gender as 'male' | 'female' | 'other',
        dob,
        age,
        allergies,
        lastVisitDate: null,
        currentDoctorId: currentDoctorId || null,
        status: status as Patient['status'],
        facilityId,
        patientType: (patientType || null) as Patient['patientType'],
        admitDate: admitDate || null,
      })

      // Auto-create ADT Event if patientType and admitDate exist
      if (patientType && admitDate) {
        const dischargeDate = patientType === 'out-patient' ? admitDate : null
        try {
          await createAdtEvent(hospitalId, newPatient.id, {
            patientId: newPatient.id,
            admitDate: admitDate,
            dischargedDate: dischargeDate,
            reAdmitDate: null,
            effectiveDate: admitDate,
            notes: `Auto-created on patient registration. Type: ${patientType}.`,
          })
        } catch (adtErr) {
          console.error('Failed to auto-create ADT event on registration:', adtErr)
        }
      }

      toast({
        title: 'Patient registered successfully',
        description: name.trim() + ' has been added to the system.',
      })

      resetForm()
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register patient.'
      toast({
        variant: 'destructive',
        title: 'Registration Error',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(val) => {
          if (!val) {
            handleRequestClose()
          } else {
            onOpenChange(true)
          }
        }}
      >
        <SheetContent side='right' className='sm:max-w-xl overflow-y-auto w-full'>
          <SheetHeader className='pb-4'>
            <SheetTitle className='text-xl'>New Patient Registration</SheetTitle>
            <SheetDescription>
              All fields marked <span className='text-destructive font-medium'>*</span> are required
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className='space-y-6 pt-2 pb-8'>
            <PatientFormFields
              name={name}
              setName={setName}
              gender={gender}
              setGender={setGender}
              dob={dob}
              setDob={setDob}
              allergiesInput={allergiesInput}
              setAllergiesInput={setAllergiesInput}
              facilityId={facilityId}
              onFacilityChange={handleFacilityChange}
              currentDoctorId={currentDoctorId}
              setCurrentDoctorId={setCurrentDoctorId}
              status={status}
              setStatus={setStatus}
              patientType={patientType}
              setPatientType={setPatientType}
              admitDate={admitDate}
              setAdmitDate={setAdmitDate}
              errors={errors}
              facilities={facilities}
              facilitiesLoading={facilitiesLoading}
              providersLoading={providersLoading}
              filteredProviders={filteredProviders}
              computedAge={computedAge}
              disabled={submitting}
            />

            {/* Actions */}
            <div className='flex items-center justify-end gap-3 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={handleRequestClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Registering...
                  </>
                ) : (
                  'Register Patient'
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Discard Confirmation Dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className='sm:max-w-[400px]'>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes in the registration form. Are you sure you want to discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='pt-2'>
            <Button
              variant='outline'
              onClick={() => setDiscardDialogOpen(false)}
            >
              Keep Editing
            </Button>
            <Button variant='destructive' onClick={handleConfirmDiscard}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
