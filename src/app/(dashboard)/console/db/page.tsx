'use client'

import React, { useState } from 'react'
import {
  Database,
  RefreshCw,
  DownloadCloud,
  Loader2,
  Terminal,
} from 'lucide-react'
import { useDbExplorer } from '@/hooks/useDbExplorer'
import { DbTreeNode } from '@/components/console/DbTreeNode'
import { Button } from '@/components/ui/button'

export default function DbExplorerPage() {
  const { data, loading, loadingLogs, error, refetch } = useDbExplorer()

  // Set of expanded path keys. Default to root and top-level branches
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['/', '/hospitals', '/hospitalCodes', '/users', '/devConsole'])
  )

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const isExpanded = (path: string) => expandedPaths.has(path)

  const handleExportJson = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ehr-db-snapshot-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Calculate summary totals
  const totalTenants = data.hospitals.length
  const totalPatients = data.hospitals.reduce((acc, h) => acc + h.counts.patients, 0)
  const totalStaff = data.hospitals.reduce((acc, h) => acc + h.counts.staff, 0)
  const totalDocuments = data.hospitals.reduce((acc, h) => acc + h.counts.documents, 0)
  const totalPrescriptions = data.hospitals.reduce((acc, h) => acc + h.counts.prescriptions, 0)
  const totalAuditLogs = data.hospitals.reduce((acc, h) => acc + h.counts.auditLog, 0)
  const totalCorrections = data.hospitals.reduce((acc, h) => acc + h.counts.corrections, 0)

  const truncate = (str: string, max: number) => {
    if (!str) return '—'
    return str.length > max ? `${str.substring(0, max)}...` : str
  }

  return (
    <div className="min-h-full bg-slate-50 p-6 text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
              <Database className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Database Explorer
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Read-only live view of Firebase Realtime Database structure and tenant hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={loading}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium gap-1.5 shadow-xs"
          >
            <DownloadCloud className="h-3.5 w-3.5 text-slate-500" />
            Export JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium gap-1.5 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-6">
        {loading ? (
          <div className="py-6 px-4 font-mono text-xs text-emerald-400 space-y-2 bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
            <div className="flex items-center gap-2 pb-2 text-slate-400 border-b border-slate-800">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>firebase-cli-explorer --stream</span>
            </div>
            {loadingLogs.map((log, index) => (
              <div key={index} className="flex items-center gap-2">
                <span>{log}</span>
                {index === loadingLogs.length - 1 && (
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                )}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-4">
            Error: {error}
          </div>
        ) : (
          <div className="space-y-1 font-mono text-xs overflow-x-auto py-2">
            {/* Root Node */}
            <DbTreeNode
              label="/"
              path="/"
              badge="root"
              depth={0}
              isExpandable={true}
              isExpanded={isExpanded('/')}
              onToggle={() => togglePath('/')}
              nodeType="root"
            >
              {/* 1. /hospitals */}
              <DbTreeNode
                label="hospitals"
                path="/hospitals"
                count={data.hospitals.length}
                badge="tenant-scoped"
                depth={1}
                isExpandable={true}
                isExpanded={isExpanded('/hospitals')}
                onToggle={() => togglePath('/hospitals')}
                nodeType="root"
              >
                {data.hospitals.map((h) => {
                  const hospPath = `/hospitals/${h.hospitalId}`
                  const profilePath = `${hospPath}/profile`
                  const settingsPath = `${hospPath}/settings`
                  const devPath = `${hospPath}/dev`

                  return (
                    <DbTreeNode
                      key={h.hospitalId}
                      label={`${truncate(h.hospitalId, 12)} (${h.profile.name})`}
                      path={hospPath}
                      depth={2}
                      isExpandable={true}
                      isExpanded={isExpanded(hospPath)}
                      onToggle={() => togglePath(hospPath)}
                      nodeType="hospital"
                    >
                      {/* profile */}
                      <DbTreeNode
                        label="profile"
                        path={profilePath}
                        depth={3}
                        isExpandable={true}
                        isExpanded={isExpanded(profilePath)}
                        onToggle={() => togglePath(profilePath)}
                        nodeType="keyvalue"
                      >
                        <DbTreeNode
                          label="name"
                          path={`${profilePath}/name`}
                          depth={4}
                          isExpandable={false}
                          valuePreview={`: "${h.profile.name}"`}
                          nodeType="leaf"
                        />
                        <DbTreeNode
                          label="hospitalCode"
                          path={`${profilePath}/hospitalCode`}
                          depth={4}
                          isExpandable={false}
                          valuePreview={`: "${h.profile.hospitalCode}"`}
                          nodeType="leaf"
                        />
                        <DbTreeNode
                          label="createdAt"
                          path={`${profilePath}/createdAt`}
                          depth={4}
                          isExpandable={false}
                          valuePreview={`: "${h.profile.createdAt || '—'}"`}
                          nodeType="leaf"
                        />
                        <DbTreeNode
                          label="superAdminUid"
                          path={`${profilePath}/superAdminUid`}
                          depth={4}
                          isExpandable={false}
                          valuePreview={`: "${truncate(h.profile.superAdminUid, 16)}"`}
                          nodeType="leaf"
                        />
                      </DbTreeNode>

                      {/* Collections with counts */}
                      <DbTreeNode
                        label="staff"
                        path={`${hospPath}/staff`}
                        count={h.counts.staff}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="patients"
                        path={`${hospPath}/patients`}
                        count={h.counts.patients}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="providers"
                        path={`${hospPath}/providers`}
                        count={h.counts.providers}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="facilities"
                        path={`${hospPath}/facilities`}
                        count={h.counts.facilities}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="appointments"
                        path={`${hospPath}/appointments`}
                        count={h.counts.appointments}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="adtEvents"
                        path={`${hospPath}/adtEvents`}
                        count={h.counts.adtEvents}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="labResults"
                        path={`${hospPath}/labResults`}
                        count={h.counts.labResults}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="prescriptions"
                        path={`${hospPath}/prescriptions`}
                        count={h.counts.prescriptions}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="documents"
                        path={`${hospPath}/documents`}
                        count={h.counts.documents}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />
                      <DbTreeNode
                        label="encounters"
                        path={`${hospPath}/encounters`}
                        count={h.counts.encounters}
                        depth={3}
                        isExpandable={false}
                        nodeType="subcollection"
                      />

                      {/* settings */}
                      <DbTreeNode
                        label="settings"
                        path={settingsPath}
                        depth={3}
                        isExpandable={true}
                        isExpanded={isExpanded(settingsPath)}
                        onToggle={() => togglePath(settingsPath)}
                        nodeType="keyvalue"
                      >
                        <DbTreeNode
                          label="storageLocation"
                          path={`${settingsPath}/storageLocation`}
                          depth={4}
                          isExpandable={false}
                          valuePreview={`: "${h.settings.storageLocation || 'not set'}"`}
                          nodeType="leaf"
                        />
                        <DbTreeNode
                          label="extractionMode"
                          path={`${settingsPath}/extractionMode`}
                          depth={4}
                          isExpandable={false}
                          valuePreview={`: "${h.settings.extractionMode || 'not set'}"`}
                          nodeType="leaf"
                        />
                      </DbTreeNode>

                      {/* dev */}
                      <DbTreeNode
                        label="dev"
                        path={devPath}
                        badge="dev-only"
                        depth={3}
                        isExpandable={true}
                        isExpanded={isExpanded(devPath)}
                        onToggle={() => togglePath(devPath)}
                        nodeType="keyvalue"
                      >
                        <DbTreeNode
                          label="auditLog"
                          path={`${devPath}/auditLog`}
                          count={h.counts.auditLog}
                          depth={4}
                          isExpandable={false}
                          nodeType="subcollection"
                        />
                        <DbTreeNode
                          label="corrections"
                          path={`${devPath}/corrections`}
                          count={h.counts.corrections}
                          depth={4}
                          isExpandable={false}
                          nodeType="subcollection"
                        />
                      </DbTreeNode>
                    </DbTreeNode>
                  )
                })}
              </DbTreeNode>

              {/* 2. /hospitalCodes */}
              <DbTreeNode
                label="hospitalCodes"
                path="/hospitalCodes"
                count={data.hospitalCodesCount}
                depth={1}
                isExpandable={true}
                isExpanded={isExpanded('/hospitalCodes')}
                onToggle={() => togglePath('/hospitalCodes')}
                nodeType="root"
              >
                {Object.entries(data.hospitalCodes).map(([code, hId]) => (
                  <DbTreeNode
                    key={code}
                    label={code}
                    path={`/hospitalCodes/${code}`}
                    depth={2}
                    isExpandable={false}
                    valuePreview={`: "${hId}"`}
                    nodeType="leaf"
                  />
                ))}
              </DbTreeNode>

              {/* 3. /users */}
              <DbTreeNode
                label="users"
                path="/users"
                count={data.usersCount}
                badge="privacy"
                depth={1}
                isExpandable={false}
                nodeType="root"
              />

              {/* 4. /devConsole */}
              <DbTreeNode
                label="devConsole"
                path="/devConsole"
                badge="dev-only"
                depth={1}
                isExpandable={true}
                isExpanded={isExpanded('/devConsole')}
                onToggle={() => togglePath('/devConsole')}
                nodeType="root"
              >
                <DbTreeNode
                  label="featureFlags"
                  path="/devConsole/featureFlags"
                  count={data.featureFlagsCount}
                  depth={2}
                  isExpandable={true}
                  isExpanded={isExpanded('/devConsole/featureFlags')}
                  onToggle={() => togglePath('/devConsole/featureFlags')}
                  nodeType="subcollection"
                >
                  {data.featureFlags.map((flag) => (
                    <div
                      key={flag.key}
                      style={{ paddingLeft: '48px' }}
                      className="py-1 px-2 flex items-center gap-2 hover:bg-slate-50 rounded"
                    >
                      <span className="text-slate-600 font-mono">{flag.key}:</span>
                      <span
                        className={
                          flag.enabled ? 'text-emerald-700 font-semibold font-mono' : 'text-rose-600 font-mono'
                        }
                      >
                        enabled={flag.enabled ? 'true' : 'false'}
                      </span>
                      <span className="text-slate-400 font-mono">
                        visible={flag.visible ? 'true' : 'false'}
                      </span>
                    </div>
                  ))}
                </DbTreeNode>
              </DbTreeNode>
            </DbTreeNode>
          </div>
        )}
      </div>

      {/* Summary Stats Panel */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-xs">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100 pb-2">
          Database Aggregates &amp; Snapshot Info
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Total Tenants:</span>
            <span className="text-slate-900 font-semibold font-mono">{totalTenants}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Total Patients:</span>
            <span className="text-slate-900 font-semibold font-mono">{totalPatients}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Total Staff:</span>
            <span className="text-slate-900 font-semibold font-mono">{totalStaff}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Total Documents:</span>
            <span className="text-slate-900 font-semibold font-mono">{totalDocuments}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Total Prescriptions:</span>
            <span className="text-slate-900 font-semibold font-mono">{totalPrescriptions}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Total Audit Logs:</span>
            <span className="text-slate-900 font-semibold font-mono">{totalAuditLogs}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Total Corrections:</span>
            <span className="text-slate-900 font-semibold font-mono">{totalCorrections}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Database fetched at:</span>
            <span className="text-slate-900 font-semibold font-mono">{data.fetchedAt || '—'}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 pt-1">
          Data is fetched on page load and on manual refresh. Not a live stream.
        </p>
      </div>
    </div>
  )
}
