'use client'

import { Patient, Facility, Provider } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

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
  errors: {
    name?: string
    gender?: string
    dob?: string
    facilityId?: string
    status?: string
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
  errors,
  facilities,
  facilitiesLoading,
  providersLoading,
  filteredProviders,
  computedAge,
  disabled = false,
}: PatientFormFieldsProps) {
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
            Facility <span className='text-destructive'>*</span>
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
                ? 'Loading facilities...'
                : facilities.length === 0
                ? 'No facilities registered yet'
                : 'Select a facility'}
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

        <div className='space-y-1.5'>
          <Label htmlFor='patient-doctor'>Current Doctor</Label>
          <select
            id='patient-doctor'
            value={currentDoctorId}
            onChange={(e) => setCurrentDoctorId(e.target.value)}
            disabled={disabled || !facilityId || providersLoading}
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <option value=''>
              {!facilityId
                ? 'Select a facility first'
                : providersLoading
                ? 'Loading providers...'
                : filteredProviders.length === 0
                ? 'No providers assigned to this facility'
                : 'None / Select a doctor'}
            </option>
            {filteredProviders.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} ({doc.specialty})
              </option>
            ))}
          </select>
          <p className='text-xs text-muted-foreground'>
            Optional — lists providers assigned to the selected facility.
          </p>
        </div>

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
      </div>
    </div>
  )
}
