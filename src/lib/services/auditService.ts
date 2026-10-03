import { ref, push, set, get } from 'firebase/database'
import { db } from '@/lib/firebase'
import { ExtractionAuditLog, FieldCorrection } from '@/types'

/**
 * Creates an immutable audit log record in Firebase under /hospitals/{hospitalId}/dev/auditLog.
 * Returns the generated log ID.
 */
export async function createAuditLog(
  hospitalId: string,
  data: Omit<ExtractionAuditLog, 'id'>
): Promise<string> {
  const auditRef = ref(db, `hospitals/${hospitalId}/dev/auditLog`)
  const newRef = push(auditRef)
  const id = newRef.key as string

  const newLog: ExtractionAuditLog = {
    ...data,
    id,
  }

  await set(newRef, newLog)
  return id
}

/**
 * Logs reviewer field corrections under /hospitals/{hospitalId}/dev/corrections.
 * All corrections for a save are batched together.
 */
export async function logFieldCorrections(
  hospitalId: string,
  corrections: Omit<FieldCorrection, 'id'>[]
): Promise<void> {
  const correctionsRef = ref(db, `hospitals/${hospitalId}/dev/corrections`)

  const promises = corrections.map(async (correction) => {
    const newRef = push(correctionsRef)
    const id = newRef.key as string

    const newCorrection: FieldCorrection = {
      ...correction,
      id,
    }

    await set(newRef, newCorrection)
  })

  await Promise.all(promises)
}

/**
 * Fetches all field corrections from /hospitals/{hospitalId}/dev/corrections.
 * Returns records sorted by correctedAt descending.
 */
export async function getAllCorrections(hospitalId: string): Promise<FieldCorrection[]> {
  const correctionsRef = ref(db, `hospitals/${hospitalId}/dev/corrections`)
  const snapshot = await get(correctionsRef)
  if (!snapshot.exists()) return []

  const data = snapshot.val() as Record<string, FieldCorrection>
  const list = Object.values(data)
  return list.sort(
    (a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime()
  )
}

/**
 * Fetches all extraction audit logs from /hospitals/{hospitalId}/dev/auditLog.
 * Returns records sorted by timestamp descending.
 */
export async function getAllAuditLogs(hospitalId: string): Promise<ExtractionAuditLog[]> {
  const auditRef = ref(db, `hospitals/${hospitalId}/dev/auditLog`)
  const snapshot = await get(auditRef)
  if (!snapshot.exists()) return []

  const data = snapshot.val() as Record<string, ExtractionAuditLog>
  const list = Object.values(data)
  return list.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}
