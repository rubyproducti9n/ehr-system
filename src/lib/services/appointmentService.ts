import { ref, onValue, push, set, update, remove, Unsubscribe } from 'firebase/database'
import { db } from '@/lib/firebase'
import { Appointment } from '@/types'
import { getAdtEvents, createAdtEvent, updateAdtEvent } from '@/lib/services/adtService'
import { formatDate } from '@/lib/utils'

export function subscribeToAppointments(
  hospitalId: string,
  callback: (appointments: Appointment[]) => void
): Unsubscribe {
  const appointmentsRef = ref(db, `hospitals/${hospitalId}/appointments`)
  return onValue(appointmentsRef, (snapshot) => {
    const data = snapshot.val()
    if (!data) {
      callback([])
      return
    }
    const appointments: Appointment[] = Object.keys(data).map((key) => ({
      ...data[key],
      id: key,
    }))
    callback(appointments)
  })
}

export function subscribeToUpcomingAppointments(
  hospitalId: string,
  callback: (appointments: Appointment[]) => void
): Unsubscribe {
  const appointmentsRef = ref(db, `hospitals/${hospitalId}/appointments`)
  return onValue(appointmentsRef, (snapshot) => {
    const data = snapshot.val()
    if (!data) {
      callback([])
      return
    }
    const todayIso = new Date().toISOString().split('T')[0]
    const appointments: Appointment[] = Object.keys(data)
      .map((key) => ({
        ...data[key],
        id: key,
      }))
      .filter((a) => {
        const appointmentDate = a.scheduledDate ? a.scheduledDate.split('T')[0] : ''
        return appointmentDate >= todayIso && a.status === 'scheduled'
      })
    callback(appointments)
  })
}

export async function createAppointment(
  hospitalId: string,
  data: Omit<Appointment, 'id' | 'createdAt'>
): Promise<Appointment> {
  const appointmentsRef = ref(db, `hospitals/${hospitalId}/appointments`)
  const newAppointmentRef = push(appointmentsRef)
  const id = newAppointmentRef.key!
  const createdAt = new Date().toISOString()
  const appointment: Appointment = {
    ...data,
    id,
    createdAt,
  }
  await set(newAppointmentRef, appointment)
  return appointment
}

export async function updateAppointmentStatus(
  hospitalId: string,
  appointmentId: string,
  status: Appointment['status'],
  appointment: Appointment
): Promise<{ statusUpdated: boolean; adtUpdated: boolean }> {
  const appointmentRef = ref(db, `hospitals/${hospitalId}/appointments/${appointmentId}`)
  await update(appointmentRef, { status })

  if (status !== 'completed') {
    return { statusUpdated: true, adtUpdated: false }
  }

  let adtUpdated = false
  try {
    const events = await getAdtEvents(hospitalId, appointment.patientId)
    if (events.length === 0) {
      await createAdtEvent(hospitalId, appointment.patientId, {
        patientId: appointment.patientId,
        admitDate: null,
        dischargedDate: null,
        reAdmitDate: appointment.scheduledDate,
        effectiveDate: appointment.scheduledDate,
        notes: `Auto-created from completed appointment on ${formatDate(appointment.scheduledDate)}.`,
      })
      adtUpdated = true
    } else {
      const mostRecent = events[0]
      await updateAdtEvent(hospitalId, appointment.patientId, mostRecent.id, {
        reAdmitDate: appointment.scheduledDate,
      })
      adtUpdated = true
    }
  } catch (error) {
    console.error('Failed to update ADT event on appointment completion:', error)
    adtUpdated = false
  }

  return { statusUpdated: true, adtUpdated }
}

export async function updateAppointment(
  hospitalId: string,
  appointmentId: string,
  data: Partial<Omit<Appointment, 'id' | 'createdAt'>>
): Promise<void> {
  const appointmentRef = ref(db, `hospitals/${hospitalId}/appointments/${appointmentId}`)
  await update(appointmentRef, data)
}

export async function deleteAppointment(hospitalId: string, appointmentId: string): Promise<void> {
  const appointmentRef = ref(db, `hospitals/${hospitalId}/appointments/${appointmentId}`)
  await remove(appointmentRef)
}
