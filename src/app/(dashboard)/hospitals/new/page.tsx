'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle2, Copy, Check, Loader2, ArrowRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { isDeveloper } from '@/lib/devAccess'
import { generateUniqueCode } from '@/lib/hospitalCode'
import { switchHospital } from '@/lib/services/authService'
import { writeActivityLog } from '@/lib/services/activityLogService'
import { validateEmail, validatePhone } from '@/lib/utils'
import { ref, update, set, push } from 'firebase/database'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function NewHospitalPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    currentUser,
    userRole,
    availableHospitals,
    setAvailableHospitals,
    setHospitalId,
    setHospitalCode,
    setHospitalName,
    setUserRole,
    setAppSettings,
    setIsHospitalSwitching,
  } = useAppStore()

  // Access check
  const isAuthorized = userRole === 'super_admin' || isDeveloper(currentUser, userRole)

  // Form State
  const [hospitalName, setHospitalNameInput] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [hospitalEmail, setHospitalEmail] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Success State
  const [createdHospital, setCreatedHospital] = useState<{
    id: string
    code: string
    name: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSwitchingNow, setIsSwitchingNow] = useState(false)

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Access Restricted</CardTitle>
            <CardDescription>
              Only super administrators and developers can register additional hospitals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !currentUser?.uid) return

    setIsSubmitting(true)

    try {
      const newCode = await generateUniqueCode()
      const hospitalsRef = ref(db, 'hospitals')
      const newHospitalRef = push(hospitalsRef)
      const newId = newHospitalRef.key || `hosp_${Date.now()}`
      const now = new Date().toISOString()

      // 1. Add to current user's hospitals map first to satisfy rules
      await update(ref(db, `users/${currentUser.uid}`), {
        [`hospitals/${newId}/role`]: 'super_admin',
        [`hospitals/${newId}/hospitalCode`]: newCode,
        [`hospitals/${newId}/joinedAt`]: now,
      })

      // 2. Create hospital profile, default facility, and staff entry
      await update(ref(db, `hospitals/${newId}`), {
        [`profile/name`]: hospitalName.trim(),
        [`profile/address`]: address.trim(),
        [`profile/phone`]: phone.trim(),
        [`profile/email`]: hospitalEmail.trim().toLowerCase(),
        [`profile/createdAt`]: now,
        [`profile/superAdminUid`]: currentUser.uid,
        [`profile/hospitalCode`]: newCode,
        [`staff/${currentUser.uid}/uid`]: currentUser.uid,
        [`staff/${currentUser.uid}/email`]: currentUser.email || '',
        [`staff/${currentUser.uid}/displayName`]: currentUser.displayName || 'Super Admin',
        [`staff/${currentUser.uid}/role`]: 'super_admin',
        [`staff/${currentUser.uid}/joinedAt`]: now,
        [`staff/${currentUser.uid}/isActive`]: true,
        [`facilities/${newId}_default/id`]: `${newId}_default`,
        [`facilities/${newId}_default/name`]: hospitalName.trim(),
        [`facilities/${newId}_default/address`]: address.trim(),
        [`facilities/${newId}_default/phone`]: phone.trim(),
        [`facilities/${newId}_default/createdAt`]: now,
      })

      // 3. Write hospital code mapping
      await set(ref(db, `hospitalCodes/${newCode}`), newId)

      // 4. Log activity
      await writeActivityLog({
        hospitalId: newId,
        action: 'auth.register_hospital',
        performedBy: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email || 'Super Admin',
          email: currentUser.email || '',
          role: 'super_admin',
        },
        entity: {
          type: 'hospital',
          id: newId,
          label: hospitalName.trim(),
        },
        summary: `Registered additional hospital "${hospitalName.trim()}" (Code: ${newCode})`,
      })

      // 5. Update availableHospitals in Zustand
      const updatedAvailable = [
        ...availableHospitals,
        {
          hospitalId: newId,
          hospitalCode: newCode,
          role: 'super_admin',
        },
      ]
      setAvailableHospitals(updatedAvailable)

      setCreatedHospital({
        id: newId,
        code: newCode,
        name: hospitalName.trim(),
      })

      toast({
        title: 'Hospital created',
        description: `${hospitalName.trim()} has been registered successfully.`,
      })
    } catch (err: any) {
      console.error('Failed to create hospital:', err)
      toast({
        title: 'Registration failed',
        description: err.message || 'Could not register hospital. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = async () => {
    if (!createdHospital?.code) return
    try {
      await navigator.clipboard.writeText(createdHospital.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleSwitchToNew = async () => {
    if (!createdHospital || !currentUser?.uid) return
    setIsSwitchingNow(true)
    setIsHospitalSwitching(true)

    try {
      await switchHospital(currentUser.uid, createdHospital.id, createdHospital.code)
      setHospitalId(createdHospital.id)
      setHospitalCode(createdHospital.code)
      setHospitalName(createdHospital.name)
      setUserRole('super_admin')
      setAppSettings(null)

      setTimeout(() => {
        setIsHospitalSwitching(false)
        router.push('/')
      }, 500)
    } catch (err) {
      console.error('Failed to switch to new hospital:', err)
      setIsSwitchingNow(false)
      setIsHospitalSwitching(false)
    }
  }

  // Success view
  if (createdHospital) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <Card className="border-emerald-200 dark:border-emerald-900 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Hospital Registered Successfully</CardTitle>
            <CardDescription>
              {createdHospital.name} is ready for clinical and administrative operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="rounded-lg bg-muted/60 p-4 border text-center space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Hospital Code
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-widest text-primary">
                  {createdHospital.code}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={handleCopyCode}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Share this code with staff members for self-registration under this hospital.
              </p>
            </div>

            <div className="rounded-lg border p-4 bg-card space-y-3">
              <p className="text-sm font-medium text-foreground">
                Switch to this hospital now?
              </p>
              <p className="text-xs text-muted-foreground">
                You can switch between your hospitals at any time using the hospital switcher in the sidebar.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSwitchToNew}
                  disabled={isSwitchingNow}
                  className="gap-2 flex-1"
                >
                  {isSwitchingNow ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Yes, switch now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  disabled={isSwitchingNow}
                  className="flex-1"
                >
                  Stay in current hospital
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Registration Form
  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Add Another Hospital</CardTitle>
          </div>
          <CardDescription>
            Register a new hospital branch or organization under your super admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="hospitalName">Hospital / Facility Name *</Label>
              <Input
                id="hospitalName"
                placeholder="e.g. City General Hospital - East Wing"
                value={hospitalName}
                onChange={(e) => setHospitalNameInput(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.hospitalName && (
                <p className="text-xs text-destructive">{errors.hospitalName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="e.g. 456 Healthcare Blvd, Suite 100, City, State, ZIP"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="e.g. +1 (555) 012-3456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hospitalEmail">Official Email *</Label>
                <Input
                  id="hospitalEmail"
                  type="email"
                  placeholder="e.g. contact@citygeneral.com"
                  value={hospitalEmail}
                  onChange={(e) => setHospitalEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.hospitalEmail && (
                  <p className="text-xs text-destructive">{errors.hospitalEmail}</p>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    Register Hospital
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
