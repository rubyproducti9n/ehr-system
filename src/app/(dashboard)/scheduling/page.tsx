'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  CalendarX,
  Filter,
} from 'lucide-react'
import { Appointment } from '@/types'
import { useAppointments } from '@/hooks/useAppointments'
import { useFacilities } from '@/hooks/useFacilities'
import {
  updateAppointmentStatus,
  deleteAppointment,
} from '@/lib/services/appointmentService'
import { formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { StatCard } from '@/components/shared/StatCard'
import { AppointmentSheet } from '@/components/scheduling/AppointmentSheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/shared/EmptyState'

type QuickDateFilter = 'today' | 'week' | 'upcoming' | 'all' | 'custom'
type StatusFilter = 'all' | 'scheduled' | 'completed' | 'cancelled'

export default function SchedulingPage() {
  const { appointments, loading: appointmentsLoading, error } = useAppointments()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { toast } = useToast()

  // Filter states
  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('upcoming')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Sheet & Action states
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>(
    undefined
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submittingDelete, setSubmittingDelete] = useState(false)

  // Facilities lookup map
  const facilityMap = useMemo(() => {
    const map = new Map<string, string>()
    facilities.forEach((f) => map.set(f.id, f.name))
    return map
  }, [facilities])

  // Summary Stat calculations (derived from full unfiltered appointments array)
  const stats = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0]
    let todayCount = 0
    let scheduledCount = 0
    let completedCount = 0
    let cancelledCount = 0

    appointments.forEach((a) => {
      const aDate = a.scheduledDate ? a.scheduledDate.split('T')[0] : ''
      if (aDate === todayIso) todayCount++
      if (a.status === 'scheduled') scheduledCount++
      if (a.status === 'completed') completedCount++
      if (a.status === 'cancelled') cancelledCount++
    })

    return {
      today: todayCount,
      scheduled: scheduledCount,
      completed: completedCount,
      cancelled: cancelledCount,
    }
  }, [appointments])

  // Handle Quick Date Select
  const handleQuickDateSelect = (filter: 'today' | 'week' | 'upcoming' | 'all') => {
    setDateFilter(filter)
    setCustomFrom('')
    setCustomTo('')
  }

  // Handle Custom Date Input
  const handleCustomFromChange = (val: string) => {
    setCustomFrom(val)
    setDateFilter('custom')
  }

  const handleCustomToChange = (val: string) => {
    setCustomTo(val)
    setDateFilter('custom')
  }

  const handleClearCustom = () => {
    setCustomFrom('')
    setCustomTo('')
    setDateFilter('upcoming')
  }

  // Filter appointments by date filter
  const dateFilteredAppointments = useMemo(() => {
    const now = new Date()
    const todayIso = now.toISOString().split('T')[0]

    // Week end: Sunday of current week
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, ...
    const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + daysUntilSunday)
    const endOfWeekIso = endOfWeek.toISOString().split('T')[0]

    return appointments.filter((a) => {
      const aDate = a.scheduledDate ? a.scheduledDate.split('T')[0] : ''

      if (dateFilter === 'today') {
        return aDate === todayIso
      }
      if (dateFilter === 'week') {
        return aDate >= todayIso && aDate <= endOfWeekIso
      }
      if (dateFilter === 'upcoming') {
        return aDate >= todayIso && a.status === 'scheduled'
      }
      if (dateFilter === 'custom') {
        if (customFrom && aDate < customFrom) return false
        if (customTo && aDate > customTo) return false
        return true
      }
      // 'all'
      return true
    })
  }, [appointments, dateFilter, customFrom, customTo])

  // Compute status pill counts based on date-filtered list
  const statusCounts = useMemo(() => {
    const res = { all: 0, scheduled: 0, completed: 0, cancelled: 0 }
    dateFilteredAppointments.forEach((a) => {
      res.all++
      if (a.status in res) {
        res[a.status as keyof typeof res]++
      }
    })
    return res
  }, [dateFilteredAppointments])

  // Filter by status & sort
  const finalAppointments = useMemo(() => {
    let list = dateFilteredAppointments
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter)
    }

    const sorted = [...list]
    if (dateFilter === 'all') {
      // Descending (most recently created first by createdAt)
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
    } else {
      // Ascending (soonest first by scheduledDate)
      sorted.sort((a, b) => {
        const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0
        const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0
        return dateA - dateB
      })
    }
    return sorted
  }, [dateFilteredAppointments, statusFilter, dateFilter])

  // Sheet openers
  const handleOpenAdd = () => {
    setSelectedAppointment(undefined)
    setSheetOpen(true)
  }

  const handleOpenEdit = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setSheetOpen(true)
  }

  // Update Status action
  const handleStatusChange = async (apt: Appointment, status: Appointment['status']) => {
    if (apt.status === status) return
    try {
      await updateAppointmentStatus(apt.id, status)
      toast({
        title: 'Status updated',
        description: `Status updated to ${status}`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    }
  }

  // Delete Appointment action
  const handleConfirmDelete = async (id: string) => {
    setSubmittingDelete(true)
    try {
      await deleteAppointment(id)
      toast({
        title: 'Appointment deleted',
        description: 'Appointment deleted',
      })
      setDeletingId(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete appointment'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error: ${message}`,
      })
    } finally {
      setSubmittingDelete(false)
    }
  }

  const isLoading = appointmentsLoading || facilitiesLoading

  return (
    <div className="space-y-6">
      {/* Header & New Appointment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Scheduling
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage patient appointments, clinic visits, and provider schedules.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Appointments"
          value={stats.today}
          color="blue"
          icon={Calendar}
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          color="blue"
          icon={Clock}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          color="green"
          icon={CheckCircle2}
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          color="gray"
          icon={XCircle}
        />
      </div>

      {/* Date Range Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'week', 'upcoming', 'all'] as const).map((filter) => {
            const isSelected = dateFilter === filter
            const label =
              filter === 'today'
                ? 'Today'
                : filter === 'week'
                ? 'This Week'
                : filter === 'upcoming'
                ? 'Upcoming'
                : 'All'

            return (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => handleQuickDateSelect(filter)}
                className="h-8 text-xs font-medium"
              >
                {label}
              </Button>
            )
          })}
        </div>

        {/* Custom Range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">From:</span>
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={customFrom}
            onChange={(e) => handleCustomFromChange(e.target.value)}
            aria-label="From date filter"
          />
          <span className="text-xs font-medium text-muted-foreground">To:</span>
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={customTo}
            onChange={(e) => handleCustomToChange(e.target.value)}
            aria-label="To date filter"
          />
          {(customFrom || customTo || dateFilter === 'custom') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCustom}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((st) => {
          const isActive = statusFilter === st
          const label =
            st === 'all'
              ? 'All'
              : st.charAt(0).toUpperCase() + st.slice(1)
          const count = statusCounts[st]

          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
                (isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80')
              }
            >
              <span>{label}</span>
              <span
                className={
                  'rounded-full px-1.5 py-0.2 text-[10px] ' +
                  (isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-background text-foreground')
                }
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Appointments Table with Horizontal Scroll */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Date &amp; Time</TableHead>
              <TableHead className="font-semibold">Patient</TableHead>
              <TableHead className="font-semibold">Provider</TableHead>
              <TableHead className="font-semibold">Facility</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // 5 rows x 6 data + 1 action column skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0 border-none">
                  <EmptyState
                    icon={CalendarX}
                    title="No appointments found"
                    description="Schedule your first appointment"
                    action={{
                      label: 'Schedule Appointment',
                      onClick: handleOpenAdd,
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : finalAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0 border-none">
                  <EmptyState
                    icon={Filter}
                    title="No appointments match your filters"
                    description="Try adjusting the date range or status filter"
                  />
                </TableCell>
              </TableRow>
            ) : (
              finalAppointments.map((apt) => {
                const facilityName = facilityMap.get(apt.facilityId) || '—'
                const isConfirming = deletingId === apt.id

                return (
                  <TableRow key={apt.id}>
                    {/* Date & Time */}
                    <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">
                      {formatDateTime(apt.scheduledDate)}
                    </TableCell>

                    {/* Patient Link */}
                    <TableCell>
                      <Link
                        href={`/patients/${apt.patientId}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                      >
                        {apt.patientName || 'Unknown Patient'}
                      </Link>
                    </TableCell>

                    {/* Provider */}
                    <TableCell className="text-xs text-foreground">
                      {apt.providerName || '—'}
                    </TableCell>

                    {/* Facility */}
                    <TableCell className="text-xs text-muted-foreground">
                      {facilityName}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {apt.status === 'scheduled' && (
                        <Badge
                          className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                          aria-label="Status: Scheduled"
                        >
                          Scheduled
                        </Badge>
                      )}
                      {apt.status === 'completed' && (
                        <Badge
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                          aria-label="Status: Completed"
                        >
                          Completed
                        </Badge>
                      )}
                      {apt.status === 'cancelled' && (
                        <Badge
                          className="bg-slate-500 hover:bg-slate-600 text-white border-none"
                          aria-label="Status: Cancelled"
                        >
                          Cancelled
                        </Badge>
                      )}
                    </TableCell>

                    {/* Notes (truncated 40 chars with tooltip) */}
                    <TableCell
                      className="text-xs text-muted-foreground max-w-[180px] truncate"
                      title={apt.notes || undefined}
                    >
                      {apt.notes
                        ? apt.notes.length > 40
                          ? `${apt.notes.slice(0, 40)}...`
                          : apt.notes
                        : '—'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {isConfirming ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleConfirmDelete(apt.id)}
                            disabled={submittingDelete}
                            className="h-7 px-2 text-xs"
                            autoFocus
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingId(null)}
                            disabled={submittingDelete}
                            className="h-7 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {/* Status Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Update Status"
                                aria-label="Update appointment status"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={apt.status === 'scheduled'}
                                onClick={() => handleStatusChange(apt, 'scheduled')}
                                className="cursor-pointer"
                              >
                                Set Scheduled
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={apt.status === 'completed'}
                                onClick={() => handleStatusChange(apt, 'completed')}
                                className="cursor-pointer"
                              >
                                Set Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={apt.status === 'cancelled'}
                                onClick={() => handleStatusChange(apt, 'cancelled')}
                                className="cursor-pointer"
                              >
                                Set Cancelled
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(apt)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit Appointment"
                            aria-label="Edit appointment"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(apt.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Appointment"
                            aria-label="Delete appointment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Appointment Sheet */}
      <AppointmentSheet
        appointment={selectedAppointment}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
