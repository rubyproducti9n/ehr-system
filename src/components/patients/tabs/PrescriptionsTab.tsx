'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Pill, MoreHorizontal } from 'lucide-react'
import { Prescription } from '@/types'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { useProviders } from '@/hooks/useProviders'
import {
  deletePrescription,
  updatePrescriptionStatus,
} from '@/lib/services/prescriptionService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { PrescriptionDialog } from './PrescriptionDialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

interface PrescriptionsTabProps {
  patientId: string
}

type FilterStatus = 'all' | 'active' | 'completed' | 'discontinued'

export function PrescriptionsTab({ patientId }: PrescriptionsTabProps) {
  const {
    prescriptions,
    loading: rxLoading,
    error,
  } = usePrescriptions(patientId)
  const { providers, loading: providersLoading } = useProviders()
  const { toast } = useToast()

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRx, setSelectedRx] = useState<Prescription | undefined>(
    undefined
  )

  // In-row inline deletion confirmation: stores prescriptionId
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submittingDelete, setSubmittingDelete] = useState(false)

  // Map provider IDs to names
  const providerMap = useMemo(() => {
    const map = new Map<string, string>()
    providers.forEach((p) => map.set(p.id, p.name))
    return map
  }, [providers])

  // Compute counts for filter pills
  const counts = useMemo(() => {
    const res = { all: 0, active: 0, completed: 0, discontinued: 0 }
    prescriptions.forEach((p) => {
      res.all++
      if (p.status in res) {
        res[p.status as keyof typeof res]++
      }
    })
    return res
  }, [prescriptions])

  // Filtered list
  const filteredList = useMemo(() => {
    if (filterStatus === 'all') return prescriptions
    return prescriptions.filter((p) => p.status === filterStatus)
  }, [prescriptions, filterStatus])

  const handleOpenAdd = () => {
    setSelectedRx(undefined)
    setDialogOpen(true)
  }

  const handleOpenEdit = (rx: Prescription) => {
    setSelectedRx(rx)
    setDialogOpen(true)
  }

  const handleStatusChange = async (
    rx: Prescription,
    status: Prescription['status']
  ) => {
    if (rx.status === status) return
    try {
      await updatePrescriptionStatus(patientId, rx.id, status)
      toast({
        title: 'Prescription status updated',
        description: rx.medicationName + ' is now marked as ' + status + '.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Status update failed',
        description: err?.message || 'Failed to update prescription status.',
      })
    }
  }

  const handleConfirmDelete = async (id: string) => {
    setSubmittingDelete(true)
    try {
      await deletePrescription(patientId, id)
      toast({
        title: 'Prescription removed',
        description: 'The medication entry has been removed.',
      })
      setDeletingId(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err?.message || 'Error occurred while removing prescription.',
      })
    } finally {
      setSubmittingDelete(false)
    }
  }

  const isLoading = rxLoading || providersLoading

  return (
    <div className='space-y-6'>
      {/* Top Bar Row */}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          Prescriptions
        </span>
        <Button onClick={handleOpenAdd} size='sm' className='gap-1.5'>
          <Plus className='h-4 w-4' />
          Add Prescription
        </Button>
      </div>

      {/* Status Filter Pills */}
      <div className='flex items-center gap-2 overflow-x-auto pb-1'>
        {(['all', 'active', 'completed', 'discontinued'] as const).map((st) => {
          const isActive = filterStatus === st
          const label =
            st === 'all'
              ? 'All'
              : st.charAt(0).toUpperCase() + st.slice(1)
          const count = counts[st]

          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
                (isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80')
              }
            >
              <span>{label}</span>
              <span
                className={
                  'rounded-full px-1.5 py-0.2 text-[10px] ' +
                  (isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-background text-foreground')
                }
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'>
          {error}
        </div>
      )}

      {/* Table */}
      <div className='rounded-md border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold'>Medication</TableHead>
              <TableHead className='font-semibold'>Dosage</TableHead>
              <TableHead className='font-semibold'>Frequency</TableHead>
              <TableHead className='font-semibold'>Route</TableHead>
              <TableHead className='font-semibold'>Prescribed</TableHead>
              <TableHead className='font-semibold'>Doctor</TableHead>
              <TableHead className='font-semibold'>Status</TableHead>
              <TableHead className='text-right font-semibold'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className='h-5 w-32' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-16' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-20' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-14' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-24' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-28' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-16' />
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Skeleton className='h-8 w-8 rounded-md' />
                      <Skeleton className='h-8 w-8 rounded-md' />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : prescriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-64 text-center'>
                  <div className='flex flex-col items-center justify-center space-y-3 py-6'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground'>
                      <Pill className='h-6 w-6' />
                    </div>
                    <p className='text-sm font-medium text-foreground'>
                      No prescriptions recorded
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Add patient medication regimens, dosages, and administration schedules.
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleOpenAdd}
                      className='mt-2 gap-1.5'
                    >
                      <Plus className='h-3.5 w-3.5' />
                      Add Prescription
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-40 text-center'>
                  <p className='text-sm text-muted-foreground'>
                    No {filterStatus} prescriptions
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((rx) => {
                const doctorName = rx.prescribingDoctorId
                  ? providerMap.get(rx.prescribingDoctorId) || '—'
                  : '—'
                const isConfirming = deletingId === rx.id

                return (
                  <TableRow key={rx.id}>
                    <TableCell className='font-semibold text-foreground'>
                      {rx.medicationName}
                    </TableCell>
                    <TableCell>{rx.dosage}</TableCell>
                    <TableCell>{rx.frequency}</TableCell>
                    <TableCell>{rx.route}</TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {formatDate(rx.prescribedDate)}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {doctorName}
                    </TableCell>
                    <TableCell>
                      {rx.status === 'active' && (
                        <Badge className='bg-emerald-500 hover:bg-emerald-600 text-white border-none'>
                          Active
                        </Badge>
                      )}
                      {rx.status === 'completed' && (
                        <Badge className='bg-slate-500 hover:bg-slate-600 text-white border-none'>
                          Completed
                        </Badge>
                      )}
                      {rx.status === 'discontinued' && (
                        <Badge className='bg-rose-500 hover:bg-rose-600 text-white border-none'>
                          Discontinued
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      {isConfirming ? (
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            size='sm'
                            variant='destructive'
                            onClick={() => handleConfirmDelete(rx.id)}
                            disabled={submittingDelete}
                            className='h-7 px-2 text-xs'
                          >
                            Confirm
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setDeletingId(null)}
                            disabled={submittingDelete}
                            className='h-7 px-2 text-xs'
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className='flex items-center justify-end gap-1'>
                          {/* Status Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                                title='Update status'
                              >
                                <MoreHorizontal className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={rx.status === 'active'}
                                onClick={() =>
                                  handleStatusChange(rx, 'active')
                                }
                                className='cursor-pointer'
                              >
                                Set Active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={rx.status === 'completed'}
                                onClick={() =>
                                  handleStatusChange(rx, 'completed')
                                }
                                className='cursor-pointer'
                              >
                                Set Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={rx.status === 'discontinued'}
                                onClick={() =>
                                  handleStatusChange(rx, 'discontinued')
                                }
                                className='cursor-pointer'
                              >
                                Set Discontinued
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleOpenEdit(rx)}
                            className='h-8 w-8 text-muted-foreground hover:text-foreground'
                            title='Edit Prescription'
                          >
                            <Edit className='h-4 w-4' />
                          </Button>

                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setDeletingId(rx.id)}
                            className='h-8 w-8 text-muted-foreground hover:text-destructive'
                            title='Delete Prescription'
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <PrescriptionDialog
        patientId={patientId}
        prescription={selectedRx}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
