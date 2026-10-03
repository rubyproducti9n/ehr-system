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

// Realtime listener — returns unsubscribe function
export function subscribeToLabResults(
  hospitalId: string,
  patientId: string,
  callback: (results: LabResult[]) => void
): Unsubscribe {
  const labRef = ref(db, `hospitals/${hospitalId}/labResults/${patientId}`)
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

// Create — uses push() to generate ID under /hospitals/{hospitalId}/labResults/{patientId}
export async function createLabResult(
  hospitalId: string,
  patientId: string,
  data: Omit<LabResult, 'id' | 'createdAt'>
): Promise<LabResult> {
  const patientLabRef = ref(db, `hospitals/${hospitalId}/labResults/${patientId}`)
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
  hospitalId: string,
  patientId: string,
  resultId: string,
  data: Partial<Omit<LabResult, 'id' | 'createdAt' | 'patientId'>>
): Promise<void> {
  const resultRef = ref(db, `hospitals/${hospitalId}/labResults/${patientId}/${resultId}`)
  await update(resultRef, data)
}

// Delete
export async function deleteLabResult(
  hospitalId: string,
  patientId: string,
  resultId: string
): Promise<void> {
  const resultRef = ref(db, `hospitals/${hospitalId}/labResults/${patientId}/${resultId}`)
  await remove(resultRef)
}
