import { ref, push } from 'firebase/database'
import db from '@/lib/firebase'
import type { ActivityAction, ActivityLog } from '@/types'

export interface LogParams {
  hospitalId: string
  action: ActivityAction
  performedBy: {
    uid: string
    email: string
    displayName: string
    role: string
  }
  entity: {
    type: string
    id: string
    label: string
  }
  summary: string
  metadata?: Record<string, any>
}

export async function writeActivityLog(params: LogParams): Promise<void> {
  if (!params.hospitalId || !params.performedBy.uid) return

  try {
    const logRef = ref(db, `hospitals/${params.hospitalId}/activityLog`)
    await push(logRef, {
      timestamp: new Date().toISOString(),
      action: params.action,
      performedBy: params.performedBy,
      entity: params.entity,
      summary: params.summary,
      metadata: params.metadata ?? null,
    })
  } catch (err) {
    // Log failures must never break the main operation
    // Fail silently — log to console only
    console.warn('[ActivityLog] Failed to write log:', err)
  }
}

export function buildPerformedBy(currentUser: {
  uid: string
  email: string
  displayName?: string
}, userRole: string): LogParams['performedBy'] {
  return {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName ?? currentUser.email,
    role: userRole,
  }
}
