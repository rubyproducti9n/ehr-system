'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'
import { Facility } from '@/types'
import { useFacilities } from '@/hooks/useFacilities'
import { deleteFacility } from '@/lib/services/facilityService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { FacilityDialog } from '@/components/facilities/FacilityDialog'
import { Button } from '@/components/ui/button'
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

export default function FacilitiesPage() {
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
    if (!facilityToDelete) return
    setDeleting(true)
    try {
      await deleteFacility(facilityToDelete.id)
      toast({
        title: 'Facility deleted',
        description: 'Facility deleted',
      })
      setDeleteConfirmOpen(false)
      setFacilityToDelete(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error occurred while removing facility'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    } finally {
      setDeleting(false)
    }
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
        <Button onClick={handleOpenAdd} className='gap-2'>
          <Plus className='h-4 w-4' />
          Add Facility
        </Button>
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
              <TableHead className='font-semibold'>Facility Name</TableHead>
              <TableHead className='font-semibold'>Address</TableHead>
              <TableHead className='font-semibold'>Phone</TableHead>
              <TableHead className='font-semibold'>Created</TableHead>
              <TableHead className='text-right font-semibold'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // 5 rows x 4 data + 1 action column skeletons
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
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-2'>
                      <Skeleton className='h-8 w-8 rounded-md' />
                      <Skeleton className='h-8 w-8 rounded-md' />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : facilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='p-0 border-none'>
                  <EmptyState
                    icon={Building2}
                    title='No facilities added'
                    description='Add your first facility'
                    action={{
                      label: 'Add Facility',
                      onClick: handleOpenAdd,
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              facilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell className='font-semibold text-foreground'>
                    {facility.name}
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
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenEdit(facility)}
                        className='h-8 w-8 text-muted-foreground hover:text-foreground'
                        title='Edit facility'
                        aria-label='Edit facility'
                      >
                        <Edit2 className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenDelete(facility)}
                        className='h-8 w-8 text-muted-foreground hover:text-destructive'
                        title='Delete facility'
                        aria-label='Delete facility'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
