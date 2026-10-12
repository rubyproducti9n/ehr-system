import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

// Uses Firebase Admin SDK to read backendUrl server-side in API routes
// Requires FIREBASE_ADMIN_SERVICE_ACCOUNT env var (base64 encoded service account JSON)

export async function getHospitalBackendUrl(hospitalId: string): Promise<string> {
  if (!hospitalId || !hospitalId.trim()) {
    return 'http://127.0.0.1:8765'
  }

  try {
    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
    if (!serviceAccountBase64 || !serviceAccountBase64.trim()) {
      return 'http://127.0.0.1:8765'
    }

    // Initialize admin SDK if not already initialized
    if (!getApps().length) {
      const decodedJson = Buffer.from(serviceAccountBase64.trim(), 'base64').toString('utf8')
      const serviceAccount = JSON.parse(decodedJson)

      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      })
    }

    const db = getDatabase()
    const snap = await db.ref(`hospitals/${hospitalId.trim()}/settings/backendUrl`).get()
    const url = snap.val()

    if (url && typeof url === 'string' && url.startsWith('http')) {
      return url.replace(/\/$/, '')
    }
  } catch (err) {
    console.error('Error fetching hospital backendUrl from Firebase Admin:', err)
  }

  return 'http://127.0.0.1:8765'
}
