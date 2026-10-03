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
import { Patient } from '@/types'

// Realtime listener — returns unsubscribe function
export function subscribeToPatients(
  hospitalId: string,
  callback: (patients: Patient[]) => void
): Unsubscribe {
  const patientsRef = ref(db, `hospitals/${hospitalId}/patients`)
  return onValue(
    patientsRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const patients: Patient[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
      }))
      callback(patients)
    },
    (error) => {
      console.error('Error in subscribeToPatients:', error)
      callback([])
    }
  )
}

// One-time fetch by ID
export async function getPatientById(hospitalId: string, id: string): Promise<Patient | null> {
  const patientRef = ref(db, `hospitals/${hospitalId}/patients/${id}`)
  const snapshot = await get(patientRef)
  const data = snapshot.val()
  if (!data) return null
  return {
    ...data,
    id,
  }
}

// Create — uses Firebase push() to generate ID
export async function createPatient(
  hospitalId: string,
  data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Patient> {
  const patientsRef = ref(db, `hospitals/${hospitalId}/patients`)
  const newRef = push(patientsRef)
  const id = newRef.key as string
  const timestamp = new Date().toISOString()

  const newPatient: Patient = {
    ...data,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await set(newRef, newPatient)
  return newPatient
}

// Update — partial update, always sets updatedAt
export async function updatePatient(
  hospitalId: string,
  id: string,
  data: Partial<Omit<Patient, 'id' | 'createdAt'>>
): Promise<void> {
  const patientRef = ref(db, `hospitals/${hospitalId}/patients/${id}`)
  const updatedAt = new Date().toISOString()
  await update(patientRef, {
    ...data,
    updatedAt,
  })
}

// Thin wrapper over updatePatient for status changes
export async function updatePatientStatus(
  hospitalId: string,
  id: string,
  status: Patient['status']
): Promise<void> {
  await updatePatient(hospitalId, id, { status })
}

// Delete
export async function deletePatient(hospitalId: string, id: string): Promise<void> {
  const patientRef = ref(db, `hospitals/${hospitalId}/patients/${id}`)
  await remove(patientRef)
}
