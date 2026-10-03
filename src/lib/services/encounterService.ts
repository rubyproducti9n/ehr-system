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
import { Encounter } from '@/types'

// Realtime listener — returns unsubscribe function
export function subscribeToEncounters(
  hospitalId: string,
  patientId: string,
  callback: (encounters: Encounter[]) => void
): Unsubscribe {
  const encRef = ref(db, `hospitals/${hospitalId}/encounters/${patientId}`)
  return onValue(
    encRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const encounters: Encounter[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
        patientId,
      }))
      callback(encounters)
    },
    (error) => {
      console.error('Error in subscribeToEncounters:', error)
      callback([])
    }
  )
}

// Create — uses push() to generate ID under /hospitals/{hospitalId}/encounters/{patientId}
export async function createEncounter(
  hospitalId: string,
  patientId: string,
  data: Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Encounter> {
  const patientEncRef = ref(db, `hospitals/${hospitalId}/encounters/${patientId}`)
  const newRef = push(patientEncRef)
  const id = newRef.key as string
  const timestamp = new Date().toISOString()

  const newEncounter: Encounter = {
    ...data,
    id,
    patientId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await set(newRef, newEncounter)
  return newEncounter
}

// Update — always sets updatedAt
export async function updateEncounter(
  hospitalId: string,
  patientId: string,
  encounterId: string,
  data: Partial<Omit<Encounter, 'id' | 'createdAt' | 'patientId'>>
): Promise<void> {
  const encRef = ref(
    db,
    `hospitals/${hospitalId}/encounters/${patientId}/${encounterId}`
  )
  const updatedAt = new Date().toISOString()
  await update(encRef, {
    ...data,
    updatedAt,
  })
}

// Delete
export async function deleteEncounter(
  hospitalId: string,
  patientId: string,
  encounterId: string
): Promise<void> {
  const encRef = ref(
    db,
    `hospitals/${hospitalId}/encounters/${patientId}/${encounterId}`
  )
  await remove(encRef)
}
