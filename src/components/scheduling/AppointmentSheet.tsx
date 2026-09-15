'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Appointment } from '@/types'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { createAppointment, updateAppointment } from '@/lib/services/appointmentService'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface AppointmentSheetProps {
  appointment?: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentSheet({
  appointment,
  open,
  onOpenChange,
}: AppointmentSheetProps) {
  const { toast } = useToast()
  const { patients, loading: patientsLoading } = usePatients()
  const { providers, loading: providersLoading } = useProviders()
  const { facilities, loading: facilitiesLoading } = useFacilities()

  const isEdit = !!appointment

  const [patientId, setPatientId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [providerId, setProviderId] = useState('')
  const [providerName, setProviderName] = useState('')
  const [facilityId, setFacilityId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<Appointment['status']>('scheduled')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize or reset form when sheet opens or appointment changes
  useEffect(() => {
    if (open) {
      if (appointment) {
        setPatientId(appointment.patientId || '')
        setPatientName(appointment.patientName || '')
        setProviderId(appointment.providerId || '')
        setProviderName(appointment.providerName || '')
        setFacilityId(appointment.facilityId || '')
        setStatus(appointment.status || 'scheduled')
        setNotes(appointment.notes || '')

        if (appointment.scheduledDate) {
          const d = new Date(appointment.scheduledDate)
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          setDate(`${yyyy}-${mm}-${dd}`)

          const hh = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          setTime(`${hh}:${min}`)
        } else {
          setDate('')
          setTime('')
        }
      } else {
        setPatientId('')
        setPatientName('')
        setProviderId('')
        setProviderName('')
        setFacilityId('')
        setDate('')
        setTime('')
        setStatus('scheduled')
        setNotes('')
      }
      setErrors({})
    }
  }, [open, appointment])

  // Filtered providers based on selected facility
  const filteredProviders = useMemo(() => {
    if (!facilityId) return providers
    return providers.filter((p) => p.facilityId === facilityId)
  }, [providers, facilityId])

  // Handle patient select
  const handlePatientSelect = (id: string) => {
    setPatientId(id)
    const selected = patients.find((p) => p.id === id)
    if (selected) {
      setPatientName(selected.name)
    }
  }

  // Handle provider select
  const handleProviderSelect = (id: string) => {
    setProviderId(id)
    const selected = providers.find((p) => p.id === id)
    if (selected) {
      setProviderName(selected.name)
      if (selected.facilityId) {
        setFacilityId(selected.facilityId)
      }
    }
  }

  // Handle facility select
  const handleFacilitySelect = (id: string) => {
    setFacilityId(id)
    if (providerId) {
      const currentProvider = providers.find((p) => p.id === providerId)
      if (currentProvider && currentProvider.facilityId !== id) {
        setProviderId('')
        setProviderName('')
      }
    }
  }

  const todayStr = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!patientId) newErrors.patientId = 'Please select a patient'
    if (!providerId) newErrors.providerId = 'Please select a provider'
    if (!facilityId) newErrors.facilityId = 'Please select a facility'

    if (!date) {
      newErrors.date = 'Date is required'
    } else if (!isEdit && date < todayStr) {
      newErrors.date = 'Date cannot be in the past'
    }

    if (!time) {
      newErrors.time = 'Time is required'
    }

    if (!status) {
      newErrors.status = 'Status is required'
    }

    if (notes.length > 300) {
      newErrors.notes = 'Notes cannot exceed 300 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const scheduledDate = new Date(`${date}T${time}`).toISOString()

      // Ensure names are up to date if not already set
      const resolvedPatientName =
        patientName || patients.find((p) => p.id === patientId)?.name || 'Unknown Patient'
      const resolvedProviderName =
        providerName || providers.find((p) => p.id === providerId)?.name || 'Unknown Provider'

      if (isEdit && appointment) {
        await updateAppointment(appointment.id, {
          patientId,
          patientName: resolvedPatientName,
          providerId,
          providerName: resolvedProviderName,
          facilityId,
          scheduledDate,
          status,
          notes: notes.trim(),
        })

        toast({
          title: 'Appointment updated',
          description: 'The appointment has been successfully updated.',
        })
      } else {
        await createAppointment({
          patientId,
          patientName: resolvedPatientName,
          providerId,
          providerName: resolvedProviderName,
          facilityId,
          scheduledDate,
          status,
          notes: notes.trim(),
        })

        toast({
          title: 'Appointment scheduled',
          description: 'The appointment has been successfully scheduled.',
        })
      }

      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred.'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto w-full">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update appointment details, provider assignment, or status.'
              : 'Schedule a clinical appointment for a patient.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2 pb-8">
          {/* Patient Select */}
          <div className="space-y-1.5">
            <Label htmlFor="patientSelect" className="text-xs font-semibold">
              Patient <span className="text-destructive">*</span>
            </Label>
            <select
              id="patientSelect"
              value={patientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              disabled={submitting || patientsLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {patientsLoading ? 'Loading patients...' : 'Select patient'}
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.patientId && (
              <p className="text-xs text-destructive">{errors.patientId}</p>
            )}
          </div>

          {/* Facility Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="facilitySelect" className="text-xs font-semibold">
                Facility <span className="text-destructive">*</span>
              </Label>
              {facilityId && (
                <button
                  type="button"
                  onClick={() => handleFacilitySelect('')}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              id="facilitySelect"
              value={facilityId}
              onChange={(e) => handleFacilitySelect(e.target.value)}
              disabled={submitting || facilitiesLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {facilitiesLoading ? 'Loading facilities...' : 'Select facility'}
              </option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {errors.facilityId && (
              <p className="text-xs text-destructive">{errors.facilityId}</p>
            )}
          </div>

          {/* Provider Select */}
          <div className="space-y-1.5">
            <Label htmlFor="providerSelect" className="text-xs font-semibold">
              Provider <span className="text-destructive">*</span>
            </Label>
            <select
              id="providerSelect"
              value={providerId}
              onChange={(e) => handleProviderSelect(e.target.value)}
              disabled={submitting || providersLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {providersLoading
                  ? 'Loading providers...'
                  : filteredProviders.length === 0
                  ? 'No providers available'
                  : 'Select provider'}
              </option>
              {filteredProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.specialty ? `(${p.specialty})` : ''}
                </option>
              ))}
            </select>
            {errors.providerId && (
              <p className="text-xs text-destructive">{errors.providerId}</p>
            )}
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dateInput" className="text-xs font-semibold">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dateInput"
                type="date"
                min={isEdit ? undefined : todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={submitting}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timeInput" className="text-xs font-semibold">
                Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="timeInput"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={submitting}
              />
              {errors.time && (
                <p className="text-xs text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          {/* Status Select */}
          <div className="space-y-1.5">
            <Label htmlFor="statusSelect" className="text-xs font-semibold">
              Status <span className="text-destructive">*</span>
            </Label>
            <select
              id="statusSelect"
              value={status}
              onChange={(e) => setStatus(e.target.value as Appointment['status'])}
              disabled={submitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {errors.status && (
              <p className="text-xs text-destructive">{errors.status}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="notesInput" className="text-xs font-semibold">
                Notes
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {notes.length}/300
              </span>
            </div>
            <textarea
              id="notesInput"
              placeholder="Clinical reason for visit, prep instructions, etc."
              rows={3}
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? 'Saving...' : 'Scheduling...'}
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Schedule Appointment'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
