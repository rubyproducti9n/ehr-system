'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react'
import { LabResult } from '@/types'
import { useLabResults } from '@/hooks/useLabResults'
import { useProviders } from '@/hooks/useProviders'
import { deleteLabResult } from '@/lib/services/labResultService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { LabResultDialog } from './LabResultDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface LabResultsTabProps {
  patientId: string
}

function LabResultCard({
  result,
  onEdit,
  onDelete,
  providerName,
}: {
  result: LabResult
  onEdit: () => void
  onDelete: (id: string) => Promise<void>
  providerName: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isLongContent = (result.content || '').length > 300
  const displayedContent =
    isLongContent && !expanded
      ? result.content.slice(0, 300) + '...'
      : result.content

  const handleConfirm = async () => {
    setDeleting(true)
    await onDelete(result.id)
    setDeleting(false)
  }

  return (
    <div className='rounded-lg border bg-card p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors'>
      {/* Header: Title + Provider/Date + Actions */}
      <div className='flex items-start justify-between gap-2'>
        <div className='space-y-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <FlaskConical className='h-4 w-4 text-primary shrink-0' />
            <h4 className='text-sm font-semibold text-foreground truncate'>
              {result.title}
            </h4>
          </div>
          <p className='text-xs text-muted-foreground'>
            Result Date: {formatDate(result.resultDate)} · Provider:{' '}
            <span className='font-medium text-foreground'>{providerName}</span>
          </p>
        </div>

        {/* Action buttons or inline delete confirm */}
        <div>
          {confirmingDelete ? (
            <div className='flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-md'>
              <span className='text-xs font-medium text-destructive'>
                Confirm delete?
              </span>
              <Button
                size='sm'
                variant='destructive'
                onClick={handleConfirm}
                disabled={deleting}
                className='h-6 px-2 text-xs'
              >
                Yes
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
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
                onClick={onEdit}
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                title='Edit Lab Result'
              >
                <Edit className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setConfirmingDelete(true)}
                className='h-8 w-8 text-muted-foreground hover:text-destructive'
                title='Delete Lab Result'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className='pt-2 border-t text-sm font-sans text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-md'>
        {displayedContent}
        {isLongContent && (
          <button
            onClick={() => setExpanded(!expanded)}
            className='mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline block'
          >
            {expanded ? (
              <>
                Show less <ChevronUp className='h-3.5 w-3.5' />
              </>
            ) : (
              <>
                Show more <ChevronDown className='h-3.5 w-3.5' />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export function LabResultsTab({ patientId }: LabResultsTabProps) {
  const { results, loading: labLoading, error } = useLabResults(patientId)
  const { providers, loading: providersLoading } = useProviders()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState<LabResult | undefined>(
    undefined
  )

  const providerMap = new Map<string, string>()
  providers.forEach((p) => providerMap.set(p.id, p.name))

  const handleOpenAdd = () => {
    setSelectedResult(undefined)
    setDialogOpen(true)
  }

  const handleOpenEdit = (res: LabResult) => {
    setSelectedResult(res)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteLabResult(patientId, id)
      toast({
        title: 'Lab result removed',
        description: 'The lab result record has been deleted.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete result',
        description: err?.message || 'Error occurred while deleting record.',
      })
    }
  }

  const isLoading = labLoading || providersLoading

  return (
    <div className='space-y-6'>
      {/* Top Bar Row */}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          Lab Results
        </span>
        <Button onClick={handleOpenAdd} size='sm' className='gap-1.5'>
          <Plus className='h-4 w-4' />
          Add Result
        </Button>
      </div>

      {error && (
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'>
          {error}
        </div>
      )}

      {/* Cards List */}
      <div className='space-y-4'>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='rounded-lg border bg-card p-5 space-y-4 shadow-sm'
            >
              <div className='flex justify-between items-center'>
                <Skeleton className='h-5 w-48' />
                <div className='flex gap-1'>
                  <Skeleton className='h-8 w-8 rounded-md' />
                  <Skeleton className='h-8 w-8 rounded-md' />
                </div>
              </div>
              <Skeleton className='h-4 w-60' />
              <Skeleton className='h-20 w-full rounded-md' />
            </div>
          ))
        ) : results.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-10 text-center'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground'>
              <FlaskConical className='h-6 w-6' />
            </div>
            <p className='text-sm font-medium text-foreground'>
              No lab results recorded
            </p>
            <p className='text-xs text-muted-foreground mt-1'>
              Log blood panels, imaging findings, or specialized pathology results.
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={handleOpenAdd}
              className='mt-4 gap-1.5'
            >
              <Plus className='h-3.5 w-3.5' />
              Add Result
            </Button>
          </div>
        ) : (
          results.map((item) => (
            <LabResultCard
              key={item.id}
              result={item}
              onEdit={() => handleOpenEdit(item)}
              onDelete={handleDelete}
              providerName={
                item.providerId
                  ? providerMap.get(item.providerId) || '—'
                  : '—'
              }
            />
          ))
        )}
      </div>

      {/* Add / Edit Dialog */}
      <LabResultDialog
        patientId={patientId}
        result={selectedResult}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
