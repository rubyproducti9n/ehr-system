export interface Patient {
  id: string
  name: string
  gender: 'male' | 'female' | 'other'
  dob: string           // ISO date string
  age: number
  allergies: string[]
  lastVisitDate: string | null
  currentDoctorId: string | null
  status: 'active' | 'inactive' | 'discharged'
  facilityId: string
  createdAt: string
  updatedAt: string
}

export interface Provider {
  id: string
  name: string
  phone: string
  email: string
  specialty: string
  facilityId: string
  createdAt: string
}

export interface Facility {
  id: string
  name: string
  address: string
  phone: string
  createdAt: string
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  providerId: string
  providerName: string
  facilityId: string
  scheduledDate: string   // ISO datetime string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes: string
  createdAt: string
}

export interface AdtEvent {
  id: string
  patientId: string
  admitDate: string | null
  dischargedDate: string | null
  reAdmitDate: string | null
  effectiveDate: string | null
  notes: string
  createdAt: string
}

export interface LabResult {
  id: string
  patientId: string
  title: string
  content: string         // free text
  resultDate: string
  providerId: string
  createdAt: string
}

export interface Prescription {
  id: string
  patientId: string
  medicationName: string
  dosage: string
  frequency: string
  route: string
  prescribingDoctorId: string
  prescribedDate: string
  status: 'active' | 'completed' | 'discontinued'
  notes: string
  createdAt: string
}

export interface Document {
  id: string
  patientId: string
  title: string
  documentType: 'billing' | 'clinical' | 'administrative' | 'lab' | 'other'
  annotation: string
  fileUrl: string         // placeholder for Phase 2 file storage
  uploadedAt: string
  uploadedBy: string
}

export interface Encounter {
  id: string
  patientId: string
  visitDate: string
  providerId: string
  summary: string
  transcript: string      // free text, populated by AI in Phase 2
  createdAt: string
  updatedAt: string
}

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: 'admin' | 'doctor' | 'receptionist'
}
