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

const PROVIDERS_PATH = 'providers'

// Realtime listener — returns unsubscribe function
export function subscribeToProviders(
  callback: (providers: Provider[]) => void
): Unsubscribe {
  const providersRef = ref(db, PROVIDERS_PATH)
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
export async function getProviders(): Promise<Provider[]> {
  const providersRef = ref(db, PROVIDERS_PATH)
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
  data: Omit<Provider, 'id' | 'createdAt'>
): Promise<Provider> {
  const providersRef = ref(db, PROVIDERS_PATH)
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
  id: string,
  data: Partial<Omit<Provider, 'id' | 'createdAt'>>
): Promise<void> {
  const providerRef = ref(db, PROVIDERS_PATH + '/' + id)
  await update(providerRef, data)
}

// Delete
export async function deleteProvider(id: string): Promise<void> {
  const providerRef = ref(db, PROVIDERS_PATH + '/' + id)
  await remove(providerRef)
}
