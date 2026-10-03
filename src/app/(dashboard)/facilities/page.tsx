'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'
import { Facility } from '@/types'
import { useFacilities } from '@/hooks/useFacilities'
import { deleteFacility } from '@/lib/services/facilityService'
import { useAppStore } from '@/store/useAppStore'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { FacilityDialog } from '@/components/facilities/FacilityDialog'
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
import { ShieldAlert } from 'lucide-react'

export default function FacilitiesPage() {
  const router = useRouter()
  const hospitalId = useAppStore((state) => state.hospitalId)
  const userRole = useAppStore((state) => state.userRole)
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
            Manage clinical facilities, clinics, and hospital locations.
          </p>
        </div>
        {isSuperAdminOrDev && (
          <Button onClick={handleOpenAdd} className='gap-2'>
            <Plus className='h-4 w-4' />
            + Add Hospital
          </Button>
        )}
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
              <TableHead className='font-semibold'>Hospital Name</TableHead>
              <TableHead className='font-semibold'>Address</TableHead>
              <TableHead className='font-semibold'>Phone</TableHead>
              <TableHead className='font-semibold'>Created</TableHead>
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
            ) : facilities.length === 0 ? (
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
              facilities.map((facility) => {
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
