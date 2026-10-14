'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Activity } from 'lucide-react'
import { loginUser } from '@/lib/services/authService'
import { writeActivityLog } from '@/lib/services/activityLogService'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { auth, db } from '@/lib/firebase'
import { ref, get } from 'firebase/database'
import { setSessionCookie } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()

  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const setHospitalId = useAppStore((state) => state.setHospitalId)
  const setHospitalCode = useAppStore((state) => state.setHospitalCode)
  const setHospitalName = useAppStore((state) => state.setHospitalName)
  const setUserRole = useAppStore((state) => state.setUserRole)
  const setAvailableHospitals = useAppStore((state) => state.setAvailableHospitals)

  const [hospitalCode, setHospitalCodeInput] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [importedProviderName, setImportedProviderName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hospitalCode.trim()) {
      setError('Please enter your hospital code.')
      return
    }
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await loginUser({
        hospitalCode,
        email: email.trim().toLowerCase(),
        password,
        confirmPassword: showConfirmPassword ? confirmPassword : undefined,
      })

      const currentUser = auth.currentUser
      if (currentUser) {
        const token = await currentUser.getIdToken()
        setSessionCookie(token)

        setCurrentUser({
          uid: currentUser.uid,
          email: currentUser.email || email.trim().toLowerCase(),
          displayName: result.displayName,
          role: result.role,
          hospitalId: result.hospitalId,
          hospitalCode: result.hospitalCode,
        })
      }

      setHospitalId(result.hospitalId)
      setHospitalCode(result.hospitalCode)
      setUserRole(result.role)
      setAvailableHospitals(result.availableHospitals)

      const profileSnap = await get(ref(db, `hospitals/${result.hospitalId}/profile/name`))
      if (profileSnap.exists()) {
        setHospitalName(profileSnap.val())
      }

      if (currentUser) {
        if (showConfirmPassword) {
          await writeActivityLog({
            hospitalId: result.hospitalId,
            action: 'staff.provision',
            performedBy: {
              uid: currentUser.uid,
              displayName: result.displayName || currentUser.email || 'Provider',
              email: currentUser.email || email.trim().toLowerCase(),
              role: result.role,
            },
            entity: {
              type: 'staff',
              id: currentUser.uid,
              label: result.displayName || email,
            },
            summary: `Provisioned Auth account and completed first login for ${result.displayName || email}`,
          })
        }
        await writeActivityLog({
          hospitalId: result.hospitalId,
          action: 'auth.login',
          performedBy: {
            uid: currentUser.uid,
            displayName: result.displayName || currentUser.email || 'User',
            email: currentUser.email || email.trim().toLowerCase(),
            role: result.role,
          },
          entity: {
            type: 'staff',
            id: currentUser.uid,
            label: result.displayName || email,
          },
          summary: `Signed in to portal`,
        })
      }

      router.push('/')
    } catch (err: any) {
      if (err?.code === 'IMPORTED_PROVIDER_NEEDS_CONFIRMATION') {
        setShowConfirmPassword(true)
        setImportedProviderName(err.providerName ?? null)
        setError(null)
      } else {
        const message = err instanceof Error ? err.message : err?.message ?? 'Login failed'
        setError(message)
        toast({
          variant: 'destructive',
          title: 'Login Error',
          description: message,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200">
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div className="w-10" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Sign In
        </CardTitle>
        <CardDescription>
          Enter your account credentials to access your hospital portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="hospitalCode">Hospital Code</Label>
            <Input
              id="hospitalCode"
              placeholder="HOSP-XXXXXX"
              value={hospitalCode}
              onChange={(e) => setHospitalCodeInput(e.target.value.toUpperCase())}
              disabled={isLoading}
              required
              className="font-mono uppercase tracking-wider"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {showConfirmPassword && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Welcome, {importedProviderName ?? 'Doctor'}!</p>
              <p className="text-xs mt-0.5 text-blue-600 dark:text-blue-300">
                Your profile was added by your hospital administrator. Please set a password to activate your account.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {showConfirmPassword ? 'Set Password' : 'Password'}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {showConfirmPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          )}

          <Button type="submit" size="lg" className="w-full font-semibold mt-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {showConfirmPassword ? 'Activating account...' : 'Signing in...'}
              </>
            ) : (
              showConfirmPassword ? 'Activate Account & Sign In' : 'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
