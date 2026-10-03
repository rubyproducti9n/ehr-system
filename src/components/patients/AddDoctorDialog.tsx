'use client'

import { useState, useEffect } from 'react'
import { Provider } from '@/types'
import { createProvider } from '@/lib/services/providerService'
import { useFacilities } from '@/hooks/useFacilities'
import { useToast } from '@/hooks/use-toast'
import { validatePhone, validateEmail, addDrPrefix } from '@/lib/utils'
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

import { useAppStore } from '@/store/useAppStore'

interface AddDoctorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
  facilityId: string | null
  onDoctorAdded: (provider: Provider) => void
}

export function AddDoctorDialog({
  open,
  onOpenChange,
  initialName,
  facilityId,
  onDoctorAdded,
}: AddDoctorDialogProps) {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const { toast } = useToast()
  const { facilities, loading: facilitiesLoading } = useFacilities()

  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedFacilityId, setSelectedFacilityId] = useState('')

  const [errors, setErrors] = useState<{
    name?: string
    specialty?: string
    phone?: string
    email?: string
    facilityId?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize or reset form when opened
  useEffect(() => {
    if (open) {
      setName(initialName ? addDrPrefix(initialName) : '')
      setSpecialty('')
      setPhone('')
      setEmail('')
      setSelectedFacilityId(facilityId || '')
      setErrors({})
    }
  }, [open, initialName, facilityId])

  const validate = () => {
    const newErrors: {
      name?: string
      specialty?: string
      phone?: string
      email?: string
      facilityId?: string
    } = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!specialty.trim()) {
      newErrors.specialty = 'Specialty is required'
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else {
      const phoneErr = validatePhone(phone)
      if (phoneErr) newErrors.phone = phoneErr
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailErr = validateEmail(email)
      if (emailErr) newErrors.email = emailErr
    }

    const effectiveFacilityId = facilityId || selectedFacilityId
    if (!effectiveFacilityId) {
      newErrors.facilityId = 'Hospital is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!hospitalId) return

    const formattedName = addDrPrefix(name)
    setName(formattedName)
    const effectiveFacilityId = facilityId || selectedFacilityId

    setSubmitting(true)
    try {
      const newProvider = await createProvider(hospitalId, {
        name: formattedName,
        specialty: specialty.trim(),
        phone: phone.trim(),
        email: email.trim(),
        facilityId: effectiveFacilityId,
      })

      toast({
        title: `${formattedName} added successfully`,
        description: 'New healthcare provider has been created and assigned.',
      })

      onDoctorAdded(newProvider)
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save doctor.'
      toast({
        variant: 'destructive',
        title: 'Error saving doctor',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const lockedFacility = facilities.find((f) => f.id === facilityId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>Add New Doctor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='doctor-name'>Doctor Name</Label>
            <Input
              id='doctor-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. Dr. Sarah Jenkins, MD'
              disabled={submitting}
              autoFocus
            />
            {errors.name && (
              <p className='text-xs text-destructive'>{errors.name}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='doctor-specialty'>Specialty</Label>
            <Input
              id='doctor-specialty'
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder='e.g. Cardiology'
              disabled={submitting}
            />
            {errors.specialty && (
              <p className='text-xs text-destructive'>{errors.specialty}</p>
            )}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='doctor-phone'>Phone</Label>
              <Input
                id='doctor-phone'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='e.g. +1 555-0145'
                disabled={submitting}
              />
              {errors.phone && (
                <p className='text-xs text-destructive'>{errors.phone}</p>
              )}
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='doctor-email'>Email</Label>
              <Input
                id='doctor-email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='sjenkins@clinic.org'
                disabled={submitting}
              />
              {errors.email && (
                <p className='text-xs text-destructive'>{errors.email}</p>
              )}
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='doctor-facility'>Hospital</Label>
            {facilityId && lockedFacility ? (
              <Input
                id='doctor-facility'
                value={lockedFacility.name}
                disabled
                className='bg-muted font-medium'
              />
            ) : (
              <select
                id='doctor-facility'
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                disabled={submitting || facilitiesLoading}
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <option value=''>
                  {facilitiesLoading
                    ? 'Loading hospitals...'
                    : facilities.length === 0
                    ? 'No hospitals registered yet'
                    : 'Select a hospital'}
                </option>
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name}
                  </option>
                ))}
              </select>
            )}
            {errors.facilityId && (
              <p className='text-xs text-destructive'>{errors.facilityId}</p>
            )}
          </div>

          <DialogFooter className='pt-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Doctor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
