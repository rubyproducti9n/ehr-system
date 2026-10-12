import { ref, get, update, onValue, Unsubscribe } from 'firebase/database'
import { db } from '@/lib/firebase'
import { AppSettings } from '@/types'

/**
 * Reads the storage location settings once from /hospitals/{hospitalId}/settings.
 */
export async function getStorageLocation(hospitalId: string): Promise<{
  path: string | null
  setAt: string | null
  setBy: string | null
}> {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)
  const snapshot = await get(settingsRef)

  if (!snapshot.exists()) {
    return {
      path: null,
      setAt: null,
      setBy: null,
    }
  }

  const data = snapshot.val() as Record<string, unknown>
  return {
    path: (data.storageLocation as string) || null,
    setAt: (data.storageLocationSetAt as string) || null,
    setBy: (data.storageLocationSetBy as string) || null,
  }
}

/**
 * Configures the document storage location.
 * Only callable when current value is null — throws if already configured.
 */
export async function setStorageLocation(
  hospitalId: string,
  path: string,
  setBy: string
): Promise<void> {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)
  const snapshot = await get(settingsRef)

  if (snapshot.exists()) {
    const data = snapshot.val() as Record<string, unknown>
    if (data.storageLocation) {
      throw new Error('Storage location already configured and cannot be changed')
    }
  }

  const trimmedPath = path.trim()
  if (!trimmedPath) {
    throw new Error('Storage location path cannot be empty')
  }

  const now = new Date().toISOString()
  await update(settingsRef, {
    storageLocation: trimmedPath,
    storageLocationSetAt: now,
    storageLocationSetBy: setBy,
  })
}

/**
 * Realtime listener on /hospitals/{hospitalId}/settings.
 * Returns unsubscribe function.
 */
export function subscribeToSettings(
  hospitalId: string,
  callback: (settings: AppSettings) => void
): Unsubscribe {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)

  return onValue(settingsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({
        storageLocation: null,
        storageLocationSetAt: null,
        storageLocationSetBy: null,
        backendUrl: null,
        backendUrlSetAt: null,
        backendUrlSetBy: null,
        transcriptionUrl: null,
        transcriptionUrlSetAt: null,
        transcriptionUrlSetBy: null,
      })
      return
    }

    const data = snapshot.val() as Record<string, unknown>
    callback({
      storageLocation: (data.storageLocation as string) || null,
      storageLocationSetAt: (data.storageLocationSetAt as string) || null,
      storageLocationSetBy: (data.storageLocationSetBy as string) || null,
      extractionMode: (data.extractionMode as 'online' | 'offline') || null,
      aiModel: (data.aiModel as string) || null,
      backendUrl: (data.backendUrl as string) || null,
      backendUrlSetAt: (data.backendUrlSetAt as string) || null,
      backendUrlSetBy: (data.backendUrlSetBy as string) || null,
      transcriptionUrl: (data.transcriptionUrl as string) || null,
      transcriptionUrlSetAt: (data.transcriptionUrlSetAt as string) || null,
      transcriptionUrlSetBy: (data.transcriptionUrlSetBy as string) || null,
    })
  })
}

/**
 * Updates the document extraction mode (online or offline).
 */
export async function setExtractionMode(
  hospitalId: string,
  mode: 'online' | 'offline'
): Promise<void> {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)
  await update(settingsRef, {
    extractionMode: mode,
  })
}

/**
 * Updates the selected AI model for document analysis.
 */
export async function setAiModel(
  hospitalId: string,
  model: string
): Promise<void> {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)
  await update(settingsRef, {
    aiModel: model,
  })
}

/**
 * Reads the backend and transcription URLs once from /hospitals/{hospitalId}/settings.
 */
export async function getBackendUrls(hospitalId: string): Promise<{
  backendUrl: string | null
  transcriptionUrl: string | null
}> {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)
  const snapshot = await get(settingsRef)

  if (!snapshot.exists()) {
    return {
      backendUrl: null,
      transcriptionUrl: null,
    }
  }

  const data = snapshot.val() as Record<string, unknown>
  return {
    backendUrl: (data.backendUrl as string) || null,
    transcriptionUrl: (data.transcriptionUrl as string) || null,
  }
}

/**
 * Sets the Document AI FastAPI backend URL in hospital settings.
 */
export async function setBackendUrl(
  hospitalId: string,
  url: string | null,
  setBy: string
): Promise<void> {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)
  if (!url || !url.trim()) {
    await update(settingsRef, {
      backendUrl: null,
      backendUrlSetAt: null,
      backendUrlSetBy: null,
    })
    return
  }

  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    throw new Error('Backend URL must start with http:// or https://')
  }

  const now = new Date().toISOString()
  await update(settingsRef, {
    backendUrl: trimmed,
    backendUrlSetAt: now,
    backendUrlSetBy: setBy,
  })
}

/**
 * Sets the Transcription Server (Sherpa-ONNX) WebSocket URL in hospital settings.
 */
export async function setTranscriptionUrl(
  hospitalId: string,
  url: string | null,
  setBy: string
): Promise<void> {
  const settingsRef = ref(db, `hospitals/${hospitalId}/settings`)
  if (!url || !url.trim()) {
    await update(settingsRef, {
      transcriptionUrl: null,
      transcriptionUrlSetAt: null,
      transcriptionUrlSetBy: null,
    })
    return
  }

  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed.startsWith('wss://') && !trimmed.startsWith('ws://')) {
    throw new Error('Transcription URL must start with ws:// or wss://')
  }

  const now = new Date().toISOString()
  await update(settingsRef, {
    transcriptionUrl: trimmed,
    transcriptionUrlSetAt: now,
    transcriptionUrlSetBy: setBy,
  })
}
