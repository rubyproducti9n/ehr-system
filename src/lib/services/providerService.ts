import {
  ref,
  push,
  set,
  update,
  remove,
  get,
  onValue,
  Unsubscribe,
} from 'firebase/database'
import { db } from '@/lib/firebase'
import { Provider } from '@/types'
import { encodeEmailForFirebase } from '@/lib/utils'

// Realtime listener — returns unsubscribe function
export function subscribeToProviders(
  hospitalId: string,
  callback: (providers: Provider[]) => void
): Unsubscribe {
  const providersRef = ref(db, `hospitals/${hospitalId}/providers`)
  return onValue(
    providersRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const providers: Provider[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
      }))
      callback(providers)
    },
    (error) => {
      console.error('Error in subscribeToProviders:', error)
      callback([])
    }
  )
}

// One-time fetch
export async function getProviders(hospitalId: string): Promise<Provider[]> {
  const providersRef = ref(db, `hospitals/${hospitalId}/providers`)
  const snapshot = await get(providersRef)
  const data = snapshot.val()
  if (!data) return []
  return Object.keys(data).map((key) => ({
    ...data[key],
    id: key,
  }))
}

// Create — uses Firebase push() to generate ID
export async function createProvider(
  hospitalId: string,
  data: Omit<Provider, 'id' | 'createdAt'>
): Promise<Provider> {
  const providersRef = ref(db, `hospitals/${hospitalId}/providers`)
  const newRef = push(providersRef)
  const id = newRef.key as string
  const createdAt = new Date().toISOString()

  const newProvider: Provider = {
    ...data,
    id,
    createdAt,
  }

  await set(newRef, newProvider)
  return newProvider
}

// Update — partial update, always sets updatedAt if field exists
export async function updateProvider(
  hospitalId: string,
  id: string,
  data: Partial<Omit<Provider, 'id' | 'createdAt'>>
): Promise<void> {
  const providerRef = ref(db, `hospitals/${hospitalId}/providers/${id}`)
  await update(providerRef, data)
}

// Delete
export async function deleteProvider(hospitalId: string, id: string): Promise<void> {
  const providerRef = ref(db, `hospitals/${hospitalId}/providers/${id}`)
  await remove(providerRef)
}

// Check if email is already registered under a different hospital
export async function checkProviderEmailAvailable(
  email: string,
  currentHospitalId: string
): Promise<{ available: boolean; conflictingHospitalId?: string }> {
  const encoded = encodeEmailForFirebase(email)
  const snap = await get(ref(db, `providerEmails/${encoded}`))

  if (!snap.exists()) return { available: true }

  const data = snap.val()
  const existingHospitalId = data.hospitalId

  // Same hospital — not a cross-hospital conflict (handled by existing dupe check)
  if (existingHospitalId === currentHospitalId) return { available: true }

  // Different hospital — conflict
  return { available: false, conflictingHospitalId: existingHospitalId }
}

// Register email in global lookup — call after provider is successfully created
export async function registerProviderEmail(
  email: string,
  hospitalId: string,
  providerName: string
): Promise<void> {
  const encoded = encodeEmailForFirebase(email)
  await set(ref(db, `providerEmails/${encoded}`), {
    hospitalId,
    providerName,
    addedAt: new Date().toISOString(),
  })
}

// Remove email from global lookup — call after provider is deleted
export async function unregisterProviderEmail(email: string): Promise<void> {
  const encoded = encodeEmailForFirebase(email)
  await remove(ref(db, `providerEmails/${encoded}`))
}
