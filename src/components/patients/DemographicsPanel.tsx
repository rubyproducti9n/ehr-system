'use client'

import Link from 'next/link'
import { Edit, ArrowLeft, ChevronDown } from 'lucide-react'
import { Patient } from '@/types'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { updatePatient, updatePatientStatus } from '@/lib/services/patientService'
import { formatDate, calculateAge, getAvatarColor, getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DemographicsPanelProps {
  patient: Patient
  onEdit: () => void
}

export function DemographicsPanel({ patient, onEdit }: DemographicsPanelProps) {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const { toast } = useToast()
  const { providers } = useProviders()
  const { facilities } = useFacilities()

  const handleStatusChange = async (newStatus: Patient['status']) => {
    if (patient.status === newStatus || !hospitalId) return
    try {
      await updatePatientStatus(hospitalId, patient.id, newStatus)

      if (newStatus === 'discharged' && patient.patientType === 'in-patient') {
        const today = new Date().toISOString().split('T')[0]
        await updatePatient(hospitalId, patient.id, {
          lastVisitDate: today,
          updatedAt: new Date().toISOString(),
        })
        toast({
          title: 'Patient discharged',
          description: 'Last visit date has been updated to today.',
        })
      } else {
        toast({
          title: 'Status updated',
          description: `Status updated to ${newStatus}`,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update patient status'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      })
    }
  }

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

            {/* Status Dropdown Selector */}
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type='button' className='inline-flex items-center gap-1 focus:outline-none'>
                    {patient.status === 'active' && (
                      <Badge className='bg-emerald-500 hover:bg-emerald-600 text-white border-none cursor-pointer'>
                        Active <ChevronDown className='h-3 w-3 ml-0.5 opacity-80' />
                      </Badge>
                    )}
                    {patient.status === 'inactive' && (
                      <Badge className='bg-amber-500 hover:bg-amber-600 text-white border-none cursor-pointer'>
                        Inactive <ChevronDown className='h-3 w-3 ml-0.5 opacity-80' />
                      </Badge>
                    )}
                    {patient.status === 'discharged' && (
                      <Badge className='bg-slate-500 hover:bg-slate-600 text-white border-none cursor-pointer'>
                        Discharged <ChevronDown className='h-3 w-3 ml-0.5 opacity-80' />
                      </Badge>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='center'>
                  <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={patient.status === 'active'}
                    onClick={() => handleStatusChange('active')}
                    className='cursor-pointer'
                  >
                    Set Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={patient.status === 'inactive'}
                    onClick={() => handleStatusChange('inactive')}
                    className='cursor-pointer'
                  >
                    Set Inactive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={patient.status === 'discharged'}
                    onClick={() => handleStatusChange('discharged')}
                    className='cursor-pointer'
                  >
                    Set Discharged
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            <span className='text-muted-foreground'>Hospital</span>
            <span className='font-medium text-foreground text-right'>{facilityName}</span>
          </div>

          <div className='flex justify-between items-center gap-2'>
            <span className='text-muted-foreground'>Patient Type</span>
            <div>
              {patient.patientType === 'in-patient' && (
                <Badge className='bg-blue-500 hover:bg-blue-600 text-white border-none text-[10px] px-1.5 py-0'>
                  In-Patient
                </Badge>
              )}
              {patient.patientType === 'out-patient' && (
                <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white border-none text-[10px] px-1.5 py-0'>
                  Out-Patient
                </Badge>
              )}
              {!patient.patientType && (
                <span className='font-medium text-foreground text-right'>—</span>
              )}
            </div>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Admit Date</span>
            <span className='font-medium text-foreground text-right'>
              {formatDate(patient.admitDate ?? null)}
            </span>
          </div>

          <div className='flex justify-between items-start gap-2'>
            <span className='text-muted-foreground'>Last Visit</span>
            <div className='text-right'>
              <span className='font-medium text-foreground'>{formattedLastVisit}</span>
              {patient.patientType === 'out-patient' && (
                <span className='text-[11px] text-muted-foreground block'>
                  (same-day visit)
                </span>
              )}
              {patient.patientType === 'in-patient' && patient.status === 'discharged' && (
                <span className='text-[11px] text-muted-foreground block'>
                  (discharge date)
                </span>
              )}
            </div>
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
