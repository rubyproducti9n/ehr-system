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
