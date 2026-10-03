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
import { Document } from '@/types'

// Realtime listener — returns unsubscribe function
export function subscribeToDocuments(
  hospitalId: string,
  patientId: string,
  callback: (documents: Document[]) => void
): Unsubscribe {
  const docsRef = ref(db, `hospitals/${hospitalId}/documents/${patientId}`)
  return onValue(
    docsRef,
    (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }
      const documents: Document[] = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
        patientId,
      }))
      callback(documents)
    },
    (error) => {
      console.error('Error in subscribeToDocuments:', error)
      callback([])
    }
  )
}

// Create — uses push() to generate ID under /hospitals/{hospitalId}/documents/{patientId}
export async function createDocument(
  hospitalId: string,
  patientId: string,
  data: Omit<Document, 'id' | 'uploadedAt'>
): Promise<Document> {
  const patientDocsRef = ref(db, `hospitals/${hospitalId}/documents/${patientId}`)
  const newRef = push(patientDocsRef)
  const id = newRef.key as string
  const uploadedAt = new Date().toISOString()

  const newDoc: Document = {
    ...data,
    id,
    patientId,
    uploadedAt,
  }

  await set(newRef, newDoc)
  return newDoc
}

// Update — partial update (uploadedBy and uploadedAt cannot be changed)
export async function updateDocument(
  hospitalId: string,
  patientId: string,
  documentId: string,
  data: Partial<Omit<Document, 'id' | 'uploadedAt' | 'patientId' | 'uploadedBy'>>
): Promise<void> {
  const docRef = ref(db, `hospitals/${hospitalId}/documents/${patientId}/${documentId}`)
  await update(docRef, data)
}

// Delete
export async function deleteDocument(
  hospitalId: string,
  patientId: string,
  documentId: string
): Promise<void> {
  const docRef = ref(db, `hospitals/${hospitalId}/documents/${patientId}/${documentId}`)
  await remove(docRef)
}
