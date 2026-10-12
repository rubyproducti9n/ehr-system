'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Building2, Download, ShieldAlert } from 'lucide-react'
import { Facility } from '@/types'
import { useFacilities } from '@/hooks/useFacilities'
import { deleteFacility } from '@/lib/services/facilityService'
import { writeActivityLog, buildPerformedBy } from '@/lib/services/activityLogService'
import { useAppStore } from '@/store/useAppStore'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { FacilityDialog } from '@/components/facilities/FacilityDialog'
import { SortableHeader, SortDirection } from '@/components/shared/SortableHeader'
import { exportTableToPdf } from '@/lib/pdfExport'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useRouter } from 'next/navigation'

export default function FacilitiesPage() {
  const router = useRouter()
  const hospitalId = useAppStore((state) => state.hospitalId)
  const userRole = useAppStore((state) => state.userRole)
  const currentUser = useAppStore((state) => state.currentUser)
  const isSuperAdminOrDev = userRole === 'super_admin' || userRole === 'dev'
  const { facilities, loading, error } = useFacilities()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState<Facility | undefined>(
    undefined
  )

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(
    null
  )
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

  const sortedFacilities = useMemo(() => {
    if (!sortField || !sortDirection) return facilities
    return [...facilities].sort((a, b) => {
      let valA = ''
      let valB = ''
      if (sortField === 'name') {
        valA = (a.name || '').toLowerCase()
        valB = (b.name || '').toLowerCase()
      } else if (sortField === 'address') {
        valA = (a.address || '').toLowerCase()
        valB = (b.address || '').toLowerCase()
      } else if (sortField === 'phone') {
        valA = (a.phone || '').toLowerCase()
        valB = (b.phone || '').toLowerCase()
      } else if (sortField === 'createdAt') {
        valA = a.createdAt || ''
        valB = b.createdAt || ''
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [facilities, sortField, sortDirection])

  const handleExportPdf = () => {
    exportTableToPdf({
      title: 'Hospitals & Medical Facilities Directory',
      subtitle: 'Registered locations, hospitals, and medical clinics',
      filename: `hospitals-directory-${new Date().toISOString().split('T')[0]}.pdf`,
      columns: [
        { header: 'Hospital / Facility Name', dataKey: 'name' },
        { header: 'Address', dataKey: 'address' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'Created', dataKey: 'createdAt' },
      ],
      data: sortedFacilities.map((f) => ({
        name: f.name + (f.id.endsWith('_default') ? ' (Default)' : ''),
        address: f.address || '—',
        phone: f.phone || '—',
        createdAt: f.createdAt ? formatDate(f.createdAt) : '—',
      })),
    })
  }

  const handleOpenAdd = () => {
    setSelectedFacility(undefined)
    setDialogOpen(true)
  }

  const handleOpenEdit = (facility: Facility) => {
    setSelectedFacility(facility)
    setDialogOpen(true)
  }

  const handleOpenDelete = (facility: Facility) => {
    setFacilityToDelete(facility)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!facilityToDelete || !hospitalId) return
    setDeleting(true)
    try {
      await deleteFacility(hospitalId, facilityToDelete.id)

      if (currentUser && userRole) {
        await writeActivityLog({
          hospitalId,
          action: 'facility.delete',
          performedBy: buildPerformedBy(currentUser, userRole),
          entity: { type: 'facility', id: facilityToDelete.id, label: facilityToDelete.name },
          summary: `Deleted hospital ${facilityToDelete.name}`,
        })
      }

      toast({
        title: 'Hospital deleted',
        description: 'Hospital deleted',
      })
      setDeleteConfirmOpen(false)
      setFacilityToDelete(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error occurred while removing hospital'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    } finally {
      setDeleting(false)
    }
  }


  if (userRole && !isSuperAdminOrDev) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
        <div className="p-4 rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Access Restricted
          </h2>
          <p className="text-xs text-muted-foreground">
            Hospital management is only accessible to Super Administrators and Developers.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Top action header */}
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-muted-foreground'>
            Manage facilities, clinics, and hospital locations.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={handleExportPdf}
            disabled={loading || facilities.length === 0}
            className='gap-2'
            title='Download hospitals list as PDF'
          >
            <Download className='h-4 w-4' />
            Download PDF
          </Button>
          {isSuperAdminOrDev && (
            <Button onClick={handleOpenAdd} className='gap-2'>
              <Plus className='h-4 w-4' />
              + Add Hospital
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive'>
          {error}
        </div>
      )}

      {/* Facilities Table with horizontal scroll */}
      <div className='overflow-x-auto rounded-md border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  label="Hospital Name"
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Address"
                  field="address"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Phone"
                  field="phone"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Created"
                  field="createdAt"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              {isSuperAdminOrDev && (
                <TableHead className='text-right font-semibold'>Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // 5 rows x (4 + optional 1 action) column skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className='h-5 w-40' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-56' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-28' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-24' />
                  </TableCell>
                  {isSuperAdminOrDev && (
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Skeleton className='h-8 w-8 rounded-md' />
                        <Skeleton className='h-8 w-8 rounded-md' />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : sortedFacilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdminOrDev ? 5 : 4} className='p-0 border-none'>
                  <EmptyState
                    icon={Building2}
                    title='No hospitals added'
                    description={isSuperAdminOrDev ? 'Add your first hospital' : 'No hospitals found.'}
                    action={isSuperAdminOrDev ? {
                      label: 'Add Hospital',
                      onClick: handleOpenAdd,
                    } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedFacilities.map((facility) => {
                const isDefault = facility.id.endsWith('_default')
                return (
                  <TableRow key={facility.id}>
                    <TableCell className='font-semibold text-foreground'>
                      <div className='flex items-center gap-2'>
                        <span>{facility.name}</span>
                        {isDefault && (
                          <Badge
                            variant='secondary'
                            className='text-[10px] font-medium text-muted-foreground bg-muted'
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-muted-foreground max-w-xs truncate'>
                      {facility.address}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {facility.phone}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {formatDate(facility.createdAt)}
                    </TableCell>
                    {isSuperAdminOrDev && (
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleOpenEdit(facility)}
                            className='h-8 w-8 text-muted-foreground hover:text-foreground'
                            title='Edit hospital'
                            aria-label='Edit hospital'
                          >
                            <Edit2 className='h-4 w-4' />
                          </Button>
                          {isDefault ? (
                            <Tooltip content='Default hospital cannot be deleted' side='left'>
                              <Button
                                variant='ghost'
                                size='icon'
                                disabled
                                className='h-8 w-8 text-muted-foreground/40 cursor-not-allowed'
                                aria-label='Default hospital cannot be deleted'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => handleOpenDelete(facility)}
                              className='h-8 w-8 text-muted-foreground hover:text-destructive'
                              title='Delete hospital'
                              aria-label='Delete hospital'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <FacilityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        facility={selectedFacility}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className='pt-2'>
              Are you sure you want to remove{' '}
              <span className='font-semibold text-foreground'>
                {facilityToDelete?.name}
              </span>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='pt-4'>
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
              disabled={deleting}
              autoFocus
            >
              {deleting ? 'Removing...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
