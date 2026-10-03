'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Activity } from 'lucide-react'
import { loginUser } from '@/lib/services/authService'
import { useAppStore } from '@/store/useAppStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { auth } from '@/lib/firebase'
import { setSessionCookie } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()

  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const setHospitalId = useAppStore((state) => state.setHospitalId)
  const setHospitalCode = useAppStore((state) => state.setHospitalCode)
  const setHospitalName = useAppStore((state) => state.setHospitalName)
  const setUserRole = useAppStore((state) => state.setUserRole)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter your email and password.',
      })
      return
    }

    setLoading(true)
    try {
      const result = await loginUser({
        email: email.trim().toLowerCase(),
        password,
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
      setHospitalName(result.hospitalName || '')
      setUserRole(result.role)

      router.push('/')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid credentials. Please try again.'
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: message,
      })
    } finally {
      setLoading(false)
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
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full font-semibold mt-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
