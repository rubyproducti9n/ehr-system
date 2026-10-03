'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Receipt,
  Stethoscope,
  FolderOpen,
  FlaskConical,
  FileText,
  Filter,
  Sparkles,
  Eye,
} from 'lucide-react'
import { Document } from '@/types'
import { useDocuments } from '@/hooks/useDocuments'
import { deleteDocument } from '@/lib/services/documentService'
import { DOCUMENT_TYPES, DocumentTypeKey } from '@/lib/documentTypes'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { isDeveloper } from '@/lib/devAccess'
import { hasPermission } from '@/lib/roles'
import { DocumentDialog } from './DocumentDialog'
import { DocumentAnalysisSheet } from './DocumentAnalysisSheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { PageError } from '@/components/error/PageError'

interface DocumentsTabProps {
  patientId: string
}

type FilterKey = 'all' | DocumentTypeKey

// Helper to render lucide icon component dynamically
function getDocumentIcon(iconName: string, className?: string) {
  switch (iconName) {
    case 'Receipt':
      return <Receipt className={className} />
    case 'Stethoscope':
      return <Stethoscope className={className} />
    case 'FolderOpen':
      return <FolderOpen className={className} />
    case 'FlaskConical':
      return <FlaskConical className={className} />
    case 'FileText':
    default:
      return <FileText className={className} />
  }
}

function DocumentCard({
  doc,
  patientId,
  onEdit,
  onDelete,
  onAnalyse,
}: {
  doc: Document
  patientId: string
  onEdit: () => void
  onDelete: (id: string) => Promise<void>
  onAnalyse: () => void
}) {
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const appSettings = useAppStore((state) => state.appSettings)
  const isFeatureEnabled = useAppStore((state) => state.isFeatureEnabled)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const typeConfig =
    DOCUMENT_TYPES[doc.documentType as DocumentTypeKey] ||
    DOCUMENT_TYPES.other

  const isStoredFile =
    Boolean(doc.fileUrl) &&
    Boolean(appSettings?.storageLocation) &&
    doc.fileUrl.startsWith(appSettings!.storageLocation!)

  const isWebUrl =
    doc.fileUrl &&
    (doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://')) &&
    !isStoredFile

  const filename = doc.fileUrl ? doc.fileUrl.split(/[\/\\]/).pop() : ''
  const staticFileUrl = filename
    ? `http://127.0.0.1:8765/patient-docs/${patientId}/${filename}`
    : ''

  const handleConfirm = async () => {
    setDeleting(true)
    await onDelete(doc.id)
    setDeleting(false)
  }

  return (
    <div
      className={
        'rounded-lg border p-5 shadow-sm space-y-3.5 transition-all flex flex-col justify-between ' +
        typeConfig.bg +
        ' ' +
        typeConfig.border
      }
    >
      <div className='space-y-3'>
        {/* Top row: Type Badge + Actions */}
        <div className='flex items-center justify-between gap-2'>
          <span
            className={
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-background/80 shadow-xs ' +
              typeConfig.color
            }
          >
            {getDocumentIcon(typeConfig.icon, 'h-3.5 w-3.5')}
            <span>{typeConfig.label}</span>
          </span>

          {/* Action buttons / in-card inline delete */}
          <div>
            {confirmingDelete ? (
              <div className='flex items-center gap-1.5 bg-background/90 border border-destructive/30 px-2 py-0.5 rounded-md'>
                <span className='text-[11px] font-medium text-destructive'>
                  Delete?
                </span>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={handleConfirm}
                  disabled={deleting}
                  className='h-5 px-1.5 text-[11px]'
                  autoFocus
                >
                  Yes
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className='h-5 px-1.5 text-[11px]'
                >
                  No
                </Button>
              </div>
            ) : (
              <div className='flex items-center gap-0.5'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onEdit}
                  className='h-7 w-7 text-muted-foreground hover:text-foreground'
                  title='Edit Document'
                  aria-label='Edit document'
                >
                  <Edit className='h-3.5 w-3.5' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setConfirmingDelete(true)}
                  className='h-7 w-7 text-muted-foreground hover:text-destructive'
                  title='Delete Document'
                  aria-label='Delete document'
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className='text-base font-semibold text-foreground tracking-tight'>
          {doc.title}
        </h4>

        {/* Annotation (if present) */}
        {doc.annotation && doc.annotation.trim().length > 0 && (
          <div className='space-y-0.5'>
            <span className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider block'>
              Annotation:
            </span>
            <p className='text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-background/60 p-2.5 rounded border border-border/40'>
              {doc.annotation}
            </p>
          </div>
        )}

        {/* Reference / File View & AI Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isStoredFile && staticFileUrl ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1.5 border-primary/40 bg-background/80 hover:bg-primary/10 text-primary font-medium"
            >
              <a href={staticFileUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3.5 w-3.5" />
                View File
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            </Button>
          ) : isWebUrl ? (
            <a
              href={doc.fileUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline break-all'
            >
              <span>{doc.fileUrl}</span>
              <ExternalLink className='h-3 w-3 shrink-0' />
            </a>
          ) : doc.fileUrl && doc.fileUrl.trim().length > 0 ? (
            <span className='text-xs font-mono text-foreground break-all bg-background/70 px-2 py-1 rounded border border-border/40 inline-block'>
              {doc.fileUrl}
            </span>
          ) : null}

          {/* Analyse with AI button */}
          {hasPermission(userRole, 'canUseAiFeatures') && isFeatureEnabled('ai_document_analysis') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onAnalyse}
              className="h-7 px-2.5 text-xs gap-1.5 text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 font-medium cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Analyse with AI
            </Button>
          )}
        </div>
      </div>

      {/* Footer Meta */}
      <div className='pt-2 border-t border-border/30 text-[11px] text-muted-foreground'>
        Added by{' '}
        <span className='font-medium text-foreground'>{doc.uploadedBy}</span> ·{' '}
        {formatDate(doc.uploadedAt)}
      </div>
    </div>
  )
}

