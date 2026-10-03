'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, FlaskConical, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { LabResult } from '@/types'
import { useLabResults } from '@/hooks/useLabResults'
import { useProviders } from '@/hooks/useProviders'
import { useAppStore } from '@/store/useAppStore'
import { hasPermission } from '@/lib/roles'
import { deleteLabResult } from '@/lib/services/labResultService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { LabResultDialog } from './LabResultDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { PageError } from '@/components/error/PageError'

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
                autoFocus
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
                aria-label='Edit lab result'
              >
                <Edit className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setConfirmingDelete(true)}
                className='h-8 w-8 text-muted-foreground hover:text-destructive'
                title='Delete Lab Result'
                aria-label='Delete lab result'
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
  const userRole = useAppStore((state) => state.userRole)
  const hospitalId = useAppStore((state) => state.hospitalId)
  const { results, loading: labLoading, error } = useLabResults(patientId)
  const { providers, loading: providersLoading } = useProviders()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState<LabResult | undefined>(
    undefined
  )

  // Role check: If cannot view clinical records, show Lock EmptyState
  if (!hasPermission(userRole, 'canViewClinicalRecords')) {
    return (
      <EmptyState
        icon={Lock}
        title="Access Restricted"
        description="Your role does not have access to lab results."
      />
    )
  }


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
    if (!hospitalId) return
    try {
      await deleteLabResult(hospitalId, patientId, id)
      toast({
        title: 'Lab result deleted',
        description: 'Lab result has been deleted.',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete result'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    }
  }


  const isLoading = labLoading || providersLoading

  return (
    <ErrorBoundary
      fallback={
        <PageError
          title="Failed to load Lab Results"
          message="Try refreshing the page."
        />
      }
    >
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
        <div className='space-y-4 min-h-[260px]'>
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
            <EmptyState
              icon={FlaskConical}
              title='No lab results recorded'
              action={{
                label: 'Add Result',
                onClick: handleOpenAdd,
              }}
            />
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
    </ErrorBoundary>
  )
}
