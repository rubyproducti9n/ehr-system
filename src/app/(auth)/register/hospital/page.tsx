'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Copy, Check, Loader2, Hospital } from 'lucide-react'
import { registerHospital } from '@/lib/services/authService'
import { validateEmail, validatePhone } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterHospitalPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Form State
  const [hospitalName, setHospitalName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [hospitalEmail, setHospitalEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Success state
  const [registeredCode, setRegisteredCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const validate = () => {
    const errs: Record<string, string> = {}

    if (!hospitalName.trim() || hospitalName.trim().length < 2) {
      errs.hospitalName = 'Hospital name must be at least 2 characters'
    }
    if (!address.trim()) {
      errs.address = 'Hospital address is required'
    }
    const phoneErr = validatePhone(phone)
    if (phoneErr) {
      errs.phone = phoneErr
    }
    const hospEmailErr = validateEmail(hospitalEmail)
    if (hospEmailErr) {
      errs.hospitalEmail = hospEmailErr
    }
    if (!adminName.trim() || adminName.trim().length < 2) {
      errs.adminName = 'Administrator full name is required'
    }
    const adminEmailErr = validateEmail(adminEmail)
    if (adminEmailErr) {
      errs.adminEmail = adminEmailErr
    }
    if (!adminPassword || adminPassword.length < 8) {
      errs.adminPassword = 'Password must be at least 8 characters'
    }
    if (adminPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const result = await registerHospital({
        hospitalName: hospitalName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        hospitalEmail: hospitalEmail.trim().toLowerCase(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPassword,
      })

      setRegisteredCode(result.hospitalCode)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      toast({
        title: 'Registration Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!registeredCode) return
    try {
      await navigator.clipboard.writeText(registeredCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code to clipboard', err)
    }
  }

  if (registeredCode) {
    return (
      <Card className="w-full max-w-xl shadow-xl border-slate-200">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Hospital Registered Successfully
            </h2>
            <p className="text-sm text-muted-foreground">
              Your hospital workspace and administrator account have been created.
            </p>
          </div>

          <div className="space-y-3 bg-muted/60 p-6 rounded-xl border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your Hospital Code
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-bold tracking-widest text-primary">
                {registeredCode}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Share this code with your staff so they can join your hospital.
            </p>
          </div>

          <div className="pt-2">
            <Button
              size="lg"
              className="w-full font-semibold"
              onClick={() => router.push('/login')}
            >
              Go to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl border-slate-200">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
            <Hospital className="h-4 w-4" /> Hospital Setup
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Register Your Hospital
        </CardTitle>
        <CardDescription>
          Create a new clinical organization and setup the primary administrator account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Hospital Info */}
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-sm font-semibold text-foreground">
                1. Hospital Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="hospitalName">
                  Hospital Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hospitalName"
                  placeholder="e.g. City Care Multispeciality Hospital"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.hospitalName && (
                  <p className="text-xs text-destructive">{errors.hospitalName}</p>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="address">
                  Hospital Address <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="address"
                  rows={2}
                  placeholder="Street, City, State, PIN"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isSubmitting}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 022-28471234 or 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hospitalEmail">
                  Hospital Contact Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hospitalEmail"
                  type="email"
                  placeholder="contact@citycare.com"
                  value={hospitalEmail}
                  onChange={(e) => setHospitalEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.hospitalEmail && (
                  <p className="text-xs text-destructive">{errors.hospitalEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Admin Info */}
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-sm font-semibold text-foreground">
                2. Administrator Account
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="adminName">
                  Admin Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminName"
                  placeholder="Dr. Rajesh Sharma"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.adminName && (
                  <p className="text-xs text-destructive">{errors.adminName}</p>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="adminEmail">
                  Admin Email (Login ID) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@citycare.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.adminEmail && (
                  <p className="text-xs text-destructive">{errors.adminEmail}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminPassword">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Min 8 characters"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.adminPassword && (
                  <p className="text-xs text-destructive">{errors.adminPassword}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering Hospital...
              </>
            ) : (
              'Register Hospital'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
