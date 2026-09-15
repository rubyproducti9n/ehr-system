'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Unhandled React component error
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[360px] w-full items-center justify-center p-6">
          <div className="flex max-w-md flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReload}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              <Button asChild size="sm">
                <Link href="/">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
