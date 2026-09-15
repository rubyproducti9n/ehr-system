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

const FACILITIES_PATH = 'facilities'

// Realtime listener — returns unsubscribe function
export function subscribeToFacilities(
  callback: (facilities: Facility[]) => void
): Unsubscribe {
  const facilitiesRef = ref(db, FACILITIES_PATH)
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
export async function getFacilities(): Promise<Facility[]> {
  const facilitiesRef = ref(db, FACILITIES_PATH)
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
  data: Omit<Facility, 'id' | 'createdAt'>
): Promise<Facility> {
  const facilitiesRef = ref(db, FACILITIES_PATH)
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
  id: string,
  data: Partial<Omit<Facility, 'id' | 'createdAt'>>
): Promise<void> {
  const facilityRef = ref(db, FACILITIES_PATH + '/' + id)
  await update(facilityRef, data)
}

// Delete
export async function deleteFacility(id: string): Promise<void> {
  const facilityRef = ref(db, FACILITIES_PATH + '/' + id)
  await remove(facilityRef)
}
