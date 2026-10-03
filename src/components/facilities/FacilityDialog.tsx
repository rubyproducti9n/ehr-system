'use client'

import { useState, useEffect } from 'react'
import { Facility } from '@/types'
import { createFacility, updateFacility } from '@/lib/services/facilityService'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { validatePhone } from '@/lib/utils'
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

interface FacilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facility?: Facility
}

export function FacilityDialog({
  open,
  onOpenChange,
  facility,
}: FacilityDialogProps) {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const isEdit = !!facility
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  const [errors, setErrors] = useState<{
    name?: string
    address?: string
    phone?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (facility) {
      setName(facility.name || '')
      setAddress(facility.address || '')
      setPhone(facility.phone || '')
    } else {
      setName('')
      setAddress('')
      setPhone('')
    }
    setErrors({})
  }, [facility, open])

  const validate = () => {
    const newErrors: { name?: string; address?: string; phone?: string } = {}
    if (!name.trim()) {
      newErrors.name = 'Hospital name is required'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Hospital name must be at least 2 characters'
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required'
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else {
      const phoneErr = validatePhone(phone)
      if (phoneErr) newErrors.phone = phoneErr
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !hospitalId) return

    setSubmitting(true)
    try {
      if (isEdit && facility) {
        await updateFacility(hospitalId, facility.id, {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
        })
        toast({
          title: 'Hospital updated',
          description: 'Hospital details have been updated successfully.',
        })
      } else {
        await createFacility(hospitalId, {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
        })
        toast({
          title: 'Hospital added',
          description: 'New hospital has been registered successfully.',
        })
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save hospital.'
      toast({
        variant: 'destructive',
        title: 'Error saving hospital',
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
          <DialogTitle>{isEdit ? 'Edit Hospital' : 'Add Hospital'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='facility-name'>Hospital Name</Label>
            <Input
              id='facility-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. City General Hospital'
              disabled={submitting}
            />
            {errors.name && (
              <p className='text-xs text-destructive'>{errors.name}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='facility-address'>Address</Label>
            <textarea
              id='facility-address'
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder='e.g. 123 Healthcare Ave, Medical District'
              disabled={submitting}
              className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            />
            {errors.address && (
              <p className='text-xs text-destructive'>{errors.address}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='facility-phone'>Phone</Label>
            <Input
              id='facility-phone'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder='e.g. +1 (555) 019-2834'
              disabled={submitting}
            />
            {errors.phone && (
              <p className='text-xs text-destructive'>{errors.phone}</p>
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
                : 'Add Hospital'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
