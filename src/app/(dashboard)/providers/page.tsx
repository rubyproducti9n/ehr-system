'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Stethoscope } from 'lucide-react'
import { Provider } from '@/types'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { deleteProvider } from '@/lib/services/providerService'
import { useToast } from '@/hooks/use-toast'
import { ProviderDialog } from '@/components/providers/ProviderDialog'
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

export default function ProvidersPage() {
  const { providers, loading: providersLoading, error } = useProviders()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | undefined>(
    undefined
  )

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)

  // Facility lookup map
  const facilityMap = new Map<string, string>()
  facilities.forEach((fac) => {
    facilityMap.set(fac.id, fac.name)
  })

  const handleOpenAdd = () => {
    setSelectedProvider(undefined)
    setDialogOpen(true)
  }

  const handleOpenEdit = (provider: Provider) => {
    setSelectedProvider(provider)
    setDialogOpen(true)
  }

  const handleOpenDelete = (provider: Provider) => {
    setProviderToDelete(provider)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!providerToDelete) return
    setDeleting(true)
    try {
      await deleteProvider(providerToDelete.id)
      toast({
        title: 'Provider deleted',
        description: 'Provider deleted',
      })
      setDeleteConfirmOpen(false)
      setProviderToDelete(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error occurred while removing provider'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    } finally {
      setDeleting(false)
    }
  }

  const isLoading = providersLoading || facilitiesLoading

  return (
    <div className='space-y-6'>
      {/* Top action header */}
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-muted-foreground'>
            Manage clinical providers, attending physicians, and specialists.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className='gap-2'>
          <Plus className='h-4 w-4' />
          Add Provider
        </Button>
      </div>

      {error && (
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive'>
          {error}
        </div>
      )}

      {/* Providers Table with horizontal scroll */}
      <div className='overflow-x-auto rounded-md border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold'>Name</TableHead>
              <TableHead className='font-semibold'>Specialty</TableHead>
              <TableHead className='font-semibold'>Phone</TableHead>
              <TableHead className='font-semibold'>Email</TableHead>
              <TableHead className='font-semibold'>Facility</TableHead>
              <TableHead className='text-right font-semibold'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // 5 rows x 5 data + 1 action column skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className='h-5 w-36' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-28' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-28' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-40' />
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
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='p-0 border-none'>
                  <EmptyState
                    icon={Stethoscope}
                    title='No providers added'
                    description='Add your first provider'
                    action={{
                      label: 'Add Provider',
                      onClick: handleOpenAdd,
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => {
                const facilityName =
                  facilityMap.get(provider.facilityId) || 'Unassigned / Unknown'
                return (
                  <TableRow key={provider.id}>
                    <TableCell className='font-semibold text-foreground'>
                      {provider.name}
                    </TableCell>
                    <TableCell>{provider.specialty}</TableCell>
                    <TableCell className='font-mono text-xs'>
                      {provider.phone}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {provider.email}
                    </TableCell>
                    <TableCell>
                      <span className='inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground'>
                        {facilityName}
                      </span>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleOpenEdit(provider)}
                          className='h-8 w-8 text-muted-foreground hover:text-foreground'
                          title='Edit provider'
                          aria-label='Edit provider'
                        >
                          <Edit2 className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleOpenDelete(provider)}
                          className='h-8 w-8 text-muted-foreground hover:text-destructive'
                          title='Delete provider'
                          aria-label='Delete provider'
                        >
                          <Trash2 className='h-4 w-4' />
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

      {/* Add / Edit Dialog */}
      <ProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        provider={selectedProvider}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className='pt-2'>
              Are you sure you want to remove{' '}
              <span className='font-semibold text-foreground'>
                {providerToDelete?.name}
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
