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

const DOCS_PATH = 'documents'

// Realtime listener — returns unsubscribe function
export function subscribeToDocuments(
  patientId: string,
  callback: (documents: Document[]) => void
): Unsubscribe {
  const docsRef = ref(db, DOCS_PATH + '/' + patientId)
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

// Create — uses push() to generate ID under /documents/{patientId}
export async function createDocument(
  patientId: string,
  data: Omit<Document, 'id' | 'uploadedAt'>
): Promise<Document> {
  const patientDocsRef = ref(db, DOCS_PATH + '/' + patientId)
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
  patientId: string,
  documentId: string,
  data: Partial<Omit<Document, 'id' | 'uploadedAt' | 'patientId' | 'uploadedBy'>>
): Promise<void> {
  const docRef = ref(db, DOCS_PATH + '/' + patientId + '/' + documentId)
  await update(docRef, data)
}

// Delete
export async function deleteDocument(
  patientId: string,
  documentId: string
): Promise<void> {
  const docRef = ref(db, DOCS_PATH + '/' + patientId + '/' + documentId)
  await remove(docRef)
}
