import { ref, get } from 'firebase/database'
import { db } from './firebase'

export function generateHospitalCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomPart = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    randomPart += chars[randomIndex]
  }
  return `HOSP-${randomPart}`
}

export async function isCodeUnique(code: string): Promise<boolean> {
  const snapshot = await get(ref(db, `hospitalCodes/${code}`))
  return !snapshot.exists()
}

export async function generateUniqueCode(): Promise<string> {
  const maxAttempts = 10
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateHospitalCode()
    const unique = await isCodeUnique(code)
    if (unique) {
      return code
    }
  }
  throw new Error('Failed to generate a unique hospital code. Please try again.')
}
