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
import { Facility } from '@/types'

// Realtime listener — returns unsubscribe function
export function subscribeToFacilities(
  hospitalId: string,
  callback: (facilities: Facility[]) => void
): Unsubscribe {
  const facilitiesRef = ref(db, `hospitals/${hospitalId}/facilities`)
  return onValue(
    facilitiesRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const facilities: Facility[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
      }))
      callback(facilities)
    },
    (error) => {
      console.error('Error in subscribeToFacilities:', error)
      callback([])
    }
  )
}

// One-time fetch
export async function getFacilities(hospitalId: string): Promise<Facility[]> {
  const facilitiesRef = ref(db, `hospitals/${hospitalId}/facilities`)
  const snapshot = await get(facilitiesRef)
  const data = snapshot.val()
  if (!data) return []
  return Object.keys(data).map((key) => ({
    ...data[key],
    id: key,
  }))
}

// Create — uses Firebase push() to generate ID
export async function createFacility(
  hospitalId: string,
  data: Omit<Facility, 'id' | 'createdAt'>
): Promise<Facility> {
  const facilitiesRef = ref(db, `hospitals/${hospitalId}/facilities`)
  const newRef = push(facilitiesRef)
  const id = newRef.key as string
  const createdAt = new Date().toISOString()

  const newFacility: Facility = {
    ...data,
    id,
    createdAt,
  }

  await set(newRef, newFacility)
  return newFacility
}

// Update — partial update, always sets updatedAt if field exists
export async function updateFacility(
  hospitalId: string,
  id: string,
  data: Partial<Omit<Facility, 'id' | 'createdAt'>>
): Promise<void> {
  const facilityRef = ref(db, `hospitals/${hospitalId}/facilities/${id}`)
  await update(facilityRef, data)
}

// Delete
export async function deleteFacility(hospitalId: string, id: string): Promise<void> {
  const facilityRef = ref(db, `hospitals/${hospitalId}/facilities/${id}`)
  await remove(facilityRef)
}
