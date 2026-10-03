'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
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

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const userRole = useAppStore((state) => state.userRole)
  const isSuperAdminOrDev = userRole === 'super_admin' || userRole === 'dev'
  const [query, setQuery] = useState('')
  const { results, isEmpty } = useSearch(query)

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  const patientResults = results.filter((r) => r.type === 'patient')
  const providerResults = isSuperAdminOrDev ? results.filter((r) => r.type === 'provider') : []
  const facilityResults = isSuperAdminOrDev ? results.filter((r) => r.type === 'facility') : []

  const showInitialPrompt = query.trim().length < 2

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search patients, providers, hospitals..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {showInitialPrompt ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Universal Search
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Start typing to search patients, providers, and hospitals across the platform.
            </p>
          </div>
        ) : isEmpty ? (
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
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {item.sublabel}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                      Patient
                    </Badge>
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
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {item.sublabel}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                      Provider
                    </Badge>
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
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {item.sublabel}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                      Hospital
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
