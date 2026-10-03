'use client'

import { useState, useEffect } from 'react'
import { Provider } from '@/types'
import { createProvider, updateProvider } from '@/lib/services/providerService'
import { useFacilities } from '@/hooks/useFacilities'
import { useAppStore } from '@/store/useAppStore'
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

interface ProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: Provider
}

export function ProviderDialog({
  open,
  onOpenChange,
  provider,
}: ProviderDialogProps) {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const isEdit = !!provider
  const { toast } = useToast()
  const { facilities, loading: facilitiesLoading } = useFacilities()

  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [facilityId, setFacilityId] = useState('')

  const [errors, setErrors] = useState<{
    name?: string
    specialty?: string
    phone?: string
    email?: string
    facilityId?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (provider) {
      setName(provider.name || '')
      setSpecialty(provider.specialty || '')
      setPhone(provider.phone || '')
      setEmail(provider.email || '')
      setFacilityId(provider.facilityId || '')
    } else {
      setName('')
      setSpecialty('')
      setPhone('')
      setEmail('')
      setFacilityId('')
    }
    setErrors({})
  }, [provider, open])

  // Auto-select single facility if only one exists
  useEffect(() => {
    if (facilities.length === 1 && !facilityId) {
      setFacilityId(facilities[0].id)
    }
  }, [facilities, facilityId])

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

    if (!facilityId) {
      newErrors.facilityId = 'Hospital is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !hospitalId) return

    const formattedName = addDrPrefix(name)
    setName(formattedName)

    setSubmitting(true)
    try {
      if (isEdit && provider) {
        await updateProvider(hospitalId, provider.id, {
          name: formattedName,
          specialty: specialty.trim(),
          phone: phone.trim(),
          email: email.trim(),
          facilityId,
        })
        toast({
          title: 'Provider updated',
          description: 'Provider details have been updated successfully.',
        })
      } else {
        await createProvider(hospitalId, {
          name: formattedName,
          specialty: specialty.trim(),
          phone: phone.trim(),
          email: email.trim(),
          facilityId,
        })
        toast({
          title: 'Provider added',
          description: 'New healthcare provider has been added successfully.',
        })
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save provider.'
      toast({
        variant: 'destructive',
        title: 'Error saving provider',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='provider-name'>Name</Label>
            <Input
              id='provider-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. Dr. Sarah Jenkins, MD'
              disabled={submitting}
            />
            {errors.name && (
              <p className='text-xs text-destructive'>{errors.name}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='provider-specialty'>Specialty</Label>
            <Input
              id='provider-specialty'
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
              <Label htmlFor='provider-phone'>Phone</Label>
              <Input
                id='provider-phone'
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
              <Label htmlFor='provider-email'>Email</Label>
              <Input
                id='provider-email'
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
            <Label htmlFor='provider-facility'>Hospital</Label>
            <select
              id='provider-facility'
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
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
              {submitting
                ? 'Saving...'
                : isEdit
                ? 'Save Changes'
                : 'Add Provider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
