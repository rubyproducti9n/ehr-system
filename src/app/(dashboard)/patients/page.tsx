'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, MoreHorizontal, UserX, AlertTriangle, SearchX, Users } from 'lucide-react'
import { Patient } from '@/types'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { updatePatientStatus, deletePatient } from '@/lib/services/patientService'
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
import { EmptyState } from '@/components/shared/EmptyState'

export default function PatientsPage() {
  const { patients, loading: patientsLoading, error } = usePatients()
  const { providers, loading: providersLoading } = useProviders()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { toast } = useToast()

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
        description: `Status updated to ${newStatus}`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update patient status'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
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
        description: 'Patient deleted',
      })
      setDeleteConfirmOpen(false)
      setPatientToDelete(null)
      setConfirmNameInput('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete patient'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    } finally {
      setDeleting(false)
    }
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
          aria-label='Search patients'
        />
      </div>

      {error && (
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive'>
          {error}
        </div>
      )}

      {/* Patient Table with Horizontal Scroll */}
      <div className='overflow-x-auto rounded-md border bg-card'>
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
              // 6 rows x 7 data + 1 action column skeletons
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
              <TableRow>
                <TableCell colSpan={8} className='p-0 border-none'>
                  <EmptyState
                    icon={Users}
                    title='No patients registered'
                    description='Add your first patient to get started'
                    action={{
                      label: 'Register Patient',
                      onClick: () => setSheetOpen(true),
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='p-0 border-none'>
                  <EmptyState
                    icon={SearchX}
                    title='No patients found'
                    description='Try a different search term'
                  />
                </TableCell>
              </TableRow>
            ) : (
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
                        <Badge
                          className='bg-emerald-500 hover:bg-emerald-600 text-white border-none'
                          aria-label='Status: Active'
                        >
                          Active
                        </Badge>
                      )}
                      {patient.status === 'inactive' && (
                        <Badge
                          className='bg-amber-500 hover:bg-amber-600 text-white border-none'
                          aria-label='Status: Inactive'
                        >
                          Inactive
                        </Badge>
                      )}
                      {patient.status === 'discharged' && (
                        <Badge
                          className='bg-slate-500 hover:bg-slate-600 text-white border-none'
                          aria-label='Status: Discharged'
                        >
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
                              aria-label='Change status'
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
                          aria-label='Delete patient'
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
              <span>
                Deleting a patient removes all their clinical records and historical data permanently.
              </span>
              <span className='block text-xs font-medium text-foreground bg-muted p-2 rounded-md'>
                Please type <strong className='underline'>{patientToDelete?.name}</strong> below to confirm:
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className='py-2'>
            <Input
              placeholder="Type patient's full name"
              value={confirmNameInput}
              onChange={(e) => setConfirmNameInput(e.target.value)}
              autoFocus
              aria-label="Confirm patient name to delete"
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
