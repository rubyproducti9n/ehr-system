import { ref, onValue, push, set, update, remove, Unsubscribe } from 'firebase/database'
import { db } from '@/lib/firebase'
import { Appointment } from '@/types'

export function subscribeToAppointments(
  callback: (appointments: Appointment[]) => void
): Unsubscribe {
  const appointmentsRef = ref(db, 'appointments')
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
  callback: (appointments: Appointment[]) => void
): Unsubscribe {
  const appointmentsRef = ref(db, 'appointments')
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
  data: Omit<Appointment, 'id' | 'createdAt'>
): Promise<Appointment> {
  const appointmentsRef = ref(db, 'appointments')
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
  appointmentId: string,
  status: Appointment['status']
): Promise<void> {
  const appointmentRef = ref(db, `appointments/${appointmentId}`)
  await update(appointmentRef, { status })
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<Omit<Appointment, 'id' | 'createdAt'>>
): Promise<void> {
  const appointmentRef = ref(db, `appointments/${appointmentId}`)
  await update(appointmentRef, data)
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  const appointmentRef = ref(db, `appointments/${appointmentId}`)
  await remove(appointmentRef)
}
