import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  Unsubscribe,
} from 'firebase/database'
import { db } from '@/lib/firebase'
import { AdtEvent } from '@/types'

const ADT_PATH = 'adtEvents'

// Realtime listener — returns unsubscribe function
export function subscribeToAdtEvents(
  patientId: string,
  callback: (events: AdtEvent[]) => void
): Unsubscribe {
  const adtRef = ref(db, ADT_PATH + '/' + patientId)
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

// Create — uses push() to generate ID under /adtEvents/{patientId}
export async function createAdtEvent(
  patientId: string,
  data: Omit<AdtEvent, 'id' | 'createdAt'>
): Promise<AdtEvent> {
  const patientAdtRef = ref(db, ADT_PATH + '/' + patientId)
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
  patientId: string,
  eventId: string,
  data: Partial<Omit<AdtEvent, 'id' | 'createdAt' | 'patientId'>>
): Promise<void> {
  const eventRef = ref(db, ADT_PATH + '/' + patientId + '/' + eventId)
  await update(eventRef, data)
}

// Delete
export async function deleteAdtEvent(
  patientId: string,
  eventId: string
): Promise<void> {
  const eventRef = ref(db, ADT_PATH + '/' + patientId + '/' + eventId)
  await remove(eventRef)
}
