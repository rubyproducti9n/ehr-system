'use client'

import React from 'react'
import Link from 'next/link'
import {
  Building2,
  Users,
  Users2,
  Calendar,
  ChevronRight,
  Sparkles,
  Database,
  Sliders,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { useAllHospitals } from '@/hooks/useAllHospitals'
import { useAllAuditLogs } from '@/hooks/useAllAuditLogs'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  label: string
  value: number | string
  loading: boolean
  icon: React.ElementType
  colorClass?: string
}

function ConsoleStatCard({ label, value, loading, icon: Icon, colorClass = 'text-indigo-600 bg-indigo-50 border-indigo-100' }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`p-2 rounded-lg border ${colorClass}`}>
          <Icon className="h-4 w-4 shrink-0" />
        </div>
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-16 bg-slate-200" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ConsolePage() {
  const {
    hospitals,
    totalHospitals,
    totalPatients,
    totalStaff,
    totalAppointmentsToday,
    loading: hospitalsLoading,
  } = useAllHospitals()

  const { logs, loading: logsLoading } = useAllAuditLogs()

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-full text-slate-900">
      {/* Section 1: System Status Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            System Metrics Overview
          </h2>
          <span className="text-xs text-slate-400">Live multi-tenant telemetry</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ConsoleStatCard
            label="Total Hospitals"
            value={totalHospitals}
            loading={hospitalsLoading}
            icon={Building2}
            colorClass="text-blue-600 bg-blue-50 border-blue-100"
          />
          <ConsoleStatCard
            label="Total Patients"
            value={totalPatients}
            loading={hospitalsLoading}
            icon={Users}
            colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
          />
          <ConsoleStatCard
            label="Total Staff"
            value={totalStaff}
            loading={hospitalsLoading}
            icon={Users2}
            colorClass="text-purple-600 bg-purple-50 border-purple-100"
          />
          <ConsoleStatCard
            label="Appointments Today"
            value={totalAppointmentsToday}
            loading={hospitalsLoading}
            icon={Calendar}
            colorClass="text-amber-600 bg-amber-50 border-amber-100"
          />
        </div>
      </div>

      {/* Section 2: Hospital Registry Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Registered Hospital Tenants
          </h2>
          <span className="text-xs text-slate-500">
            {hospitals.length} {hospitals.length === 1 ? 'tenant' : 'tenants'} active
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Hospital ID</th>
                <th className="px-4 py-3 font-semibold">Hospital Name</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold text-right">Staff</th>
                <th className="px-4 py-3 font-semibold text-right">Patients</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitalsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 bg-slate-100" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-8 ml-auto bg-slate-100" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-8 ml-auto bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 bg-slate-100" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-12 mx-auto bg-slate-100" /></td>
                  </tr>
                ))
              ) : hospitals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                    No hospital tenants found in registry.
                  </td>
                </tr>
              ) : (
                hospitals.map((h) => (
                  <tr key={h.hospitalId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-32 truncate" title={h.hospitalId}>
                      {h.hospitalId}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {h.name}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-600">
                      {h.hospitalCode}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 font-mono">
                      {h.staffCount}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 font-mono">
                      {h.patientCount}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {h.createdAt ? formatDate(h.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Recent Activity Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Recent System Activity (AI Extraction Audit Log)
          </h2>
          <span className="text-xs text-slate-500">
            Last {logs.length} events
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden divide-y divide-slate-100 shadow-xs">
          {logsLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-full bg-slate-100" />
              <Skeleton className="h-5 w-full bg-slate-100" />
              <Skeleton className="h-5 w-full bg-slate-100" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 italic text-xs">
              No recent audit log entries recorded.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-slate-400 text-[11px] font-mono shrink-0">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-slate-100 text-slate-700 border-slate-200 shrink-0">
                    {log.hospitalName || log.hospitalId.substring(0, 8)}
                  </Badge>
                  <span className="text-slate-800 font-medium truncate">
                    {log.documentType || 'document'}
                  </span>
                  <span className="text-slate-400 truncate hidden md:inline">
                    by {log.performedBy}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[11px]">
                  <span className="font-mono text-slate-600">
                    {log.modelUsed || 'cloud-ai'}
                  </span>
                  {log.inferenceTimeMs !== undefined && (
                    <span className="font-mono">
                      {(log.inferenceTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span className="text-emerald-700 font-medium text-[10px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    OK
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 4: Quick Links Row */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Management Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/console/flags"
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Feature Flags &amp; Toggles
                </p>
                <p className="text-xs text-slate-500">
                  Control platform capabilities and UI visibility across tenants
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Link>

          <Link
            href="/console/db"
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Database Explorer
                </p>
                <p className="text-xs text-slate-500">
                  Read-only live inspection of database hierarchy and nodes
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}
