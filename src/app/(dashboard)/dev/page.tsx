'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DevFeature {
  name: string
  description: string
  status: 'In Development' | 'Ready to Promote' | 'Promoted'
  targetModule: string
  href: string
}

const DEV_FEATURES: DevFeature[] = [
  {
    name: 'AI Document Processing',
    description: 'OCR + local LLM extraction from prescription images and PDFs',
    status: 'In Development',
    targetModule: 'Patient Documents',
    href: '/dev/ai-docs',
  },
  {
    name: 'Corrections Feedback',
    description: 'Field-level correction patterns and export for fine-tuning',
    status: 'In Development',
    targetModule: 'AI Pipeline',
    href: '/dev/corrections',
  },
]

function getStatusBadge(status: DevFeature['status']) {
  switch (status) {
    case 'In Development':
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          In Development
        </Badge>
      )
    case 'Ready to Promote':
      return (
        <Badge className="border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          Ready to Promote
        </Badge>
      )
    case 'Promoted':
      return (
        <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Promoted
        </Badge>
      )
  }
}

export default function DevPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Developer Sandbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Features under active development. Promote to production manually after testing.
        </p>
      </div>

      {/* Feature Registry Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Feature</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Target Module</TableHead>
              <TableHead className="text-right font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEV_FEATURES.map((feature) => {
              const isPromoted = feature.status === 'Promoted'

              return (
                <TableRow
                  key={feature.name}
                  className={cn(isPromoted && 'opacity-60')}
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>{feature.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {feature.description}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(feature.status)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {feature.targetModule}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={feature.href}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Open test page <ArrowRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Helper documentation note */}
      <p className="text-xs text-muted-foreground">
        To add a new feature to this list, update <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">DEV_FEATURES</code> in <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">src/app/(dashboard)/dev/page.tsx</code> and create its route under <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">src/app/(dashboard)/dev/[feature]/page.tsx</code>
      </p>
    </div>
  )
}
