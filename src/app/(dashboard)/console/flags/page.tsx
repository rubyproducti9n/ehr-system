'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Sliders,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { updateFlag, seedDefaultFlags } from '@/lib/services/featureFlagService'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { FeatureFlag } from '@/types'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

type CategoryFilter = 'all' | 'ai' | 'clinical' | 'admin' | 'dev' | 'experimental'

const CATEGORY_COLORS: Record<FeatureFlag['category'], { badge: string; text: string; bg: string }> = {
  ai: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    bg: 'bg-purple-50',
  },
  clinical: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  admin: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  dev: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'text-amber-800',
    bg: 'bg-amber-50',
  },
  experimental: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
  },
}

export default function FeatureFlagsPage() {
  const { flagsList, loading } = useFeatureFlags()
  const currentUser = useAppStore((state) => state.currentUser)
  const { toast } = useToast()

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)

  // Auto-seed if empty once loaded
  useEffect(() => {
    if (!loading && flagsList.length === 0) {
      const autoSeed = async () => {
        try {
          setIsSeeding(true)
          await seedDefaultFlags(
            undefined,
            currentUser?.displayName || currentUser?.email || 'developer'
          )
          toast({
            title: 'Default flags initialized',
            description: 'Feature flags seeded successfully.',
          })
        } catch (err) {
          console.error('Failed to auto-seed feature flags:', err)
        } finally {
          setIsSeeding(false)
        }
      }
      autoSeed()
    }
  }, [loading, flagsList.length, currentUser, toast])

  const handleManualSeed = async () => {
    try {
      setIsSeeding(true)
      await seedDefaultFlags(
        undefined,
        currentUser?.displayName || currentUser?.email || 'developer'
      )
      toast({
        title: 'Feature flags reset',
        description: 'Default feature flags applied successfully.',
      })
    } catch (err) {
      toast({
        title: 'Seeding failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleToggle = async (
    flag: FeatureFlag,
    field: 'enabled' | 'visible',
    newValue: boolean
  ) => {
    const updatingIdentifier = `${flag.key}-${field}`
    setUpdatingKey(updatingIdentifier)
    try {
      await updateFlag(
        flag.key,
        { [field]: newValue },
        currentUser?.displayName || currentUser?.email || 'developer'
      )
      toast({
        title: `Flag updated: ${flag.label}`,
        description: `${field === 'enabled' ? 'Enabled state' : 'Visibility'} changed to ${
          newValue ? 'true' : 'false'
        }.`,
      })
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update feature flag',
        variant: 'destructive',
      })
    } finally {
      setUpdatingKey(null)
    }
  }

  // Category counts
  const counts = useMemo(() => {
    const map: Record<CategoryFilter, number> = {
      all: flagsList.length,
      ai: 0,
      clinical: 0,
      admin: 0,
      dev: 0,
      experimental: 0,
    }
    flagsList.forEach((f) => {
      if (f.category in map) {
        map[f.category as CategoryFilter]++
      }
    })
    return map
  }, [flagsList])

  // Filtered list
  const filteredFlags = useMemo(() => {
    if (activeCategory === 'all') return flagsList
    return flagsList.filter((f) => f.category === activeCategory)
  }, [flagsList, activeCategory])

  return (
    <div className="min-h-full bg-slate-50 p-6 text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Sliders className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Feature Flags &amp; Toggles
            </h1>
            <Badge variant="outline" className="bg-white text-slate-700 text-[10px] font-mono border-slate-200">
              {flagsList.length} FLAGS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Control platform capabilities and visibility across all hospital tenants in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSeed}
            disabled={isSeeding || loading}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium gap-1.5 shadow-xs"
          >
            {isSeeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            )}
            Re-seed Defaults
          </Button>
        </div>
      </div>

      {/* Warning Callout */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-amber-900">
            Platform-Wide Operational Warning
          </p>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Feature flags take effect immediately across all hospital tenants. Disabling or hiding a
            feature impacts all users in real time.
          </p>
        </div>
      </div>

      {/* Category Tabs / Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'ai', label: 'AI & Inference' },
            { id: 'clinical', label: 'Clinical' },
            { id: 'admin', label: 'Administration' },
            { id: 'dev', label: 'Developer' },
            { id: 'experimental', label: 'Experimental' },
          ] as { id: CategoryFilter; label: string }[]
        ).map((tab) => {
          const isActive = activeCategory === tab.id
          const count = counts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Flags Table / List */}
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 bg-slate-200" />
                  <Skeleton className="h-3 w-80 bg-slate-200" />
                </div>
                <div className="flex items-center gap-6">
                  <Skeleton className="h-6 w-16 bg-slate-200" />
                  <Skeleton className="h-6 w-10 bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Sliders className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">No feature flags found in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFlags.map((flag) => {
              const catColor = CATEGORY_COLORS[flag.category] || CATEGORY_COLORS.experimental
              const isEnabledUpdating = updatingKey === `${flag.key}-enabled`
              const isVisibleUpdating = updatingKey === `${flag.key}-visible`

              return (
                <div
                  key={flag.key}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left info */}
                  <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {flag.label}
                      </span>
                      <code className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {flag.key}
                      </code>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.2 ${catColor.badge}`}
                      >
                        {flag.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                      {flag.description}
                    </p>

                    {flag.updatedAt && (
                      <div className="text-[11px] text-slate-400 pt-0.5">
                        Last changed {formatDate(flag.updatedAt)} by{' '}
                        <span className="text-slate-600 font-medium">{flag.updatedBy || 'developer'}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-6 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Enabled Toggle */}
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-xs font-semibold block text-slate-700">
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Logic gate
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        {isEnabledUpdating && (
                          <Loader2 className="absolute -left-5 h-3.5 w-3.5 animate-spin text-indigo-600" />
                        )}
                        <Switch
                          checked={flag.enabled}
                          disabled={isEnabledUpdating}
                          onCheckedChange={(val) => handleToggle(flag, 'enabled', val)}
                        />
                      </div>
                    </div>

                    {/* Visible Toggle */}
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-xs font-semibold block text-slate-700">
                          {flag.visible ? 'Visible' : 'Hidden'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          UI element
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        {isVisibleUpdating && (
                          <Loader2 className="absolute -left-5 h-3.5 w-3.5 animate-spin text-indigo-600" />
                        )}
                        <Switch
                          checked={flag.visible}
                          disabled={isVisibleUpdating}
                          onCheckedChange={(val) => handleToggle(flag, 'visible', val)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
