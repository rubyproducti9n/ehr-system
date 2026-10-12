// Visual styling for each NER entity type in transcript display
export const NER_ENTITY_STYLES: Record<string, {
  label: string
  bg: string
  text: string
  border: string
}> = {
  DRUG: {
    label: 'Drug',
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-300 dark:border-blue-700',
  },
  DIAGNOSIS: {
    label: 'Diagnosis',
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-800 dark:text-red-200',
    border: 'border-red-300 dark:border-red-700',
  },
  SYMPTOM: {
    label: 'Symptom',
    bg: 'bg-orange-100 dark:bg-orange-950',
    text: 'text-orange-800 dark:text-orange-200',
    border: 'border-orange-300 dark:border-orange-700',
  },
  DOSAGE: {
    label: 'Dosage',
    bg: 'bg-green-100 dark:bg-green-950',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-300 dark:border-green-700',
  },
  FREQUENCY: {
    label: 'Frequency',
    bg: 'bg-purple-100 dark:bg-purple-950',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-300 dark:border-purple-700',
  },
  PROCEDURE: {
    label: 'Procedure',
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-300 dark:border-yellow-700',
  },
}

export function getEntityStyle(type: string) {
  return NER_ENTITY_STYLES[type] ?? {
    label: type,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-200',
    border: 'border-gray-300 dark:border-gray-600',
  }
}
