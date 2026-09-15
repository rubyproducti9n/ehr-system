'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { LabResult } from '@/types'
import { createLabResult, updateLabResult } from '@/lib/services/labResultService'
import { useProviders } from '@/hooks/useProviders'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface LabResultDialogProps {
  patientId: string
  result?: LabResult
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toDateInputValue(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export function LabResultDialog({
  patientId,
  result,
  open,
  onOpenChange,
}: LabResultDialogProps) {
  const isEdit = !!result
  const { toast } = useToast()
  const { providers, loading: providersLoading } = useProviders()

  const [title, setTitle] = useState('')
  const [resultDate, setResultDate] = useState('')
  const [providerId, setProviderId] = useState('')
  const [content, setContent] = useState('')

  const [errors, setErrors] = useState<{
    title?: string
    resultDate?: string
    providerId?: string
    content?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (result) {
      setTitle(result.title || '')
      setResultDate(toDateInputValue(result.resultDate))
      setProviderId(result.providerId || '')
      setContent(result.content || '')
    } else {
      setTitle('')
      setResultDate(new Date().toISOString().split('T')[0])
      setProviderId('')
      setContent('')
    }
    setErrors({})
  }, [result, open])

  const validate = () => {
    const newErrors: {
      title?: string
      resultDate?: string
      providerId?: string
      content?: string
    } = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters'
    }

    if (!resultDate) {
      newErrors.resultDate = 'Result date is required'
    } else {
      const selected = new Date(resultDate)
      const now = new Date()
      // Allow today
      now.setHours(23, 59, 59, 999)
      if (selected > now) {
        newErrors.resultDate = 'Result date cannot be in the future'
      }
    }

    if (!providerId) {
      newErrors.providerId = 'Ordering provider is required'
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required'
    } else if (content.trim().length < 5) {
      newErrors.content = 'Content must be at least 5 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        resultDate: new Date(resultDate).toISOString(),
        providerId,
        content: content.trim(),
      }

      if (isEdit && result) {
        await updateLabResult(patientId, result.id, payload)
      } else {
        await createLabResult(patientId, { patientId, ...payload })
      }

      toast({
        title: 'Lab result saved',
        description: isEdit
          ? 'Lab result record updated.'
          : 'New lab result recorded successfully.',
      })

      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving result',
        description: err?.message || 'Failed to save lab result.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[540px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lab Result' : 'Add Lab Result'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='lab-title'>
              Title <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='lab-title'
              placeholder='e.g. Complete Blood Count (CBC) Panel, Lipid Profile'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
            {errors.title && (
              <p className='text-xs text-destructive'>{errors.title}</p>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='lab-date'>
                Result Date <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='lab-date'
                type='date'
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                disabled={submitting}
              />
              {errors.resultDate && (
                <p className='text-xs text-destructive'>{errors.resultDate}</p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='lab-provider'>
                Ordering Provider <span className='text-destructive'>*</span>
              </Label>
              <select
                id='lab-provider'
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                disabled={submitting || providersLoading}
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <option value=''>
                  {providersLoading
                    ? 'Loading providers...'
                    : providers.length === 0
                    ? 'No providers found'
                    : 'Select a provider'}
                </option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.specialty})
                  </option>
                ))}
              </select>
              {errors.providerId && (
                <p className='text-xs text-destructive'>{errors.providerId}</p>
              )}
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='lab-content'>
              Findings & Values <span className='text-destructive'>*</span>
            </Label>
            <textarea
              id='lab-content'
              rows={6}
              placeholder='Enter detailed test values, reference ranges, and clinical interpretations...'
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              className='flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            />
            {errors.content && (
              <p className='text-xs text-destructive'>{errors.content}</p>
            )}
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save Result'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