export function DocumentsTab({ patientId }: DocumentsTabProps) {
  const router = useRouter()
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const appSettings = useAppStore((state) => state.appSettings)
  const isFeatureEnabled = useAppStore((state) => state.isFeatureEnabled)
  const { documents, loading, error } = useDocuments(patientId)
  const { toast } = useToast()

  const hospitalId = useAppStore((state) => state.hospitalId)
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | undefined>(
    undefined
  )
  const [analysisSheet, setAnalysisSheet] = useState<{
    open: boolean
    document: Document | null
  }>({ open: false, document: null })

  const handleAnalyse = (doc: Document) => {
    const mode = appSettings?.extractionMode ?? 'online'

    if (mode === 'online') {
      const encodedFileUrl = encodeURIComponent(doc.fileUrl || '')
      router.push(`/analyse?documentId=${doc.id}&patientId=${patientId}&fileUrl=${encodedFileUrl}`)
    } else if (mode === 'offline') {
      setAnalysisSheet({ open: true, document: doc })
    } else {
      const encodedFileUrl = encodeURIComponent(doc.fileUrl || '')
      router.push(`/analyse?documentId=${doc.id}&patientId=${patientId}&fileUrl=${encodedFileUrl}`)
    }
  }

  // Compute counts per category
  const counts = useMemo(() => {
    const res: Record<FilterKey, number> = {
      all: 0,
      billing: 0,
      clinical: 0,
      administrative: 0,
      lab: 0,
      other: 0,
    }
    documents.forEach((d) => {
      res.all++
      const type = d.documentType as DocumentTypeKey
      if (type in res) {
        res[type]++
      } else {
        res.other++
      }
    })
    return res
  }, [documents])

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    if (selectedFilter === 'all') return documents
    return documents.filter((d) => d.documentType === selectedFilter)
  }, [documents, selectedFilter])

  const handleOpenAdd = () => {
    setSelectedDoc(undefined)
    setDialogOpen(true)
  }

  const handleOpenEdit = (doc: Document) => {
    setSelectedDoc(doc)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!hospitalId) return
    try {
      await deleteDocument(hospitalId, patientId, id)
      toast({
        title: 'Document deleted',
        description: 'Document deleted',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error occurred while removing document'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    }
  }

  return (
    <ErrorBoundary
      fallback={
        <PageError
          title="Failed to load Documents"
          message="Try refreshing the page."
        />
      }
    >
      <div className='space-y-6'>
        {/* Top Bar Row */}
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-muted-foreground'>
            Documents
          </span>
          {isFeatureEnabled('patient_document_upload') ? (
            <Button onClick={handleOpenAdd} size='sm' className='gap-1.5'>
              <Plus className='h-4 w-4' />
              Add Document
            </Button>
          ) : (
            <Button disabled size='sm' className='gap-1.5 opacity-60'>
              <Plus className='h-4 w-4' />
              Uploads Disabled
            </Button>
          )}
        </div>

        {/* Type Filter Pills */}
        <div className='flex items-center gap-2 overflow-x-auto pb-1'>
          {/* 'All' pill */}
          <button
            onClick={() => setSelectedFilter('all')}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
              (selectedFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80')
            }
          >
            <span>All</span>
            <span
              className={
                'rounded-full px-1.5 py-0.2 text-[10px] ' +
                (selectedFilter === 'all'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-background text-foreground')
              }
            >
              {counts.all}
            </span>
          </button>

          {/* Category pills */}
          {(Object.keys(DOCUMENT_TYPES) as DocumentTypeKey[]).map((key) => {
            const config = DOCUMENT_TYPES[key]
            const isActive = selectedFilter === key
            const count = counts[key]

            return (
              <button
                key={key}
                onClick={() => setSelectedFilter(key)}
                className={
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ' +
                  (isActive
                    ? config.bg + ' ' + config.border + ' ' + config.color + ' font-semibold ring-1 ring-primary/30'
                    : 'bg-muted/60 border-transparent text-muted-foreground hover:bg-muted')
                }
              >
                {getDocumentIcon(config.icon, 'h-3.5 w-3.5')}
                <span>{config.label}</span>
                <span
                  className={
                    'rounded-full px-1.5 py-0.2 text-[10px] ' +
                    (isActive
                      ? 'bg-background/80 ' + config.color
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

        {/* 2-Column Responsive Grid */}
        <div className="min-h-[260px]">
          {loading ? (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className='rounded-lg border bg-card p-5 space-y-3.5 shadow-sm'
                >
                  <div className='flex justify-between items-center'>
                    <Skeleton className='h-5 w-24 rounded-full' />
                    <div className='flex gap-1'>
                      <Skeleton className='h-7 w-7 rounded-md' />
                      <Skeleton className='h-7 w-7 rounded-md' />
                    </div>
                  </div>
                  <Skeleton className='h-6 w-48' />
                  <Skeleton className='h-12 w-full rounded' />
                  <Skeleton className='h-4 w-32' />
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title='No documents recorded'
              action={{
                label: 'Add Document',
                onClick: handleOpenAdd,
              }}
            />
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              icon={Filter}
              title={`No ${DOCUMENT_TYPES[selectedFilter as DocumentTypeKey]?.label || selectedFilter} documents found`}
            />
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  patientId={patientId}
                  onEdit={() => handleOpenEdit(doc)}
                  onDelete={handleDelete}
                  onAnalyse={() => handleAnalyse(doc)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add / Edit Dialog */}
        <DocumentDialog
          patientId={patientId}
          document={selectedDoc}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />

        {/* AI Document Analysis Sheet */}
        {analysisSheet.document && (
          <DocumentAnalysisSheet
            open={analysisSheet.open}
            onOpenChange={(open) =>
              setAnalysisSheet((s) => ({ ...s, open }))
            }
            document={analysisSheet.document}
            patientId={patientId}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
