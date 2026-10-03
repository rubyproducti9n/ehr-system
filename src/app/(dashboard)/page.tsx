'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  UserMinus,
  UserX,
  Stethoscope,
  UserPlus,
  CalendarPlus,
  Plus,
  CalendarDays,
  ArrowRight,
  Calendar as CalendarIcon,
  Activity,
  Building2,
  LogIn,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { useAppointments } from '@/hooks/useAppointments'
import { useAppStore } from '@/store/useAppStore'
import { StatCard } from '@/components/shared/StatCard'
import { NewPatientSheet } from '@/components/patients/NewPatientSheet'
import { AppointmentSheet } from '@/components/scheduling/AppointmentSheet'
import { formatDate, formatDateTime, getAvatarColor, getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { patients, loading: patientsLoading } = usePatients()
  const { providers, loading: providersLoading } = useProviders()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { appointments, loading: appointmentsLoading } = useAppointments()

  const hospitalName = useAppStore((state) => state.hospitalName)
  const userRole = useAppStore((state) => state.userRole)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      const dismissed = localStorage.getItem(`ehr-welcome-shown-${user.uid}`)
      if (!dismissed) {
        setShowWelcome(true)
      }
    }
  }, [user?.uid])

  const handleDismissWelcome = () => {
    if (user?.uid) {
      localStorage.setItem(`ehr-welcome-shown-${user.uid}`, 'true')
    }
    setShowWelcome(false)
  }

  // Quick Action Sheet States
  const [patientSheetOpen, setPatientSheetOpen] = useState(false)
  const [appointmentSheetOpen, setAppointmentSheetOpen] = useState(false)

  // Facility Map for fast lookup
  const facilityMap = useMemo(() => {
    const map = new Map<string, string>()
    facilities.forEach((f) => map.set(f.id, f.name))
    return map
  }, [facilities])

  // Section 1: Stats Calculations
  const stats = useMemo(() => {
    const active = patients.filter((p) => p.status === 'active').length
    const inactive = patients.filter((p) => p.status === 'inactive').length
    const discharged = patients.filter((p) => p.status === 'discharged').length

    return {
      totalPatients: patients.length,
      activePatients: active,
      inactivePatients: inactive,
      dischargedPatients: discharged,
      totalProviders: providers.length,
    }
  }, [patients, providers])

  // Section 2 - Left: 5 Most Recently Registered Patients (createdAt descending)
  const recentPatients = useMemo(() => {
    const list = [...patients]
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
    return list.slice(0, 5)
  }, [patients])

  // Section 2 - Right: Next 5 Upcoming Appointments (status === 'scheduled', scheduledDate >= today, sorted ascending)
  const upcomingAppointments = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0]
    const list = appointments.filter((a) => {
      const aDate = a.scheduledDate ? a.scheduledDate.split('T')[0] : ''
      return a.status === 'scheduled' && aDate >= todayIso
    })
    list.sort((a, b) => {
      const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0
      const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0
      return dateA - dateB
    })
    return list.slice(0, 5)
  }, [appointments])

  if (!authLoading && !user) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-xl border-slate-200">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-2">
              <Activity className="h-7 w-7" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
              EHR Platform
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              Clinical management for modern healthcare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Button
              asChild
              size="lg"
              className="w-full flex items-center justify-center gap-2 font-medium"
            >
              <Link href="/register/hospital">
                <Building2 className="h-4 w-4" />
                Register Your Hospital
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 font-medium border-slate-300 hover:bg-slate-50"
            >
              <Link href="/register/staff">
                <UserPlus className="h-4 w-4" />
                Join as Staff
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full flex items-center justify-center gap-2 font-medium bg-slate-100 hover:bg-slate-200 text-slate-900"
            >
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    doctor: 'Doctor',
    receptionist: 'Receptionist',
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      {showWelcome && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-4 transition-all">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-foreground">
              Welcome to <span className="text-primary font-bold">{hospitalName || 'your Hospital'}</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Clinical dashboard and management overview
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissWelcome}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      )}

      {/* Header Info */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Clinical Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time patient census, upcoming visits, and administrative metrics.
        </p>
      </div>

      {/* Section 1: Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {patientsLoading || providersLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 min-h-[92px] shadow-sm flex items-center justify-between"
            >
              <div className="space-y-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total Patients"
              value={stats.totalPatients}
              color="blue"
              icon={Users}
              href="/patients"
            />
            <StatCard
              label="Active Patients"
              value={stats.activePatients}
              color="green"
              icon={UserCheck}
              href="/patients?status=active"
            />
            <StatCard
              label="Inactive Patients"
              value={stats.inactivePatients}
              color="yellow"
              icon={UserMinus}
              href="/patients?status=inactive"
            />
            <StatCard
              label="Discharged"
              value={stats.dischargedPatients}
              color="gray"
              icon={UserX}
              href="/patients?status=discharged"
            />
            <StatCard
              label="Total Providers"
              value={stats.totalProviders}
              color="blue"
              icon={Stethoscope}
              href={(userRole === 'super_admin' || userRole === 'dev') ? "/providers" : undefined}
            />
          </>
        )}
      </div>

      {/* Section 2: Two-column content row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Patients */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="text-base font-semibold text-foreground">
              Recent Patients
            </h2>
            <Link
              href="/patients"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3 min-h-[240px]">
            {patientsLoading || facilitiesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </div>
                </div>
              ))
            ) : recentPatients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No patients yet"
              />
            ) : (
              recentPatients.map((patient) => {
                const initials = getInitials(patient.name)
                const avatarColor = getAvatarColor(patient.gender)
                const facilityName = facilityMap.get(patient.facilityId) || '—'
                const lastVisit = patient.lastVisitDate
                  ? formatDate(patient.lastVisitDate)
                  : 'No visits yet'

                return (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${avatarColor}`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {patient.name}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {patient.age ? `${patient.age} yrs` : '—'} ·{' '}
                          <span className="capitalize">{patient.gender}</span> ·{' '}
                          {facilityName}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status badge + Last visit */}
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <div>
                        {patient.status === 'active' && (
                          <Badge
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 border-none"
                            aria-label="Status: Active"
                          >
                            Active
                          </Badge>
                        )}
                        {patient.status === 'inactive' && (
                          <Badge
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 border-none"
                            aria-label="Status: Inactive"
                          >
                            Inactive
                          </Badge>
                        )}
                        {patient.status === 'discharged' && (
                          <Badge
                            className="bg-slate-500 hover:bg-slate-600 text-white text-[10px] px-1.5 py-0 border-none"
                            aria-label="Status: Discharged"
                          >
                            Discharged
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {lastVisit}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Appointments */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="text-base font-semibold text-foreground">
              Upcoming Appointments
            </h2>
            <Link
              href="/scheduling"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3 min-h-[240px]">
            {appointmentsLoading || facilitiesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                </div>
              ))
            ) : upcomingAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No upcoming appointments"
                action={{
                  label: 'Schedule one',
                  href: '/scheduling',
                }}
              />
            ) : (
              upcomingAppointments.map((apt) => {
                const facilityName = facilityMap.get(apt.facilityId) || '—'

                return (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    {/* Left: Icon + Patient & Doctor */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/patients/${apt.patientId}`}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {apt.patientName || 'Unknown Patient'}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {apt.providerName || 'Provider'} · {facilityName}
                        </p>
                      </div>
                    </div>

                    {/* Right: Time + Status */}
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <span className="text-xs font-medium text-foreground">
                        {formatDateTime(apt.scheduledDate)}
                      </span>
                      <Badge
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-1.5 py-0 border-none"
                        aria-label="Status: Scheduled"
                      >
                        Scheduled
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Quick Actions Row */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Register New Patient */}
          <div
            onClick={() => setPatientSheetOpen(true)}
            className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-card shadow-sm hover:bg-muted/40 cursor-pointer transition-all hover:border-foreground/20 text-center space-y-2 group"
          >
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Register New Patient
              </p>
              <p className="text-xs text-muted-foreground">
                Onboard a new patient into the directory
              </p>
            </div>
          </div>

          {/* Schedule Appointment */}
          <div
            onClick={() => setAppointmentSheetOpen(true)}
            className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-card shadow-sm hover:bg-muted/40 cursor-pointer transition-all hover:border-foreground/20 text-center space-y-2 group"
          >
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Schedule Appointment
              </p>
              <p className="text-xs text-muted-foreground">
                Book a clinical consult or routine checkup
              </p>
            </div>
          </div>

          {/* Add Provider - Super Admin / Dev only */}
          {(userRole === 'super_admin' || userRole === 'dev') && (
            <div
              onClick={() => router.push('/providers')}
              className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-card shadow-sm hover:bg-muted/40 cursor-pointer transition-all hover:border-foreground/20 text-center space-y-2 group"
            >
              <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Add Provider
                </p>
                <p className="text-xs text-muted-foreground">
                  Register clinical staff in provider management
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sheets triggered from Dashboard */}
      <NewPatientSheet
        open={patientSheetOpen}
        onOpenChange={setPatientSheetOpen}
      />
      <AppointmentSheet
        open={appointmentSheetOpen}
        onOpenChange={setAppointmentSheetOpen}
      />
    </div>
  )
}
