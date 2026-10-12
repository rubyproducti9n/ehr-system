'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import {
  ClipboardList,
  Search,
  Download,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  User,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useActivityLogs } from '@/hooks/useActivityLogs'
import { useAppStore } from '@/store/useAppStore'
import { hasPermission } from '@/lib/roles'
import { ActivityAction, ActivityLog } from '@/types'
import { formatDate } from '@/lib/utils'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Helper: Action Badge Color Scheme
function getActionBadgeVariant(action: ActivityAction) {
  if (action.startsWith('patient.')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  }
  if (action.startsWith('provider.')) {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
  }
  if (action.startsWith('facility.')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  }
  if (action.startsWith('appointment.')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  }
  if (action.startsWith('prescription.')) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
  }
  if (action.startsWith('lab_result.')) {
    return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
  }
  if (action.startsWith('document.')) {
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  }
  if (action.startsWith('encounter.')) {
    return 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800'
  }
  if (action.startsWith('adt_event.')) {
    return 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800'
  }
  if (action.startsWith('staff.')) {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
  }
  if (action.startsWith('auth.')) {
    return 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800'
  }
  if (action.startsWith('settings.')) {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'super_admin':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'admin':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'doctor':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'receptionist':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'dev':
      return 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300 border-pink-200 dark:border-pink-800'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}

export default function ActivityLogPage() {
  const router = useRouter()
  const userRole = useAppStore((state) => state.userRole)
  const { logs, loading } = useActivityLogs(500)

  // Access Gate
  const canAccess = hasPermission(userRole, 'canViewActivityLog')

  // Filter States
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [actionCategoryFilter, setActionCategoryFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | '7days' | '30days' | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set())

  const rowsPerPage = 50

  // Stat Calculations
  const stats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    let todayCount = 0
    let thisMonthCount = 0
    const todayUserCounts: Record<string, { count: number; name: string }> = {}
    const todayActionCounts: Record<string, number> = {}

    logs.forEach((log) => {
      const logTime = new Date(log.timestamp).getTime()
      if (logTime >= todayStart) {
        todayCount++
        const userName = log.performedBy.displayName || log.performedBy.email || 'Unknown'
        if (!todayUserCounts[userName]) {
          todayUserCounts[userName] = { count: 0, name: userName }
        }
        todayUserCounts[userName].count++

        const category = log.action.split('.')[0]
        todayActionCounts[category] = (todayActionCounts[category] || 0) + 1
      }
      if (logTime >= thisMonthStart) {
        thisMonthCount++
      }
    })

    // Most active user today
    let topUser = 'None'
    let topUserMax = 0
    Object.values(todayUserCounts).forEach((u) => {
      if (u.count > topUserMax) {
        topUserMax = u.count
        topUser = u.name
      }
    })

    // Most common action category today
    let topAction = 'None'
    let topActionMax = 0
    Object.entries(todayActionCounts).forEach(([cat, count]) => {
      if (count > topActionMax) {
        topActionMax = count
        topAction = cat.charAt(0).toUpperCase() + cat.slice(1)
      }
    })

    return {
      todayCount,
      topUser: topUserMax > 0 ? `${topUser} (${topUserMax})` : 'None',
      topAction: topActionMax > 0 ? `${topAction} (${topActionMax})` : 'None',
      thisMonthCount,
    }
  }, [logs])

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000

    return logs.filter((log) => {
      // Role filter
      if (roleFilter !== 'all' && log.performedBy.role !== roleFilter) {
        return false
      }

      // Action Category filter
      if (actionCategoryFilter !== 'all') {
        const cat = log.action.split('.')[0]
        if (cat !== actionCategoryFilter) return false
      }

      // Date Range filter
      const logTime = new Date(log.timestamp).getTime()
      if (dateRangeFilter === 'today' && logTime < todayStart) return false
      if (dateRangeFilter === '7days' && logTime < sevenDaysAgo) return false
      if (dateRangeFilter === '30days' && logTime < thirtyDaysAgo) return false

      // Search Query filter (by actor name, email, targetName, or summary)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const actorName = (log.performedBy.displayName || '').toLowerCase()
        const actorEmail = (log.performedBy.email || '').toLowerCase()
        const targetName = (log.entity?.label || '').toLowerCase()
        const summary = (log.summary || '').toLowerCase()
        const action = log.action.toLowerCase()

        if (
          !actorName.includes(query) &&
          !actorEmail.includes(query) &&
          !targetName.includes(query) &&
          !summary.includes(query) &&
          !action.includes(query)
        ) {
          return false
        }
      }

      return true
    })
  }, [logs, roleFilter, actionCategoryFilter, dateRangeFilter, searchQuery])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage))
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredLogs.slice(start, start + rowsPerPage)
  }, [filteredLogs, currentPage])

  // Reset to page 1 on filter changes
  const handleFilterChange = (setter: (v: any) => void, val: any) => {
    setter(val)
    setCurrentPage(1)
  }

  // Toggle log metadata expanded view
  const toggleRowExpand = (logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  // Export to CSV using XLSX
  const handleExportCsv = () => {
    const exportData = filteredLogs.map((log) => ({
      ID: log.id,
      Timestamp: log.timestamp,
      FormattedDate: formatDate(log.timestamp),
      ActorName: log.performedBy.displayName,
      ActorEmail: log.performedBy.email,
      ActorRole: log.performedBy.role,
      Action: log.action,
      TargetType: log.entity?.type || '',
      TargetID: log.entity?.id || '',
      TargetName: log.entity?.label || '',
      Summary: log.summary,
      Metadata: log.metadata ? JSON.stringify(log.metadata) : '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ActivityLogs')
    XLSX.writeFile(workbook, `activity-log-${new Date().toISOString().split('T')[0]}.csv`)
  }

  // Redirect unauthorized users
  if (!loading && !canAccess) {
    router.replace('/')
    return null
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Activity Log
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete audit trail of all record modifications, system changes, and access events.
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          disabled={filteredLogs.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV ({filteredLogs.length})
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Actions Today"
          value={stats.todayCount}
          color="blue"
          icon={Activity}
        />
        <StatCard
          label="Most Active User Today"
          value={stats.topUser}
          color="green"
          icon={User}
        />
        <StatCard
          label="Top Action Type Today"
          value={stats.topAction}
          color="yellow"
          icon={TrendingUp}
        />
        <StatCard
          label="Actions This Month"
          value={stats.thisMonthCount}
          color="gray"
          icon={Layers}
        />
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, target, or action..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => handleFilterChange(setRoleFilter, e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="receptionist">Receptionist</option>
            <option value="dev">Dev</option>
          </select>

          {/* Action Category Filter */}
          <select
            value={actionCategoryFilter}
            onChange={(e) => handleFilterChange(setActionCategoryFilter, e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            <option value="patient">Patients</option>
            <option value="provider">Providers</option>
            <option value="facility">Facilities</option>
            <option value="appointment">Appointments</option>
            <option value="prescription">Prescriptions</option>
            <option value="lab_result">Lab Results</option>
            <option value="document">Documents</option>
            <option value="encounter">Encounters</option>
            <option value="adt_event">ADT Events</option>
            <option value="staff">Staff</option>
            <option value="auth">Auth & Sign In</option>
            <option value="settings">Settings</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRangeFilter}
            onChange={(e) => handleFilterChange(setDateRangeFilter, e.target.value as any)}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground self-end md:self-center whitespace-nowrap">
          Showing {paginatedLogs.length} of {filteredLogs.length} logs
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ClipboardList}
              title="No activity logs found"
              description="No audit records match your current filter criteria."
            />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead className="w-[170px]">Timestamp</TableHead>
                <TableHead className="w-[200px]">Performed By</TableHead>
                <TableHead className="w-[180px]">Action</TableHead>
                <TableHead className="w-[180px]">Target</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => {
                const isExpanded = expandedLogIds.has(log.id)
                const hasMetadata = Boolean(log.metadata && Object.keys(log.metadata).length > 0)

                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      className={hasMetadata ? 'cursor-pointer hover:bg-muted/40' : undefined}
                      onClick={() => hasMetadata && toggleRowExpand(log.id)}
                    >
                      <TableCell className="px-2 py-3">
                        {hasMetadata && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRowExpand(log.id)
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">
                              {log.performedBy.displayName || 'User'}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1 py-0 uppercase font-mono ${getRoleBadgeColor(
                                log.performedBy.role
                              )}`}
                            >
                              {log.performedBy.role}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {log.performedBy.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-mono tracking-tight ${getActionBadgeVariant(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 max-w-[180px]">
                          <p className="text-xs font-medium text-foreground truncate">
                            {log.entity?.label || log.entity?.id}
                          </p>
                          <span className="text-[10px] uppercase font-mono text-muted-foreground">
                            {log.entity?.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-foreground line-clamp-2">
                          {log.summary}
                        </p>
                      </TableCell>
                    </TableRow>

                    {/* Collapsible Metadata Drawer */}
                    {isExpanded && hasMetadata && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={6} className="p-4 pl-10">
                          <div className="rounded-lg border bg-background p-3 space-y-1.5 shadow-inner">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Action Metadata Payload
                            </p>
                            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all bg-muted/40 p-2.5 rounded border">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        {filteredLogs.length > rowsPerPage && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/10">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
