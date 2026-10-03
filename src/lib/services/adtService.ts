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
import { AdtEvent } from '@/types'

// Realtime listener — returns unsubscribe function
export function subscribeToAdtEvents(
  hospitalId: string,
  patientId: string,
  callback: (events: AdtEvent[]) => void
): Unsubscribe {
  const adtRef = ref(db, `hospitals/${hospitalId}/adtEvents/${patientId}`)
  return onValue(
    adtRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const events: AdtEvent[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
        patientId,
      }))
      callback(events)
    },
    (error) => {
      console.error('Error in subscribeToAdtEvents:', error)
      callback([])
    }
  )
}

// Create — uses push() to generate ID under /hospitals/{hospitalId}/adtEvents/{patientId}
export async function createAdtEvent(
  hospitalId: string,
  patientId: string,
  data: Omit<AdtEvent, 'id' | 'createdAt'>
): Promise<AdtEvent> {
  const patientAdtRef = ref(db, `hospitals/${hospitalId}/adtEvents/${patientId}`)
  const newRef = push(patientAdtRef)
  const id = newRef.key as string
  const createdAt = new Date().toISOString()

  const newEvent: AdtEvent = {
    ...data,
    id,
    patientId,
    createdAt,
  }

  await set(newRef, newEvent)
  return newEvent
}

// Update — partial update
export async function updateAdtEvent(
  hospitalId: string,
  patientId: string,
  eventId: string,
  data: Partial<Omit<AdtEvent, 'id' | 'createdAt' | 'patientId'>>
): Promise<void> {
  const eventRef = ref(db, `hospitals/${hospitalId}/adtEvents/${patientId}/${eventId}`)
  await update(eventRef, data)
}

// Delete
export async function deleteAdtEvent(
  hospitalId: string,
  patientId: string,
  eventId: string
): Promise<void> {
  const eventRef = ref(db, `hospitals/${hospitalId}/adtEvents/${patientId}/${eventId}`)
  await remove(eventRef)
}

// One-time fetch of all ADT events for a patient, sorted descending by createdAt
export async function getAdtEvents(hospitalId: string, patientId: string): Promise<AdtEvent[]> {
  const adtRef = ref(db, `hospitals/${hospitalId}/adtEvents/${patientId}`)
  const snapshot = await get(adtRef)
  const data = snapshot.val()
  if (!data) return []
  const events: AdtEvent[] = Object.keys(data).map((key) => ({
    ...data[key],
    id: key,
    patientId,
  }))
  return events.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  )
}
