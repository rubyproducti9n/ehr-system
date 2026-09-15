'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserX } from 'lucide-react'
import { Patient } from '@/types'
import { getPatientById, subscribeToPatients } from '@/lib/services/patientService'
import { DemographicsPanel } from '@/components/patients/DemographicsPanel'
import { EditPatientSheet } from '@/components/patients/EditPatientSheet'
import { SubTabPlaceholder } from '@/components/patients/SubTabPlaceholder'
import { AdtEventsTab } from '@/components/patients/tabs/AdtEventsTab'
import { LabResultsTab } from '@/components/patients/tabs/LabResultsTab'
import { PrescriptionsTab } from '@/components/patients/tabs/PrescriptionsTab'
import { DocumentsTab } from '@/components/patients/tabs/DocumentsTab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

const VALID_TABS = ['adt', 'lab', 'rx', 'docs', 'encounter'] as const
type TabKey = typeof VALID_TABS[number]

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const patientId = params.id as string

  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  // Current active sub-tab from URL search param
  const currentTab = useMemo(() => {
    const tabParam = searchParams.get('tab') as TabKey
    if (tabParam && VALID_TABS.includes(tabParam)) {
      return tabParam
    }
    return 'adt'
  }, [searchParams])

  // Realtime & initial fetch
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    // Initial fetch
    getPatientById(patientId)
      .then((data) => {
        if (isMounted) {
          setPatient(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Error fetching patient:', err)
        if (isMounted) {
          setPatient(null)
          setLoading(false)
        }
      })

    // Subscribe to realtime updates for live sync
    const unsubscribe = subscribeToPatients((allPatients) => {
      if (!isMounted) return
      const matched = allPatients.find((p) => p.id === patientId)
      if (matched) {
        setPatient(matched)
      }
    })

    return () => {
      isMounted = false
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [patientId])

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    router.replace('/patients/' + patientId + '?' + params.toString())
  }

  // Full-page Loading Skeleton
  if (loading) {
    return (
      <div className='space-y-6'>
        {/* Breadcrumb Skeleton */}
        <div className='flex items-center gap-2'>
          <Skeleton className='h-4 w-16' />
          <span className='text-muted-foreground'>/</span>
          <Skeleton className='h-4 w-32' />
        </div>

        {/* Two-column layout skeleton */}
        <div className='flex flex-col lg:flex-row gap-6 items-start'>
          {/* Left panel skeleton */}
          <div className='w-[300px] shrink-0 rounded-lg border bg-card p-5 space-y-6'>
            <div className='flex flex-col items-center space-y-3'>
              <Skeleton className='h-16 w-16 rounded-full' />
              <Skeleton className='h-6 w-36' />
              <Skeleton className='h-5 w-20' />
              <Skeleton className='h-4 w-44' />
            </div>
            <div className='space-y-3 pt-2'>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className='flex justify-between'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-4 w-24' />
                </div>
              ))}
            </div>
            <div className='pt-4 space-y-2 border-t'>
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-9 w-full' />
            </div>
          </div>

          {/* Right panel skeleton */}
          <div className='flex-1 w-full space-y-4'>
            <div className='flex gap-2 border-b pb-3'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-9 w-24 rounded-md' />
              ))}
            </div>
            <Skeleton className='h-[400px] w-full rounded-lg' />
          </div>
        </div>
      </div>
    )
  }

  // Not Found State
  if (!patient) {
    return (
      <div className='space-y-6'>
        {/* Breadcrumb */}
        <div className='flex items-center gap-2 text-sm'>
          <Link href='/patients' className='text-muted-foreground hover:text-primary'>
            Patients
          </Link>
          <span className='text-muted-foreground'>/</span>
          <span className='font-semibold text-foreground'>Not Found</span>
        </div>

        {/* Empty State Card */}
        <div className='flex min-h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3'>
            <UserX className='h-6 w-6 text-muted-foreground' />
          </div>
          <h2 className='text-lg font-semibold text-foreground'>Patient not found</h2>
          <p className='text-xs text-muted-foreground mt-1 max-w-sm'>
            The requested patient profile does not exist or has been removed from the database.
          </p>
          <Button asChild variant='outline' size='sm' className='mt-4 gap-2'>
            <Link href='/patients'>
              <ArrowLeft className='h-4 w-4' />
              Back to Patients
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Breadcrumb Row */}
      <div className='flex items-center gap-2 text-sm'>
        <Link href='/patients' className='text-muted-foreground hover:text-primary transition-colors'>
          Patients
        </Link>
        <span className='text-muted-foreground'>/</span>
        <span className='font-semibold text-primary'>{patient.name}</span>
      </div>

      {/* Two-column Profile Layout */}
      <div className='flex flex-col lg:flex-row gap-6 items-start'>
        {/* Left Demographics Panel (fixed 300px) */}
        <DemographicsPanel
          patient={patient}
          onEdit={() => setEditSheetOpen(true)}
        />

        {/* Right Sub-tab Navigation & Content (scrollable, flex-1) */}
        <div className='flex-1 w-full'>
          <Tabs value={currentTab} onValueChange={handleTabChange} className='w-full space-y-4'>
            <TabsList className='grid grid-cols-5 w-full max-w-2xl bg-muted/70 p-1'>
              <TabsTrigger value='adt'>ADT Events</TabsTrigger>
              <TabsTrigger value='lab'>Lab Results</TabsTrigger>
              <TabsTrigger value='rx'>Prescriptions</TabsTrigger>
              <TabsTrigger value='docs'>Documents</TabsTrigger>
              <TabsTrigger value='encounter'>Encounter</TabsTrigger>
            </TabsList>

            <TabsContent value='adt' className='mt-0'>
              <AdtEventsTab patientId={patient.id} />
            </TabsContent>

            <TabsContent value='lab' className='mt-0'>
              <LabResultsTab patientId={patient.id} />
            </TabsContent>

            <TabsContent value='rx' className='mt-0'>
              <PrescriptionsTab patientId={patient.id} />
            </TabsContent>

            <TabsContent value='docs' className='mt-0'>
              <DocumentsTab patientId={patient.id} />
            </TabsContent>

            <TabsContent value='encounter' className='mt-0'>
              <SubTabPlaceholder label='Encounter' chunk={8} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Patient Sheet */}
      <EditPatientSheet
        patient={patient}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
      />
    </div>
  )
}
