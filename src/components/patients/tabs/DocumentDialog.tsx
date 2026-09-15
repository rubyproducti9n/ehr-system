'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Document } from '@/types'
import {
  createDocument,
  updateDocument,
} from '@/lib/services/documentService'
import { DOCUMENT_TYPES, DocumentTypeKey } from '@/lib/documentTypes'
import { useAppStore } from '@/store/useAppStore'
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

interface DocumentDialogProps {
  patientId: string
  document?: Document
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentDialog({
  patientId,
  document: doc,
  open,
  onOpenChange,
}: DocumentDialogProps) {
  const isEdit = !!doc
  const { toast } = useToast()
  const currentUser = useAppStore((state) => state.currentUser)

  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState<DocumentTypeKey>('clinical')
  const [annotation, setAnnotation] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  const [errors, setErrors] = useState<{
    title?: string
    documentType?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '')
      setDocumentType(
        (doc.documentType as DocumentTypeKey) || 'clinical'
      )
      setAnnotation(doc.annotation || '')
      setFileUrl(doc.fileUrl || '')
    } else {
      setTitle('')
      setDocumentType('clinical')
      setAnnotation('')
      setFileUrl('')
    }
    setErrors({})
  }, [doc, open])

  const validate = () => {
    const newErrors: { title?: string; documentType?: string } = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters'
    }

    if (!documentType) {
      newErrors.documentType = 'Document type is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      if (isEdit && doc) {
        await updateDocument(patientId, doc.id, {
          title: title.trim(),
          documentType,
          annotation: annotation.trim(),
          fileUrl: fileUrl.trim(),
        })
      } else {
        const uploaderName =
          currentUser?.displayName || currentUser?.email || 'Clinical Staff'

        await createDocument(patientId, {
          patientId,
          title: title.trim(),
          documentType,
          annotation: annotation.trim(),
          fileUrl: fileUrl.trim(),
          uploadedBy: uploaderName,
        })
      }

      toast({
        title: 'Document saved',
        description: isEdit
          ? 'Document entry updated successfully.'
          : 'New document indexed successfully.',
      })

      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving document',
        description: err?.message || 'Failed to save document.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Document' : 'Add Document'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='doc-title'>
              Title <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='doc-title'
              placeholder='e.g. Discharge Summary, Consent Form, Insurance Card'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
            {errors.title && (
              <p className='text-xs text-destructive'>{errors.title}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='doc-type'>
              Document Type <span className='text-destructive'>*</span>
            </Label>
            <select
              id='doc-type'
              value={documentType}
              onChange={(e) =>
                setDocumentType(e.target.value as DocumentTypeKey)
              }
              disabled={submitting}
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            {errors.documentType && (
              <p className='text-xs text-destructive'>{errors.documentType}</p>
            )}
          </div>

          <div className='space-y-1.5'>
            <div className='flex justify-between items-center'>
              <Label htmlFor='doc-annotation'>Annotation</Label>
              <span className='text-[11px] text-muted-foreground'>
                {annotation.length} / 500
              </span>
            </div>
            <textarea
              id='doc-annotation'
              rows={3}
              maxLength={500}
              placeholder='Enter relevant clinical notes, patient consent status, or internal remarks...'
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              disabled={submitting}
              className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='doc-url'>Reference / URL</Label>
            <Input
              id='doc-url'
              placeholder='https://... or document reference ID'
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              disabled={submitting}
            />
            <p className='text-xs text-muted-foreground'>
              File upload coming soon — enter a URL or reference for now
            </p>
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
                'Save Document'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
