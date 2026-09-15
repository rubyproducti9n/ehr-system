export const DOCUMENT_TYPES = {
  billing: {
    label: 'Billing',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'Receipt',
  },
  clinical: {
    label: 'Clinical',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'Stethoscope',
  },
  administrative: {
    label: 'Administrative',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'FolderOpen',
  },
  lab: {
    label: 'Lab',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    icon: 'FlaskConical',
  },
  other: {
    label: 'Other',
    color: 'text-gray-600',
    bg: 'bg-gray-50 dark:bg-gray-950',
    border: 'border-gray-200 dark:border-gray-800',
    icon: 'FileText',
  },
} as const

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPES
