'use client'

import { useState, useMemo, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Patient } from '@/types'
import { updatePatient } from '@/lib/services/patientService'
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

interface EditPatientSheetProps {
  patient: Patient
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPatientSheet({
  patient,
  open,
  onOpenChange,
}: EditPatientSheetProps) {
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

  // Pre-fill fields from patient prop on open
  useEffect(() => {
    if (patient) {
      setName(patient.name || '')
      setGender(patient.gender || '')
      setDob(patient.dob || '')
      setAllergiesInput(
        patient.allergies && Array.isArray(patient.allergies)
          ? patient.allergies.join(', ')
          : ''
      )
      setFacilityId(patient.facilityId || '')
      setCurrentDoctorId(patient.currentDoctorId || '')
      setStatus(patient.status || 'active')
      setPatientType((patient.patientType || '') as 'in-patient' | 'out-patient' | '')
      setAdmitDate(patient.admitDate || '')
    }
    setErrors({})
  }, [patient, open])

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

  const handleFacilityChange = (newFacilityId: string) => {
    setFacilityId(newFacilityId)
    if (currentDoctorId) {
      const isDocInNewFac = providers.some(
        (p) => p.id === currentDoctorId && p.facilityId === newFacilityId
      )
      if (!isDocInNewFac) {
        setCurrentDoctorId('')
      }
    }
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
      const todayIso = new Date().toISOString().split('T')[0]
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

      await updatePatient(hospitalId, patient.id, {
        name: name.trim(),
        gender: gender as 'male' | 'female' | 'other',
        dob,
        age,
        allergies,
        currentDoctorId: currentDoctorId || null,
        status: status as Patient['status'],
        facilityId,
        patientType: (patientType || null) as Patient['patientType'],
        admitDate: admitDate || null,
      })

      toast({
        title: 'Patient updated',
        description: 'Patient records have been successfully updated.',
      })

      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update patient.'
      toast({
        variant: 'destructive',
        title: 'Update Error',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='sm:max-w-xl overflow-y-auto w-full'>
        <SheetHeader className='pb-4'>
          <SheetTitle className='text-xl'>Edit Patient</SheetTitle>
          <SheetDescription>
            Modify patient demographic details and clinical assignments
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
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
