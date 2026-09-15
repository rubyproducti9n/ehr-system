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
import { Prescription } from '@/types'

const RX_PATH = 'prescriptions'

// Realtime listener — returns unsubscribe function
export function subscribeToPrescriptions(
  patientId: string,
  callback: (prescriptions: Prescription[]) => void
): Unsubscribe {
  const rxRef = ref(db, RX_PATH + '/' + patientId)
  return onValue(
    rxRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const prescriptions: Prescription[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
        patientId,
      }))
      callback(prescriptions)
    },
    (error) => {
      console.error('Error in subscribeToPrescriptions:', error)
      callback([])
    }
  )
}

// Create — uses push() to generate ID under /prescriptions/{patientId}
export async function createPrescription(
  patientId: string,
  data: Omit<Prescription, 'id' | 'createdAt'>
): Promise<Prescription> {
  const patientRxRef = ref(db, RX_PATH + '/' + patientId)
  const newRef = push(patientRxRef)
  const id = newRef.key as string
  const createdAt = new Date().toISOString()

  const newPrescription: Prescription = {
    ...data,
    id,
    patientId,
    createdAt,
  }

  await set(newRef, newPrescription)
  return newPrescription
}

// Update — partial update
export async function updatePrescription(
  patientId: string,
  prescriptionId: string,
  data: Partial<Omit<Prescription, 'id' | 'createdAt' | 'patientId'>>
): Promise<void> {
  const rxRef = ref(db, RX_PATH + '/' + patientId + '/' + prescriptionId)
  await update(rxRef, data)
}

// Update Prescription Status
export async function updatePrescriptionStatus(
  patientId: string,
  prescriptionId: string,
  status: Prescription['status']
): Promise<void> {
  await updatePrescription(patientId, prescriptionId, { status })
}

// Delete
export async function deletePrescription(
  patientId: string,
  prescriptionId: string
): Promise<void> {
  const rxRef = ref(db, RX_PATH + '/' + patientId + '/' + prescriptionId)
  await remove(rxRef)
}
