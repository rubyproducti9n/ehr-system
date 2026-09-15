'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, MoreHorizontal, UserX, AlertTriangle } from 'lucide-react'
import { Patient } from '@/types'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { updatePatientStatus, deletePatient } from '@/lib/services/patientService'
import { useAppStore } from '@/store/useAppStore'
import { formatDate, calculateAge } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { NewPatientSheet } from '@/components/patients/NewPatientSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export default function PatientsPage() {
  const { patients, loading: patientsLoading, error } = usePatients()
  const { providers, loading: providersLoading } = useProviders()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { toast } = useToast()
  const setSelectedPatientId = useAppStore((state) => state.setSelectedPatientId)

  // Filters & Search
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Sheet & Dialog state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)
  const [confirmNameInput, setConfirmNameInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Lookup maps
  const providerMap = useMemo(() => {
    const map = new Map<string, string>()
    providers.forEach((p) => map.set(p.id, p.name))
    return map
  }, [providers])

  const facilityMap = useMemo(() => {
    const map = new Map<string, string>()
    facilities.forEach((f) => map.set(f.id, f.name))
    return map
  }, [facilities])

  // Filtered and sorted patients
  const filteredPatients = useMemo(() => {
    let result = [...patients]

    // 1. Sort by createdAt descending (most recent first)
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime()
      const timeB = new Date(b.createdAt || 0).getTime()
      return timeB - timeA
    })

    // 2. Status filter
    if (selectedStatusTab !== 'all') {
      result = result.filter((p) => p.status === selectedStatusTab)
    }

    // 3. Search query filter
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase().trim()
      result = result.filter((p) => {
        const patientName = (p.name || '').toLowerCase()
        const doctorName = (p.currentDoctorId ? providerMap.get(p.currentDoctorId) || '' : '').toLowerCase()
        const facilityName = (p.facilityId ? facilityMap.get(p.facilityId) || '' : '').toLowerCase()
        return (
          patientName.includes(query) ||
          doctorName.includes(query) ||
          facilityName.includes(query)
        )
      })
    }

    return result
  }, [patients, selectedStatusTab, debouncedQuery, providerMap, facilityMap])

  // Status update handler
  const handleStatusChange = async (patient: Patient, newStatus: Patient['status']) => {
    if (patient.status === newStatus) return
    try {
      await updatePatientStatus(patient.id, newStatus)
      toast({
        title: 'Status updated',
        description: 'Status updated to ' + newStatus,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Status Update Failed',
        description: err?.message || 'Failed to update patient status.',
      })
    }
  }

  // Delete initiation
  const handleOpenDelete = (patient: Patient) => {
    setPatientToDelete(patient)
    setConfirmNameInput('')
    setDeleteConfirmOpen(true)
  }

  // Delete submission
  const handleConfirmDelete = async () => {
    if (!patientToDelete) return
    setDeleting(true)
    try {
      await deletePatient(patientToDelete.id)
      toast({
        title: 'Patient deleted',
        description: patientToDelete.name + ' has been permanently removed.',
      })
      setDeleteConfirmOpen(false)
      setPatientToDelete(null)
      setConfirmNameInput('')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err?.message || 'Failed to delete patient.',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Patient profile navigation placeholder (Chunk 5)
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatientId(patient.id)
    toast({
      title: 'Patient Selected',
      description: 'Patient Profile for ' + patient.name + ' will open in Chunk 5.',
    })
  }

  const isLoading = patientsLoading || providersLoading || facilitiesLoading

  const isDeleteNameMatched =
    patientToDelete &&
    confirmNameInput.trim().toLowerCase() === patientToDelete.name.trim().toLowerCase()

  return (
    <div className='space-y-6'>
      {/* Top Bar Row: Status Tabs + New Patient Button */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <Tabs
          value={selectedStatusTab}
          onValueChange={setSelectedStatusTab}
          className='w-full sm:w-auto'
        >
          <TabsList className='grid grid-cols-4 w-full sm:w-auto'>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='active'>Active</TabsTrigger>
            <TabsTrigger value='inactive'>Inactive</TabsTrigger>
            <TabsTrigger value='discharged'>Discharged</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setSheetOpen(true)} className='gap-2 w-full sm:w-auto'>
          <Plus className='h-4 w-4' />
          New Patient
        </Button>
      </div>

      {/* Search Bar Row */}
      <div className='relative w-full'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='text'
          placeholder='Search by name, doctor, or facility...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='pl-9 w-full bg-background'
        />
      </div>

      {error && (
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive'>
          {error}
        </div>
      )}

      {/* Patient Table */}
      <div className='rounded-md border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold'>Patient Name</TableHead>
              <TableHead className='font-semibold'>Gender</TableHead>
              <TableHead className='font-semibold'>Age</TableHead>
              <TableHead className='font-semibold'>Status</TableHead>
              <TableHead className='font-semibold'>Last Visit</TableHead>
              <TableHead className='font-semibold'>Current Doctor</TableHead>
              <TableHead className='font-semibold'>Facility</TableHead>
              <TableHead className='text-right font-semibold'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // 6 rows of Skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className='h-5 w-36' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-16' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-16' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-20' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-24' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-32' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-32' />
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-2'>
                      <Skeleton className='h-8 w-8 rounded-md' />
                      <Skeleton className='h-8 w-8 rounded-md' />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              // Empty state: no patients registered at all
              <TableRow>
                <TableCell colSpan={8} className='h-72 text-center'>
                  <div className='mx-auto flex max-w-sm flex-col items-center justify-center space-y-3'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
                      <UserX className='h-6 w-6 text-muted-foreground' />
                    </div>
                    <p className='text-base font-medium text-foreground'>
                      No patients registered yet
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Register your first patient to begin managing electronic health records.
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setSheetOpen(true)}
                      className='mt-2 gap-1.5'
                    >
                      <Plus className='h-3.5 w-3.5' />
                      Add your first patient
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPatients.length === 0 ? (
              // Empty state: filters/search return no matches
              <TableRow>
                <TableCell colSpan={8} className='h-48 text-center'>
                  <div className='flex flex-col items-center justify-center space-y-2 text-muted-foreground'>
                    <Search className='h-6 w-6' />
                    <p className='text-sm font-medium'>No patients match your search</p>
                    <p className='text-xs'>Try adjusting your search query or status filter.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              filteredPatients.map((patient) => {
                const doctorName = patient.currentDoctorId
                  ? providerMap.get(patient.currentDoctorId) || '—'
                  : '—'
                const facilityName = patient.facilityId
                  ? facilityMap.get(patient.facilityId) || '—'
                  : '—'
                const age = calculateAge(patient.dob)

                return (
                  <TableRow key={patient.id} className='hover:bg-muted/40'>
                    {/* Patient Name (Clickable Link) */}
                    <TableCell>
                      <Link
                        href={'/patients/' + patient.id}
                        className='font-semibold text-foreground hover:text-primary no-underline transition-colors'
                      >
                        {patient.name}
                      </Link>
                    </TableCell>

                    {/* Gender */}
                    <TableCell className='capitalize'>
                      {patient.gender}
                    </TableCell>

                    {/* Age */}
                    <TableCell>
                      {age} yrs
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
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
                    </TableCell>

                    {/* Last Visit */}
                    <TableCell className='text-muted-foreground text-sm'>
                      {formatDate(patient.lastVisitDate)}
                    </TableCell>

                    {/* Current Doctor */}
                    <TableCell className='text-muted-foreground'>
                      {doctorName}
                    </TableCell>

                    {/* Facility */}
                    <TableCell className='text-muted-foreground'>
                      {facilityName}
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        {/* Status Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-muted-foreground hover:text-foreground'
                              title='Change Status'
                            >
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={patient.status === 'active'}
                              onClick={() => handleStatusChange(patient, 'active')}
                              className='cursor-pointer'
                            >
                              Set Active
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={patient.status === 'inactive'}
                              onClick={() => handleStatusChange(patient, 'inactive')}
                              className='cursor-pointer'
                            >
                              Set Inactive
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={patient.status === 'discharged'}
                              onClick={() => handleStatusChange(patient, 'discharged')}
                              className='cursor-pointer'
                            >
                              Set Discharged
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Delete Button */}
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleOpenDelete(patient)}
                          className='h-8 w-8 text-muted-foreground hover:text-destructive'
                          title='Delete Patient'
                        >
                          <UserX className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Patient Registration Sheet */}
      <NewPatientSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      {/* Typed Name Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className='sm:max-w-[440px]'>
          <DialogHeader>
            <div className='flex items-center gap-2 text-destructive mb-1'>
              <AlertTriangle className='h-5 w-5' />
              <DialogTitle>Confirm Patient Deletion</DialogTitle>
            </div>
            <DialogDescription className='space-y-3 pt-2 text-left'>
              <p>
                Deleting a patient removes all their clinical records and historical data permanently.
              </p>
              <p className='text-xs font-medium text-foreground bg-muted p-2 rounded-md'>
                Please type <span className='font-bold underline'>{patientToDelete?.name}</span> below to confirm:
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className='py-2'>
            <Input
              placeholder="Type patient's full name"
              value={confirmNameInput}
              onChange={(e) => setConfirmNameInput(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className='pt-2'>
            <Button
              variant='outline'
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDelete}
              disabled={!isDeleteNameMatched || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

