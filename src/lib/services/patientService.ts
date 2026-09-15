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

const PATIENTS_PATH = 'patients'

// Realtime listener — returns unsubscribe function
export function subscribeToPatients(
  callback: (patients: Patient[]) => void
): Unsubscribe {
  const patientsRef = ref(db, PATIENTS_PATH)
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
export async function getPatientById(id: string): Promise<Patient | null> {
  const patientRef = ref(db, PATIENTS_PATH + '/' + id)
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
  data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Patient> {
  const patientsRef = ref(db, PATIENTS_PATH)
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
  id: string,
  data: Partial<Omit<Patient, 'id' | 'createdAt'>>
): Promise<void> {
  const patientRef = ref(db, PATIENTS_PATH + '/' + id)
  const updatedAt = new Date().toISOString()
  await update(patientRef, {
    ...data,
    updatedAt,
  })
}

// Thin wrapper over updatePatient for status changes
export async function updatePatientStatus(
  id: string,
  status: Patient['status']
): Promise<void> {
  await updatePatient(id, { status })
}

// Delete
export async function deletePatient(id: string): Promise<void> {
  const patientRef = ref(db, PATIENTS_PATH + '/' + id)
  await remove(patientRef)
}
