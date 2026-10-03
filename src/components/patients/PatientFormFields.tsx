'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react'
import { Patient, Facility, Provider } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { AddDoctorDialog } from '@/components/patients/AddDoctorDialog'

interface PatientFormFieldsProps {
  name: string
  setName: (val: string) => void
  gender: 'male' | 'female' | 'other' | ''
  setGender: (val: 'male' | 'female' | 'other' | '') => void
  dob: string
  setDob: (val: string) => void
  allergiesInput: string
  setAllergiesInput: (val: string) => void
  facilityId: string
  onFacilityChange: (val: string) => void
  currentDoctorId: string
  setCurrentDoctorId: (val: string) => void
  status: Patient['status']
  setStatus: (val: Patient['status']) => void
  patientType: 'in-patient' | 'out-patient' | ''
  setPatientType: (val: 'in-patient' | 'out-patient' | '') => void
  admitDate: string
  setAdmitDate: (val: string) => void
  errors: {
    name?: string
    gender?: string
    dob?: string
    facilityId?: string
    status?: string
    patientType?: string
    admitDate?: string
  }
  facilities: Facility[]
  facilitiesLoading: boolean
  providersLoading: boolean
  filteredProviders: Provider[]
  computedAge: number | null
  disabled?: boolean
}

export function PatientFormFields({
  name,
  setName,
  gender,
  setGender,
  dob,
  setDob,
  allergiesInput,
  setAllergiesInput,
  facilityId,
  onFacilityChange,
  currentDoctorId,
  setCurrentDoctorId,
  status,
  setStatus,
  patientType,
  setPatientType,
  admitDate,
  setAdmitDate,
  errors,
  facilities,
  facilitiesLoading,
  providersLoading,
  filteredProviders,
  computedAge,
  disabled = false,
}: PatientFormFieldsProps) {
  const [doctorPopoverOpen, setDoctorPopoverOpen] = useState(false)
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('')
  const [addDoctorOpen, setAddDoctorOpen] = useState(false)

  const doctorPopoverRef = useRef<HTMLDivElement>(null)

  // Close doctor popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        doctorPopoverRef.current &&
        !doctorPopoverRef.current.contains(e.target as Node)
      ) {
        setDoctorPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-select single facility if only one exists
  useEffect(() => {
    if (facilities.length === 1 && !facilityId) {
      onFacilityChange(facilities[0].id)
    }
  }, [facilities, facilityId, onFacilityChange])

  const selectedDoctor = useMemo(() => {
    return filteredProviders.find((p) => p.id === currentDoctorId)
  }, [filteredProviders, currentDoctorId])

  const hasExactMatch = useMemo(() => {
    if (!doctorSearchQuery.trim()) return false
    const q = doctorSearchQuery.trim().toLowerCase()
    return filteredProviders.some((p) => p.name.toLowerCase() === q)
  }, [filteredProviders, doctorSearchQuery])

  return (
    <div className='space-y-6'>
      {/* Section 1: Personal Information */}
      <div className='space-y-4'>
        <h3 className='text-sm font-semibold text-foreground uppercase tracking-wider'>
          Section 1 — Personal Information
        </h3>

        <div className='space-y-1.5'>
          <Label htmlFor='patient-name'>
            Full Name <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='patient-name'
            placeholder='e.g. Eleanor Vance'
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
          />
          {errors.name && (
            <p className='text-sm text-destructive'>{errors.name}</p>
          )}
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='patient-gender'>
              Gender <span className='text-destructive'>*</span>
            </Label>
            <select
              id='patient-gender'
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as 'male' | 'female' | 'other' | '')
              }
              disabled={disabled}
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <option value=''>Select gender</option>
              <option value='male'>Male</option>
              <option value='female'>Female</option>
              <option value='other'>Other</option>
            </select>
            {errors.gender && (
              <p className='text-sm text-destructive'>{errors.gender}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='patient-dob'>
              Date of Birth <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='patient-dob'
              type='date'
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={disabled}
            />
            {computedAge !== null && !errors.dob && (
              <p className='text-xs text-muted-foreground font-medium'>
                Age: {computedAge} {computedAge === 1 ? 'year' : 'years'}
              </p>
            )}
            {errors.dob && (
              <p className='text-sm text-destructive'>{errors.dob}</p>
            )}
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='patient-allergies'>Allergies</Label>
          <Input
            id='patient-allergies'
            placeholder='e.g. Penicillin, Aspirin, Peanuts'
            value={allergiesInput}
            onChange={(e) => setAllergiesInput(e.target.value)}
            disabled={disabled}
          />
          <p className='text-xs text-muted-foreground'>
            Optional — enter multiple allergies separated by commas.
          </p>
        </div>
      </div>

      <Separator />

      {/* Section 2: Clinical Assignment */}
      <div className='space-y-4'>
        <h3 className='text-sm font-semibold text-foreground uppercase tracking-wider'>
          Section 2 — Clinical Assignment
        </h3>

        <div className='space-y-1.5'>
          <Label htmlFor='patient-facility'>
            Hospital <span className='text-destructive'>*</span>
          </Label>
          <select
            id='patient-facility'
            value={facilityId}
            onChange={(e) => onFacilityChange(e.target.value)}
            disabled={disabled || facilitiesLoading}
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
            <p className='text-sm text-destructive'>{errors.facilityId}</p>
          )}
        </div>

        {/* Current Doctor Field with Command Popover + Inline Add Doctor */}
        <div className='space-y-1.5'>
          <Label htmlFor='patient-doctor'>Current Doctor</Label>
          <div className='relative' ref={doctorPopoverRef}>
            <button
              id='patient-doctor'
              type='button'
              onClick={() => {
                if (!disabled && facilityId) {
                  setDoctorPopoverOpen((prev) => !prev)
                }
              }}
              disabled={disabled || !facilityId || providersLoading}
              className='flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left'
            >
              <span
                className={
                  selectedDoctor
                    ? 'text-foreground font-medium truncate'
                    : 'text-muted-foreground truncate'
                }
              >
                {!facilityId
                  ? 'Select a hospital first'
                  : providersLoading
                  ? 'Loading providers...'
                  : filteredProviders.length === 0
                  ? 'No providers assigned to this hospital'
                  : selectedDoctor
                  ? `${selectedDoctor.name} (${selectedDoctor.specialty})`
                  : 'Select a doctor'}
              </span>
              <div className='flex items-center gap-1.5 shrink-0 ml-2'>
                {selectedDoctor && !disabled && (
                  <span
                    role='button'
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentDoctorId('')
                    }}
                    className='rounded-sm p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground'
                    title='Clear selection'
                    aria-label='Clear selected doctor'
                  >
                    <X className='h-3.5 w-3.5' />
                  </span>
                )}
                <ChevronsUpDown className='h-4 w-4 opacity-50' />
              </div>
            </button>

            {doctorPopoverOpen && (
              <div className='absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none'>
                <Command className='w-full'>
                  <CommandInput
                    placeholder='Search doctor by name...'
                    value={doctorSearchQuery}
                    onValueChange={setDoctorSearchQuery}
                    autoFocus
                  />
                  <CommandList className='max-h-48 overflow-y-auto'>
                    {filteredProviders.length === 0 ? (
                      <div className='p-3 text-center text-xs text-muted-foreground'>
                        No providers assigned to this hospital.
                      </div>
                    ) : (
                      <>
                        <CommandEmpty className='py-4 text-center text-xs text-muted-foreground'>
                          No doctors found.
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredProviders.map((doc) => {
                            const isSelected = doc.id === currentDoctorId
                            return (
                              <CommandItem
                                key={doc.id}
                                value={`${doc.name} ${doc.specialty}`}
                                onSelect={() => {
                                  setCurrentDoctorId(doc.id)
                                  setDoctorPopoverOpen(false)
                                  setDoctorSearchQuery('')
                                }}
                                className='flex items-center justify-between cursor-pointer px-2 py-1.5 text-xs'
                              >
                                <div className='flex items-center gap-2'>
                                  <Check
                                    className={cn(
                                      'h-3.5 w-3.5 shrink-0',
                                      isSelected ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <span className='font-medium'>{doc.name}</span>
                                  <span className='text-muted-foreground'>
                                    ({doc.specialty})
                                  </span>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>

                  <CommandSeparator />

                  {/* Footer action button */}
                  <div className='p-1 bg-muted/20'>
                    <button
                      type='button'
                      onClick={() => {
                        setDoctorPopoverOpen(false)
                        setAddDoctorOpen(true)
                      }}
                      className='flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors text-left'
                    >
                      <Plus className='h-3.5 w-3.5 shrink-0' />
                      <span className='truncate'>
                        {hasExactMatch || !doctorSearchQuery.trim()
                          ? '+ Add new doctor'
                          : `+ Add "${doctorSearchQuery.trim()}" as new doctor`}
                      </span>
                    </button>
                  </div>
                </Command>
              </div>
            )}
          </div>
          <p className='text-xs text-muted-foreground'>
            Optional — lists providers assigned to the selected hospital.
          </p>
        </div>

        {/* Inline Add Doctor Dialog */}
        <AddDoctorDialog
          open={addDoctorOpen}
          onOpenChange={(val) => {
            setAddDoctorOpen(val)
          }}
          initialName={doctorSearchQuery}
          facilityId={facilityId || null}
          onDoctorAdded={(newProvider) => {
            setCurrentDoctorId(newProvider.id)
            setDoctorSearchQuery('')
            setDoctorPopoverOpen(false)
          }}
        />

        <div className='space-y-1.5'>
          <Label htmlFor='patient-status'>
            Status <span className='text-destructive'>*</span>
          </Label>
          <select
            id='patient-status'
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as Patient['status'])
            }
            disabled={disabled}
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
            <option value='discharged'>Discharged</option>
          </select>
          {errors.status && (
            <p className='text-sm text-destructive'>{errors.status}</p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='patient-type'>
            Patient Type <span className='text-destructive'>*</span>
          </Label>
          <select
            id='patient-type'
            value={patientType}
            onChange={(e) =>
              setPatientType(e.target.value as 'in-patient' | 'out-patient' | '')
            }
            disabled={disabled}
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <option value=''>Select patient type</option>
            <option value='in-patient'>In-Patient</option>
            <option value='out-patient'>Out-Patient</option>
          </select>
          {errors.patientType && (
            <p className='text-sm text-destructive'>{errors.patientType}</p>
          )}
        </div>

        {patientType && (
          <div className='space-y-1.5'>
            <Label htmlFor='patient-admit-date'>
              Admit Date <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='patient-admit-date'
              type='date'
              max={new Date().toISOString().split('T')[0]}
              value={admitDate}
              onChange={(e) => setAdmitDate(e.target.value)}
              disabled={disabled}
            />
            {errors.admitDate && (
              <p className='text-sm text-destructive'>{errors.admitDate}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
