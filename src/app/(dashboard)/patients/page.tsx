'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, MoreHorizontal, UserX, AlertTriangle, SearchX, Users, Download } from 'lucide-react'
import { Patient } from '@/types'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { updatePatientStatus, updatePatient, deletePatient } from '@/lib/services/patientService'
import { writeActivityLog, buildPerformedBy } from '@/lib/services/activityLogService'
import { useAppStore } from '@/store/useAppStore'
import { formatDate, calculateAge } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { NewPatientSheet } from '@/components/patients/NewPatientSheet'
import { SortableHeader, SortDirection } from '@/components/shared/SortableHeader'
import { exportTableToPdf } from '@/lib/pdfExport'
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

function PatientsContent() {
  const hospitalId = useAppStore((state) => state.hospitalId)
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const { patients, loading: patientsLoading, error } = usePatients()
  const { providers, loading: providersLoading } = useProviders()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { toast } = useToast()

  // Read status param on mount
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  // Use it to set initial tab value
  const validStatuses = ['active', 'inactive', 'discharged']
  const initialTab = validStatuses.includes(statusParam ?? '')
    ? statusParam!
    : 'all'

  // Filters & Search
  const [activeTab, setActiveTab] = useState(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Sheet & Dialog state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)
  const [confirmNameInput, setConfirmNameInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

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

    // 1. Status filter
    if (activeTab !== 'all') {
      result = result.filter((p) => p.status === activeTab)
    }

    // 2. Search query filter
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

    // 3. Sorting (explicit field or fallback to createdAt descending)
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let valA: any = ''
        let valB: any = ''
        if (sortField === 'name') {
          valA = (a.name || '').toLowerCase()
          valB = (b.name || '').toLowerCase()
        } else if (sortField === 'gender') {
          valA = (a.gender || '').toLowerCase()
          valB = (b.gender || '').toLowerCase()
        } else if (sortField === 'age') {
          valA = a.dob ? calculateAge(a.dob) : a.age ?? 0
          valB = b.dob ? calculateAge(b.dob) : b.age ?? 0
        } else if (sortField === 'status') {
          valA = (a.status || '').toLowerCase()
          valB = (b.status || '').toLowerCase()
        } else if (sortField === 'patientType') {
          valA = (a.patientType || '').toLowerCase()
          valB = (b.patientType || '').toLowerCase()
        } else if (sortField === 'lastVisitDate') {
          valA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0
          valB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0
        } else if (sortField === 'doctor') {
          valA = (a.currentDoctorId ? providerMap.get(a.currentDoctorId) || '' : '').toLowerCase()
          valB = (b.currentDoctorId ? providerMap.get(b.currentDoctorId) || '' : '').toLowerCase()
        } else if (sortField === 'facility') {
          valA = (a.facilityId ? facilityMap.get(a.facilityId) || '' : '').toLowerCase()
          valB = (b.facilityId ? facilityMap.get(b.facilityId) || '' : '').toLowerCase()
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    } else {
      result.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime()
        const timeB = new Date(b.createdAt || 0).getTime()
        return timeB - timeA
      })
    }

    return result
  }, [patients, activeTab, debouncedQuery, providerMap, facilityMap, sortField, sortDirection])

  const handleExportPdf = () => {
    exportTableToPdf({
      title: 'Patient Directory',
      subtitle: activeTab === 'all' ? 'All Registered Patients' : `Patients (${activeTab.toUpperCase()})`,
      filename: `patients-directory-${new Date().toISOString().split('T')[0]}.pdf`,
      columns: [
        { header: 'Patient Name', dataKey: 'name' },
        { header: 'Gender', dataKey: 'gender' },
        { header: 'Age', dataKey: 'age' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Type', dataKey: 'patientType' },
        { header: 'Last Visit', dataKey: 'lastVisit' },
        { header: 'Attending Doctor', dataKey: 'doctor' },
        { header: 'Hospital / Facility', dataKey: 'facility' },
      ],
      data: filteredPatients.map((p) => ({
        name: p.name,
        gender: p.gender || '—',
        age: p.dob ? `${calculateAge(p.dob)} yrs` : (p.age ? `${p.age} yrs` : '—'),
        status: p.status.toUpperCase(),
        patientType: p.patientType === 'in-patient' ? 'In-Patient' : (p.patientType === 'out-patient' ? 'Out-Patient' : '—'),
        lastVisit: p.lastVisitDate ? formatDate(p.lastVisitDate) : '—',
        doctor: p.currentDoctorId ? providerMap.get(p.currentDoctorId) || 'Unassigned' : 'Unassigned',
        facility: p.facilityId ? facilityMap.get(p.facilityId) || '—' : '—',
      })),
    })
  }

  // Status update handler
  const handleStatusChange = async (patient: Patient, newStatus: Patient['status']) => {
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

      if (currentUser && userRole) {
        await writeActivityLog({
          hospitalId,
          action: 'patient.status_change',
          performedBy: buildPerformedBy(currentUser, userRole),
          entity: { type: 'patient', id: patient.id, label: patient.name },
          summary: `Changed ${patient.name} status to ${newStatus}`,
        })
      }
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
    if (!patientToDelete || !hospitalId) return
    setDeleting(true)
    try {
      await deletePatient(hospitalId, patientToDelete.id)

      if (currentUser && userRole) {
        await writeActivityLog({
          hospitalId,
          action: 'patient.delete',
          performedBy: buildPerformedBy(currentUser, userRole),
          entity: { type: 'patient', id: patientToDelete.id, label: patientToDelete.name },
          summary: `Deleted patient ${patientToDelete.name}`,
        })
      }

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
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full sm:w-auto'
        >
          <TabsList className='grid grid-cols-4 w-full sm:w-auto'>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='active'>Active</TabsTrigger>
            <TabsTrigger value='inactive'>Inactive</TabsTrigger>
            <TabsTrigger value='discharged'>Discharged</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button
            variant='outline'
            onClick={handleExportPdf}
            disabled={isLoading || filteredPatients.length === 0}
            className='gap-2 flex-1 sm:flex-initial'
            title='Download patients list as PDF'
          >
            <Download className='h-4 w-4' />
            Download PDF
          </Button>
          <Button onClick={() => setSheetOpen(true)} className='gap-2 flex-1 sm:flex-initial'>
            <Plus className='h-4 w-4' />
            New Patient
          </Button>
        </div>
      </div>

      {/* Search Bar Row */}
      <div className='relative w-full'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='text'
          placeholder='Search by name, doctor, or hospital...'
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
              <TableHead>
                <SortableHeader
                  label="Patient Name"
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Gender"
                  field="gender"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Age"
                  field="age"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Status"
                  field="status"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Type"
                  field="patientType"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Last Visit"
                  field="lastVisitDate"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Current Doctor"
                  field="doctor"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Hospital"
                  field="facility"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className='text-right font-semibold'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // 6 rows x 8 data + 1 action column skeletons
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
                <TableCell colSpan={9} className='p-0 border-none'>
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
                <TableCell colSpan={9} className='p-0 border-none'>
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

                    {/* Patient Type */}
                    <TableCell>
                      {patient.patientType === 'in-patient' && (
                        <Badge
                          className='bg-blue-500 hover:bg-blue-600 text-white border-none'
                          aria-label='Patient Type: In-Patient'
                        >
                          In-Patient
                        </Badge>
                      )}
                      {patient.patientType === 'out-patient' && (
                        <Badge
                          className='bg-emerald-600 hover:bg-emerald-700 text-white border-none'
                          aria-label='Patient Type: Out-Patient'
                        >
                          Out-Patient
                        </Badge>
                      )}
                      {!patient.patientType && (
                        <span className='text-muted-foreground'>—</span>
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

                    {/* Hospital */}
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
                Deleting a patient removes all their medical records and historical data permanently.
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

export default function PatientsPage() {
  return (
    <Suspense fallback={null}>
      <PatientsContent />
    </Suspense>
  )
}
