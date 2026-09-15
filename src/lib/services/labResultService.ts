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
import { LabResult } from '@/types'

const LAB_PATH = 'labResults'

// Realtime listener — returns unsubscribe function
export function subscribeToLabResults(
  patientId: string,
  callback: (results: LabResult[]) => void
): Unsubscribe {
  const labRef = ref(db, LAB_PATH + '/' + patientId)
  return onValue(
    labRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const results: LabResult[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
        patientId,
      }))
      callback(results)
    },
    (error) => {
      console.error('Error in subscribeToLabResults:', error)
      callback([])
    }
  )
}

// Create — uses push() to generate ID under /labResults/{patientId}
export async function createLabResult(
  patientId: string,
  data: Omit<LabResult, 'id' | 'createdAt'>
): Promise<LabResult> {
  const patientLabRef = ref(db, LAB_PATH + '/' + patientId)
  const newRef = push(patientLabRef)
  const id = newRef.key as string
  const createdAt = new Date().toISOString()

  const newResult: LabResult = {
    ...data,
    id,
    patientId,
    createdAt,
  }

  await set(newRef, newResult)
  return newResult
}

// Update — partial update
export async function updateLabResult(
  patientId: string,
  resultId: string,
  data: Partial<Omit<LabResult, 'id' | 'createdAt' | 'patientId'>>
): Promise<void> {
  const resultRef = ref(db, LAB_PATH + '/' + patientId + '/' + resultId)
  await update(resultRef, data)
}

// Delete
export async function deleteLabResult(
  patientId: string,
  resultId: string
): Promise<void> {
  const resultRef = ref(db, LAB_PATH + '/' + patientId + '/' + resultId)
  await remove(resultRef)
}
