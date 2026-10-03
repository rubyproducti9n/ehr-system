import { ref, update, onValue, get, Unsubscribe } from 'firebase/database'
import { db } from '@/lib/firebase'
import { FeatureFlag } from '@/types'

export const DEFAULT_FLAGS: Omit<FeatureFlag, 'updatedAt' | 'updatedBy'>[] = [
  {
    key: 'ai_document_analysis',
    label: 'AI Document Analysis',
    description: 'Enables the Analyse Document page and AI extraction pipeline for all users.',
    enabled: true,
    visible: true,
    category: 'ai',
  },
  {
    key: 'gemini_online_extraction',
    label: 'Gemini Online Extraction',
    description: 'Allows users to use the cloud Gemini API for document extraction.',
    enabled: true,
    visible: true,
    category: 'ai',
  },
  {
    key: 'local_ai_extraction',
    label: 'Local AI Extraction',
    description: 'Enables the offline local LLM extraction pipeline in Dev Sandbox.',
    enabled: true,
    visible: true,
    category: 'ai',
  },
  {
    key: 'auto_analyse_on_upload',
    label: 'Auto-Analyse on Document Upload',
    description: 'Automatically triggers AI document extraction workflow upon uploading patient documents.',
    enabled: true,
    visible: true,
    category: 'ai',
  },
  {
    key: 'patient_document_upload',
    label: 'Patient Document Upload',
    description: 'Allows uploading files to patient document records.',
    enabled: true,
    visible: true,
    category: 'clinical',
  },
  {
    key: 'scheduling_module',
    label: 'Scheduling Module',
    description: 'Shows the Scheduling page in the sidebar.',
    enabled: true,
    visible: true,
    category: 'clinical',
  },
  {
    key: 'adt_events',
    label: 'ADT Events',
    description: 'Shows ADT Events sub-tab on patient profiles.',
    enabled: true,
    visible: true,
    category: 'clinical',
  },
  {
    key: 'encounter_transcription',
    label: 'Encounter Transcription',
    description: 'Shows the transcript field in Encounter sub-tab.',
    enabled: true,
    visible: true,
    category: 'clinical',
  },
  {
    key: 'corrections_feedback',
    label: 'Corrections Feedback Store',
    description: 'Enables logging of field corrections to Firebase for training data.',
    enabled: true,
    visible: true,
    category: 'dev',
  },
  {
    key: 'audit_trail',
    label: 'Audit Trail',
    description: 'Logs every AI extraction session to Firebase audit log.',
    enabled: true,
    visible: true,
    category: 'dev',
  },
  {
    key: 'multi_model_selection',
    label: 'Multi-Model Selection',
    description: 'Shows model selector dropdown on Gemini extraction page.',
    enabled: true,
    visible: true,
    category: 'experimental',
  },
]

/**
 * Subscribes to all feature flags in realtime from /devConsole/featureFlags.
 * Returns array sorted by category, then label.
 */
export function subscribeToFlags(
  callback: (flags: FeatureFlag[]) => void
): Unsubscribe {
  const flagsRef = ref(db, 'devConsole/featureFlags')

  return onValue(flagsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const data = snapshot.val() as Record<string, FeatureFlag>
    const list: FeatureFlag[] = Object.values(data)

    // Sort by category then label
    list.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.label.localeCompare(b.label)
    })

    callback(list)
  })
}

/**
 * Updates a single feature flag.
 */
export async function updateFlag(
  key: string,
  changes: { enabled?: boolean; visible?: boolean },
  updatedBy: string
): Promise<void> {
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    [`devConsole/featureFlags/${key}/updatedAt`]: now,
    [`devConsole/featureFlags/${key}/updatedBy`]: updatedBy,
  }

  if (changes.enabled !== undefined) {
    updates[`devConsole/featureFlags/${key}/enabled`] = changes.enabled
  }
  if (changes.visible !== undefined) {
    updates[`devConsole/featureFlags/${key}/visible`] = changes.visible
  }

  await update(ref(db), updates)
}

/**
 * Seeds default feature flags if /devConsole/featureFlags is unpopulated.
 */
export async function seedDefaultFlags(
  customFlags?: FeatureFlag[],
  updatedBy: string = 'system'
): Promise<void> {
  const flagsRef = ref(db, 'devConsole/featureFlags')
  const snap = await get(flagsRef)

  if (snap.exists() && Object.keys(snap.val()).length > 0) {
    return // already seeded
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  const source = customFlags || DEFAULT_FLAGS

  source.forEach((f) => {
    updates[`devConsole/featureFlags/${f.key}`] = {
      ...f,
      updatedAt: now,
      updatedBy: (f as FeatureFlag).updatedBy || updatedBy,
    }
  })

  await update(ref(db), updates)
}
