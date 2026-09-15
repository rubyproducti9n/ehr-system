'use client'

import Link from 'next/link'
import { Edit, ArrowLeft } from 'lucide-react'
import { Patient } from '@/types'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { formatDate, calculateAge, getAvatarColor, getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface DemographicsPanelProps {
  patient: Patient
  onEdit: () => void
}

export function DemographicsPanel({ patient, onEdit }: DemographicsPanelProps) {
  const { providers } = useProviders()
  const { facilities } = useFacilities()

  // Resolved names
  const doctor = providers.find((p) => p.id === patient.currentDoctorId)
  const doctorName = doctor ? doctor.name : '—'

  const facility = facilities.find((f) => f.id === patient.facilityId)
  const facilityName = facility ? facility.name : '—'

  // Computed fields
  const age = calculateAge(patient.dob)
  const formattedDob = formatDate(patient.dob)
  const formattedLastVisit = formatDate(patient.lastVisitDate)
  const formattedRegistered = formatDate(patient.createdAt)
  const allergiesDisplay =
    patient.allergies && patient.allergies.length > 0
      ? patient.allergies.join(', ')
      : '—'

  // Avatar Initials & Color
  const initials = getInitials(patient.name)
  const avatarColor = getAvatarColor(patient.gender)

  return (
    <aside className='w-[300px] shrink-0 rounded-lg border bg-card p-5 flex flex-col justify-between self-start shadow-sm'>
      <div className='space-y-6'>
        {/* Top Section — Identity */}
        <div className='flex flex-col items-center text-center space-y-2.5'>
          {/* Avatar */}
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm ${avatarColor}`}
          >
            {initials}
          </div>

          {/* Patient Full Name */}
          <div className='space-y-1'>
            <h2 className='text-xl font-semibold text-foreground tracking-tight'>
              {patient.name}
            </h2>

            {/* Status Badge */}
            <div>
              {patient.status === 'active' && (
                <Badge className='bg-emerald-500 hover:bg-emerald-600 text-white border-none'>
                  Active
                </Badge>
              )}
              {patient.status === 'inactive' && (
                <Badge className='bg-amber-500 hover:bg-amber-600 text-white border-none'>
                  Inactive
                </Badge>
              )}
              {patient.status === 'discharged' && (
                <Badge className='bg-slate-500 hover:bg-slate-600 text-white border-none'>
                  Discharged
                </Badge>
              )}
            </div>
          </div>

          {/* Meta Chips */}
          <p className='text-xs text-muted-foreground font-medium'>
            {age} yrs · <span className='capitalize'>{patient.gender}</span> · {facilityName}
          </p>
        </div>

        <Separator />

        {/* Information Rows */}
        <div className='space-y-3 text-xs'>
          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Date of Birth</span>
            <span className='font-medium text-foreground text-right'>{formattedDob}</span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Age</span>
            <span className='font-medium text-foreground text-right'>{age} years</span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Gender</span>
            <span className='font-medium text-foreground capitalize text-right'>{patient.gender}</span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Current Doctor</span>
            <span className='font-medium text-foreground text-right'>{doctorName}</span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Facility</span>
            <span className='font-medium text-foreground text-right'>{facilityName}</span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Last Visit</span>
            <span className='font-medium text-foreground text-right'>{formattedLastVisit}</span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Allergies</span>
            <span className='font-medium text-foreground text-right max-w-[170px] truncate' title={allergiesDisplay}>
              {allergiesDisplay}
            </span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Registered</span>
            <span className='font-medium text-foreground text-right'>{formattedRegistered}</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className='pt-6 space-y-2 border-t mt-6'>
        <Button
          variant='outline'
          onClick={onEdit}
          className='w-full gap-2 text-sm'
        >
          <Edit className='h-4 w-4' />
          Edit Patient
        </Button>

        <Button
          variant='ghost'
          asChild
          className='w-full gap-2 text-sm text-muted-foreground hover:text-foreground'
        >
          <Link href='/patients'>
            <ArrowLeft className='h-4 w-4' />
            Back to Patients
          </Link>
        </Button>
      </div>
    </aside>
  )
}
