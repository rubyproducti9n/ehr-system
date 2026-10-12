'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, User, Stethoscope, Building2, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react'
import { useSearch, SearchResult } from '@/hooks/useSearch'
import { Badge } from '@/components/ui/badge'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

import { useAppStore } from '@/store/useAppStore'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFacilities } from '@/hooks/useFacilities'
import { searchFrontend, FrontendSearchResult } from '@/lib/frontendSearch'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const userRole = useAppStore((state) => state.userRole)
  const isSuperAdminOrDev = userRole === 'super_admin' || userRole === 'dev'
  const [query, setQuery] = useState('')
  const [instantResults, setInstantResults] = useState<FrontendSearchResult[]>([])

  const { patients } = usePatients()
  const { providers } = useProviders()
  const { facilities } = useFacilities()

  const { results, status, statusMessage, isEmpty, usedBackend, search } = useSearch()

  useEffect(() => {
    // Frontend search — run immediately
    if (query.trim().length >= 2) {
      const frontendOnly = searchFrontend(query, patients ?? [], providers ?? [], facilities ?? [])
      if (frontendOnly.length > 0) {
        // Show frontend results immediately
        setInstantResults(frontendOnly)
      } else {
        setInstantResults([])
      }
    } else {
      setInstantResults([])
    }

    // Full search (with backend if needed) — debounced
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        search(query)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query, search, patients, providers, facilities])

  // Reset query and instantResults when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setInstantResults([])
    }
  }, [open])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  // Display results: use hook results if available/done, otherwise fall back to instantResults while pending
  const displayResults: (SearchResult | FrontendSearchResult)[] =
    results.length > 0 ? results : instantResults

  const patientResults = displayResults.filter((r) => r.type === 'patient')
  const providerResults = isSuperAdminOrDev ? displayResults.filter((r) => r.type === 'provider') : []
  const facilityResults = isSuperAdminOrDev ? displayResults.filter((r) => r.type === 'facility') : []

  const showInitialPrompt = query.trim().length < 2

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search patients, providers, hospitals..."
        value={query}
        onValueChange={setQuery}
      />

      {status === 'searching-frontend' && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
          Searching...
        </div>
      )}
      {status === 'searching-backend' && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          {statusMessage}
        </div>
      )}

      {usedBackend && status === 'done' && results.length > 0 && (
        <div className="px-3 py-1 text-xs text-muted-foreground border-b flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Includes smart matches
        </div>
      )}

      <CommandList>
        {status === 'offline' ? (
          <div className="p-4 m-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium">Smart search is currently unavailable</p>
              <p className="text-muted-foreground mt-0.5">Basic name search is still available.</p>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="p-4 m-3 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-200 flex items-start gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-medium">Search is currently unavailable</p>
              <p className="text-muted-foreground mt-0.5">{statusMessage || 'Please try again later.'}</p>
            </div>
          </div>
        ) : showInitialPrompt ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Universal Semantic Search
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Start typing to search patients, providers, and hospitals semantically across records.
            </p>
          </div>
        ) : status === 'searching-frontend' && displayResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Searching records...</p>
          </div>
        ) : status === 'searching-backend' && displayResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Searching records...</p>
          </div>
        ) : isEmpty && instantResults.length === 0 ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : (
          <>
            {patientResults.length > 0 && (
              <CommandGroup heading="Patients">
                {patientResults.map((item) => (
                  <CommandItem
                    key={`patient-${item.id}`}
                    value={`${item.label} ${item.sublabel}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center justify-between cursor-pointer py-2.5 px-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight flex items-center gap-1">
                          {item.sublabel}
                          {item.source === 'backend' && (
                            <Sparkles className="h-3 w-3 text-muted-foreground inline shrink-0" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {Math.round(item.score * 100)}%
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                        Patient
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {providerResults.length > 0 && (
              <CommandGroup heading="Providers">
                {providerResults.map((item) => (
                  <CommandItem
                    key={`provider-${item.id}`}
                    value={`${item.label} ${item.sublabel}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center justify-between cursor-pointer py-2.5 px-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight flex items-center gap-1">
                          {item.sublabel}
                          {item.source === 'backend' && (
                            <Sparkles className="h-3 w-3 text-muted-foreground inline shrink-0" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {Math.round(item.score * 100)}%
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                        Provider
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {facilityResults.length > 0 && (
              <CommandGroup heading="Hospitals">
                {facilityResults.map((item) => (
                  <CommandItem
                    key={`facility-${item.id}`}
                    value={`${item.label} ${item.sublabel}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center justify-between cursor-pointer py-2.5 px-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight flex items-center gap-1">
                          {item.sublabel}
                          {item.source === 'backend' && (
                            <Sparkles className="h-3 w-3 text-muted-foreground inline shrink-0" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {Math.round(item.score * 100)}%
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                        Hospital
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {status === 'searching-backend' && displayResults.length > 0 && (
              <div className="py-2.5 px-3 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Searching records for more results...</span>
              </div>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
