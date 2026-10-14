'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Stethoscope, Upload, ShieldAlert, Download } from 'lucide-react'
import { Provider } from '@/types'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { deleteProvider, unregisterProviderEmail } from '@/lib/services/providerService'
import { writeActivityLog, buildPerformedBy } from '@/lib/services/activityLogService'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { ProviderDialog } from '@/components/providers/ProviderDialog'
import { ImportProvidersSheet } from '@/components/providers/ImportProvidersSheet'
import { ImportCompletionFlow } from '@/components/providers/ImportCompletionFlow'
import { ParsedProvider } from '@/lib/importColumnMapper'
import { SortableHeader, SortDirection } from '@/components/shared/SortableHeader'
import { exportTableToPdf } from '@/lib/pdfExport'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export default function ProvidersPage() {
  const router = useRouter()
  const hospitalId = useAppStore((state) => state.hospitalId)
  const userRole = useAppStore((state) => state.userRole)
  const currentUser = useAppStore((state) => state.currentUser)
  const isSuperAdminOrDev = userRole === 'super_admin' || userRole === 'dev'
  const { providers, loading: providersLoading, error } = useProviders()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | undefined>(
    undefined
  )

  const [importSheetOpen, setImportSheetOpen] = useState(false)
  const [importData, setImportData] = useState<{
    providers: ParsedProvider[]
    facilityId: string
  } | null>(null)
  const [completionFlowOpen, setCompletionFlowOpen] = useState(false)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(
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

  // Facility lookup map
  const facilityMap = useMemo(() => {
    const map = new Map<string, string>()
    facilities.forEach((fac) => {
      map.set(fac.id, fac.name)
    })
    return map
  }, [facilities])

  const sortedProviders = useMemo(() => {
    if (!sortField || !sortDirection) return providers
    return [...providers].sort((a, b) => {
      let valA = ''
      let valB = ''
      if (sortField === 'name') {
        valA = (a.name || '').toLowerCase()
        valB = (b.name || '').toLowerCase()
      } else if (sortField === 'specialty') {
        valA = (a.specialty || '').toLowerCase()
        valB = (b.specialty || '').toLowerCase()
      } else if (sortField === 'phone') {
        valA = (a.phone || '').toLowerCase()
        valB = (b.phone || '').toLowerCase()
      } else if (sortField === 'email') {
        valA = (a.email || '').toLowerCase()
        valB = (b.email || '').toLowerCase()
      } else if (sortField === 'facility') {
        valA = (facilityMap.get(a.facilityId) || '').toLowerCase()
        valB = (facilityMap.get(b.facilityId) || '').toLowerCase()
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [providers, sortField, sortDirection, facilityMap])

  const handleExportPdf = () => {
    exportTableToPdf({
      title: 'Medical Providers Directory',
      subtitle: 'Complete list of active attending physicians and specialists',
      filename: `providers-directory-${new Date().toISOString().split('T')[0]}.pdf`,
      columns: [
        { header: 'Provider Name', dataKey: 'name' },
        { header: 'Specialty', dataKey: 'specialty' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Hospital / Facility', dataKey: 'facility' },
      ],
      data: sortedProviders.map((p) => ({
        name: p.name,
        specialty: p.specialty,
        phone: p.phone,
        email: p.email,
        facility: facilityMap.get(p.facilityId) || 'Unassigned',
      })),
    })
  }

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
    if (!providerToDelete || !hospitalId) return
    setDeleting(true)
    try {
      await deleteProvider(hospitalId, providerToDelete.id)

      if (providerToDelete.email) {
        try {
          await unregisterProviderEmail(providerToDelete.email)
        } catch (unregErr) {
          console.error('Failed to unregister provider email:', unregErr)
        }
      }

      if (currentUser && userRole) {
        await writeActivityLog({
          hospitalId,
          action: 'provider.delete',
          performedBy: buildPerformedBy(currentUser, userRole),
          entity: { type: 'provider', id: providerToDelete.id, label: providerToDelete.name },
          summary: `Deleted provider ${providerToDelete.name}`,
        })
      }

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
            Provider management is only accessible to Super Administrators and Developers.
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
            Manage doctors, attending physicians, and specialists.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={handleExportPdf}
            disabled={providersLoading || providers.length === 0}
            className='gap-2'
            title='Download providers list as PDF'
          >
            <Download className='h-4 w-4' />
            Download PDF
          </Button>
          {isSuperAdminOrDev && (
            <>
              <Button
                variant='outline'
                onClick={() => setImportSheetOpen(true)}
                className='gap-2'
              >
                <Upload className='h-4 w-4' />
                Import
              </Button>
              <Button onClick={handleOpenAdd} className='gap-2'>
                <Plus className='h-4 w-4' />
                Add Provider
              </Button>
            </>
          )}
        </div>
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
              <TableHead>
                <SortableHeader
                  label="Name"
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Specialty"
                  field="specialty"
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
                  label="Email"
                  field="email"
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
              {isSuperAdminOrDev && (
                <TableHead className='text-right font-semibold'>Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // 5 rows x (5 + optional 1 action) skeletons
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
            ) : sortedProviders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdminOrDev ? 6 : 5} className='p-0 border-none'>
                  <EmptyState
                    icon={Stethoscope}
                    title='No providers added'
                    description={isSuperAdminOrDev ? 'Add your first provider' : 'No providers registered yet.'}
                    action={isSuperAdminOrDev ? {
                      label: 'Add Provider',
                      onClick: handleOpenAdd,
                    } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedProviders.map((provider) => {
                const facilityName =
                  facilityMap.get(provider.facilityId) || 'Unassigned / Unknown'
                return (
                  <TableRow key={provider.id}>
                    <TableCell className='font-semibold text-foreground'>
                      <div className='flex items-center gap-2'>
                        <span>{provider.name}</span>
                        {!provider.name?.startsWith('Dr.') && (
                          <Badge
                            variant='outline'
                            className='border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] px-1.5 py-0 font-medium'
                          >
                            No prefix
                          </Badge>
                        )}
                      </div>
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
                    {isSuperAdminOrDev && (
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
                    )}
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

      {/* Import Sheet */}
      <ImportProvidersSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
        onImportReady={(providers, facilityId) => {
          setImportSheetOpen(false)
          setImportData({ providers, facilityId })
          setCompletionFlowOpen(true) // Chunk 54 component
        }}
      />

      {/* Import Completion Flow */}
      {importData && completionFlowOpen && (
        <ImportCompletionFlow
          open={completionFlowOpen}
          onOpenChange={(open) => {
            setCompletionFlowOpen(open)
            if (!open) setImportData(null)
          }}
          providers={importData.providers}
          facilityId={importData.facilityId}
          onComplete={(imported, skipped) => {
            setCompletionFlowOpen(false)
            setImportData(null)
            toast({
              title: `Import complete`,
              description: `${imported} provider${imported !== 1 ? 's' : ''} imported${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
            })
            // Providers list updates automatically via realtime subscription
          }}
        />
      )}
    </div>
  )
}
