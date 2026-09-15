'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Calendar, FileText } from 'lucide-react'
import { AdtEvent } from '@/types'
import { useAdtEvents } from '@/hooks/useAdtEvents'
import { deleteAdtEvent } from '@/lib/services/adtService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { AdtEventDialog } from './AdtEventDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface AdtEventsTabProps {
  patientId: string
}

export function AdtEventsTab({ patientId }: AdtEventsTabProps) {
  const { events, loading, error } = useAdtEvents(patientId)
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AdtEvent | undefined>(undefined)

  // In-card inline deletion state: stores eventId currently confirming deletion
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submittingDelete, setSubmittingDelete] = useState(false)

  const handleOpenAdd = () => {
    setSelectedEvent(undefined)
    setDialogOpen(true)
  }

  const handleOpenEdit = (event: AdtEvent) => {
    setSelectedEvent(event)
    setDialogOpen(true)
  }

  const handleConfirmDelete = async (eventId: string) => {
    setSubmittingDelete(true)
    try {
      await deleteAdtEvent(patientId, eventId)
      toast({
        title: 'ADT event removed',
        description: 'The event record has been removed.',
      })
      setDeletingId(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete event',
        description: err?.message || 'Error occurred while deleting ADT event.',
      })
    } finally {
      setSubmittingDelete(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Top Bar Row */}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          ADT Events
        </span>
        <Button onClick={handleOpenAdd} size='sm' className='gap-1.5'>
          <Plus className='h-4 w-4' />
          Add Event
        </Button>
      </div>

      {error && (
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'>
          {error}
        </div>
      )}

      {/* Events List */}
      <div className='space-y-4'>
        {loading ? (
          // 3 card-shaped skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-muted'
            >
              <div className='rounded-lg border bg-card p-5 space-y-4 shadow-sm'>
                <div className='flex justify-between items-center'>
                  <Skeleton className='h-5 w-44' />
                  <div className='flex gap-1'>
                    <Skeleton className='h-8 w-8 rounded-md' />
                    <Skeleton className='h-8 w-8 rounded-md' />
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                </div>
                <Skeleton className='h-4 w-3/4' />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          // Empty state
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-10 text-center'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground'>
              <Calendar className='h-6 w-6' />
            </div>
            <p className='text-sm font-medium text-foreground'>
              No ADT events recorded
            </p>
            <p className='text-xs text-muted-foreground mt-1'>
              Log admissions, discharges, and transfers for this patient timeline.
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={handleOpenAdd}
              className='mt-4 gap-1.5'
            >
              <Plus className='h-3.5 w-3.5' />
              Add Event
            </Button>
          </div>
        ) : (
          // Stacked Timeline Cards
          events.map((event) => {
            const isConfirmingDelete = deletingId === event.id

            return (
              <div
                key={event.id}
                className='relative pl-5 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-primary before:rounded-full'
              >
                {/* Timeline dot */}
                <div className='absolute -left-[3.5px] top-4 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background' />

                {/* Card Container */}
                <div className='rounded-lg border bg-card p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors'>
                  {/* Card Header: Effective Date & Actions */}
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <span className='text-xs text-muted-foreground font-normal'>
                        Effective Date:{' '}
                      </span>
                      <span className='text-sm font-semibold text-foreground'>
                        {formatDate(event.effectiveDate)}
                      </span>
                    </div>

                    {/* Actions: Normal vs Inline Delete Confirmation */}
                    <div>
                      {isConfirmingDelete ? (
                        <div className='flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-md'>
                          <span className='text-xs font-medium text-destructive'>
                            Confirm delete?
                          </span>
                          <Button
                            size='sm'
                            variant='destructive'
                            onClick={() => handleConfirmDelete(event.id)}
                            disabled={submittingDelete}
                            className='h-6 px-2 text-xs'
                          >
                            Yes
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setDeletingId(null)}
                            disabled={submittingDelete}
                            className='h-6 px-2 text-xs'
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <div className='flex items-center gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleOpenEdit(event)}
                            className='h-8 w-8 text-muted-foreground hover:text-foreground'
                            title='Edit ADT Event'
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setDeletingId(event.id)}
                            className='h-8 w-8 text-muted-foreground hover:text-destructive'
                            title='Delete ADT Event'
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3-Column Dates Grid */}
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t'>
                    <div className='space-y-0.5'>
                      <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                        Admit Date
                      </p>
                      <p className='text-xs font-medium text-foreground'>
                        {formatDate(event.admitDate)}
                      </p>
                    </div>

                    <div className='space-y-0.5'>
                      <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                        Discharged Date
                      </p>
                      <p className='text-xs font-medium text-foreground'>
                        {formatDate(event.dischargedDate)}
                      </p>
                    </div>

                    <div className='space-y-0.5'>
                      <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                        Re-admit Date
                      </p>
                      <p className='text-xs font-medium text-foreground'>
                        {formatDate(event.reAdmitDate)}
                      </p>
                    </div>
                  </div>

                  {/* Notes Row (rendered only if notes is present) */}
                  {event.notes && event.notes.trim().length > 0 && (
                    <div className='pt-2 border-t flex items-start gap-2 text-xs'>
                      <FileText className='h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5' />
                      <div className='flex-1'>
                        <span className='font-medium text-foreground'>Notes: </span>
                        <span className='text-muted-foreground whitespace-pre-wrap'>
                          {event.notes}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit Dialog */}
      <AdtEventDialog
        patientId={patientId}
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
