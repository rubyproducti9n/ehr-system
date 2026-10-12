'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FolderLock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  Sparkles,
  Sliders,
  Cpu,
  Building2,
  Copy,
  Check,
  Edit,
  KeyRound,
  Trash2,
  XCircle,
  Server,
  Radio,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  getStorageLocation,
  setStorageLocation,
  setExtractionMode,
  setAiModel,
  setBackendUrl,
  setTranscriptionUrl,
} from '@/lib/services/settingsService'
import { writeActivityLog, buildPerformedBy } from '@/lib/services/activityLogService'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { isDeveloper } from '@/lib/devAccess'
import { useGeminiStatus } from '@/hooks/useGeminiStatus'
import { useTranscriptionStatus } from '@/hooks/useTranscriptionStatus'
import { db } from '@/lib/firebase'
import { ref, get, update } from 'firebase/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface HardwareInfo {
  cpu_name?: string | null
  cpu_cores?: number | null
  is_cpu_supported?: boolean
  total_ram_gb?: number | null
  avail_ram_gb?: number | null
  is_ram_supported?: boolean
  gpu_detected?: boolean
  gpu_name?: string | null
  gpu_vram_gb?: number | null
  is_vram_supported?: boolean
  has_local_model?: boolean
  is_supported?: boolean
  is_ready?: boolean
  missing_requirements?: string[]
  recommendation_reason?: string
}

interface SystemInfo {
  default_documents_path?: string
  project_docs_path?: string
  username?: string
  platform?: string
  hardware?: HardwareInfo
}

interface HospitalProfileData {
  name?: string
  address?: string
  phone?: string
  email?: string
  createdAt?: string
  hospitalCode?: string
}

const AVAILABLE_AI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', tag: 'Fast & Recommended', desc: 'Ultra-fast multimodal model optimized for medical documents' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', tag: 'Hybrid Reasoning', desc: 'Advanced reasoning and high-fidelity prescription recognition' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', tag: 'Balanced', desc: 'Stable multimodal extraction for medical forms and lab results' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', tag: 'Lightweight', desc: 'High-throughput lightweight model for fast document scans' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', tag: 'Fast Vision', desc: 'Optimized fast vision extraction for clear prescriptions' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'High Capacity', desc: 'Standard production vision model with wide context support' },
]

export default function SettingsPage() {
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const hospitalId = useAppStore((state) => state.hospitalId)
  const hospitalName = useAppStore((state) => state.hospitalName)
  const hospitalCode = useAppStore((state) => state.hospitalCode)
  const setHospitalName = useAppStore((state) => state.setHospitalName)
  const appSettings = useAppStore((state) => state.appSettings)
  const isFeatureVisible = useAppStore((state) => state.isFeatureVisible)
  const isFeatureEnabled = useAppStore((state) => state.isFeatureEnabled)
  const { toast } = useToast()

  const showLocalAi = isFeatureVisible('local_ai_extraction')
  const showGeminiOnline = isFeatureVisible('gemini_online_extraction')

  const developer = isDeveloper(currentUser?.email, userRole)
  const gemini = useGeminiStatus(currentUser?.email, userRole, hospitalId)
  const liveTranscriptionStatus = useTranscriptionStatus()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingMode, setSavingMode] = useState(false)
  const [savingModel, setSavingModel] = useState(false)
  const [detectedPath, setDetectedPath] = useState<string | null>(null)
  const [backendOffline, setBackendOffline] = useState(false)
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null)
  const [storagePathInput, setStoragePathInput] = useState<string>('')

  // AI Server Connection (Document AI & Transcription)
  const [backendUrlInput, setBackendUrlInput] = useState('')
  const [transcriptionUrlInput, setTranscriptionUrlInput] = useState('')
  const [savingBackendUrl, setSavingBackendUrl] = useState(false)
  const [savingTranscriptionUrl, setSavingTranscriptionUrl] = useState(false)
  const [testingBackend, setTestingBackend] = useState(false)
  const [testingTranscription, setTestingTranscription] = useState(false)
  const [backendTestStatus, setBackendTestStatus] = useState<{ connected: boolean; message: string } | null>(null)
  const [transcriptionTestStatus, setTranscriptionTestStatus] = useState<{ connected: boolean; message: string } | null>(null)
  const [tunnelHelpOpen, setTunnelHelpOpen] = useState(false)

  // AI Key state
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [clearingKey, setClearingKey] = useState(false)

  // Hospital profile state
  const [profile, setProfile] = useState<HospitalProfileData | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const currentMode = appSettings?.extractionMode ?? null

  const handleModelChange = async (modelId: string) => {
    if (!hospitalId) return
    setSavingModel(true)
    try {
      await setAiModel(hospitalId, modelId)
      toast({
        title: 'AI model updated',
        description: `Document analysis model set to ${modelId}.`,
      })
    } catch (err) {
      toast({
        title: 'Failed to update AI model',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingModel(false)
    }
  }

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = apiKeyInput.trim()
    if (!trimmed) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid API key.',
        variant: 'destructive',
      })
      return
    }

    if (!currentUser?.email) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to update configuration.',
        variant: 'destructive',
      })
      return
    }

    setSavingKey(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-email': currentUser.email,
        'x-hospital-id': hospitalId ?? '',
      }
      if (userRole) {
        headers['x-user-role'] = userRole
      }

      const res = await fetch('/api/settings/ai-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ api_key: trimmed }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to save API key')
      }

      setApiKeyInput('')
      setIsEditingKey(false)
      await gemini.refetch?.()
      toast({
        title: 'API key saved',
        description: 'AI service key configured successfully.',
      })
    } catch (err) {
      toast({
        title: 'Failed to configure API key',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingKey(false)
    }
  }

  const handleClearKey = async () => {
    if (!currentUser?.email) return

    setClearingKey(true)
    try {
      const headers: Record<string, string> = {
        'x-user-email': currentUser.email,
        'x-hospital-id': hospitalId ?? '',
      }
      if (userRole) {
        headers['x-user-role'] = userRole
      }

      const res = await fetch('/api/settings/ai-key', {
        method: 'DELETE',
        headers,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to clear API key')
      }

      setIsEditingKey(false)
      await gemini.refetch?.()
      toast({
        title: 'API key removed',
        description: 'The API key has been cleared.',
      })
    } catch (err) {
      toast({
        title: 'Failed to remove API key',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setClearingKey(false)
    }
  }

  const handleSaveBackendUrl = async () => {
    if (!hospitalId || !currentUser?.email) return
    const trimmed = backendUrlInput.trim()
    if (trimmed && !trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
      toast({
        title: 'Invalid URL',
        description: 'Backend URL must start with https:// or http://',
        variant: 'destructive',
      })
      return
    }
    setSavingBackendUrl(true)
    try {
      await setBackendUrl(hospitalId, trimmed, currentUser.email)
      toast({
        title: 'Backend URL saved',
        description: trimmed ? `FastAPI backend set to ${trimmed}` : 'Reset to default (http://127.0.0.1:8765)',
      })
    } catch (err) {
      toast({
        title: 'Failed to save backend URL',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingBackendUrl(false)
    }
  }

  const handleClearBackendUrl = async () => {
    if (!hospitalId || !currentUser?.email) return
    setSavingBackendUrl(true)
    try {
      await setBackendUrl(hospitalId, '', currentUser.email)
      setBackendUrlInput('')
      toast({
        title: 'Backend URL cleared',
        description: 'Reset to default local URL (http://127.0.0.1:8765)',
      })
    } catch (err) {
      toast({
        title: 'Failed to clear backend URL',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingBackendUrl(false)
    }
  }

  const handleTestBackend = async () => {
    setTestingBackend(true)
    setBackendTestStatus(null)
    try {
      const res = await fetch('/api/dev/llm?mode=health', {
        headers: {
          'x-user-email': currentUser?.email ?? '',
          'x-hospital-id': hospitalId ?? '',
        }
      })
      const data = await res.json()
      if (res.ok && (data.status === 'ok' || data.loaded !== undefined || data.status === 'ready')) {
        setBackendTestStatus({
          connected: true,
          message: 'Connection successful'
        })
      } else {
        setBackendTestStatus({
          connected: false,
          message: 'Could not connect — check that the service is running on this device'
        })
      }
    } catch (err) {
      setBackendTestStatus({
        connected: false,
        message: 'Could not connect — check that the service is running on this device'
      })
    } finally {
      setTestingBackend(false)
    }
  }

  const handleSaveTranscriptionUrl = async () => {
    if (!hospitalId || !currentUser?.email) return
    const trimmed = transcriptionUrlInput.trim()
    if (trimmed && !trimmed.startsWith('wss://') && !trimmed.startsWith('ws://')) {
      toast({
        title: 'Invalid URL',
        description: 'Transcription URL must start with wss:// or ws://',
        variant: 'destructive',
      })
      return
    }
    setSavingTranscriptionUrl(true)
    try {
      await setTranscriptionUrl(hospitalId, trimmed, currentUser.email)
      toast({
        title: 'Transcription URL saved',
        description: trimmed ? `Transcription WebSocket set to ${trimmed}` : 'Reset to default (ws://127.0.0.1:8000)',
      })
    } catch (err) {
      toast({
        title: 'Failed to save transcription URL',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingTranscriptionUrl(false)
    }
  }

  const handleClearTranscriptionUrl = async () => {
    if (!hospitalId || !currentUser?.email) return
    setSavingTranscriptionUrl(true)
    try {
      await setTranscriptionUrl(hospitalId, '', currentUser.email)
      setTranscriptionUrlInput('')
      toast({
        title: 'Transcription URL cleared',
        description: 'Reset to default local URL (ws://127.0.0.1:8000)',
      })
    } catch (err) {
      toast({
        title: 'Failed to clear transcription URL',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingTranscriptionUrl(false)
    }
  }

  const handleTestTranscription = async () => {
    setTestingTranscription(true)
    setTranscriptionTestStatus(null)

    try {
      const res = await fetch('/api/transcription/status', {
        headers: {
          'x-user-email': currentUser?.email ?? '',
          'x-hospital-id': hospitalId ?? '',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json()
      if (res.ok && data.status === 'online') {
        setTranscriptionTestStatus({
          connected: true,
          message: 'Connection successful',
        })
      } else {
        // Direct WebSocket connectivity check fallback
        const wsUrl = transcriptionUrlInput.trim() || appSettings?.transcriptionUrl || 'ws://127.0.0.1:8000'
        const ws = new WebSocket(wsUrl)
        let timedOut = false
        const timer = setTimeout(() => {
          timedOut = true
          try { ws.close() } catch {}
          setTestingTranscription(false)
          setTranscriptionTestStatus({
            connected: false,
            message: 'Could not connect — check that the service is running on this device',
          })
        }, 4000)

        ws.onopen = () => {
          if (!timedOut) {
            clearTimeout(timer)
            setTestingTranscription(false)
            setTranscriptionTestStatus({
              connected: true,
              message: 'Connection successful',
            })
            try { ws.close() } catch {}
          }
        }

        ws.onerror = () => {
          if (!timedOut) {
            clearTimeout(timer)
            setTestingTranscription(false)
            setTranscriptionTestStatus({
              connected: false,
              message: 'Could not connect — check that the service is running on this device',
            })
          }
        }
        return
      }
    } catch (err) {
      setTranscriptionTestStatus({
        connected: false,
        message: 'Could not connect — check that the service is running on this device',
      })
    } finally {
      setTestingTranscription(false)
    }
  }

  useEffect(() => {
    if (appSettings?.backendUrl !== undefined) {
      setBackendUrlInput(appSettings.backendUrl || '')
    }
    if (appSettings?.transcriptionUrl !== undefined) {
      setTranscriptionUrlInput(appSettings.transcriptionUrl || '')
    }
  }, [appSettings?.backendUrl, appSettings?.transcriptionUrl])

  const handleModeChange = async (mode: 'online' | 'offline') => {
    if (!hospitalId) return
    setSavingMode(true)
    try {
      await setExtractionMode(hospitalId, mode)

      if (currentUser && userRole) {
        await writeActivityLog({
          hospitalId,
          action: 'settings.update',
          performedBy: buildPerformedBy(currentUser, userRole),
          entity: { type: 'settings', id: hospitalId, label: 'Extraction Mode' },
          summary: `Updated AI extraction mode to ${mode}`,
          metadata: { extractionMode: mode },
        })
      }

      toast({
        title: 'Extraction mode updated',
        description: `Extraction mode updated to ${mode}.`,
      })
    } catch (err) {
      toast({
        title: 'Failed to update mode',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingMode(false)
    }
  }

  const handleCopyCode = () => {
    const code = hospitalCode || profile?.hospitalCode
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
    toast({
      title: 'Copied to clipboard',
      description: `Hospital code ${code} copied.`,
    })
  }

  const handleOpenEditDialog = () => {
    setEditName(profile?.name || hospitalName || '')
    setEditAddress(profile?.address || '')
    setEditPhone(profile?.phone || '')
    setEditEmail(profile?.email || '')
    setEditDialogOpen(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hospitalId) return
    if (!editName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Hospital name is required.',
        variant: 'destructive',
      })
      return
    }

    setSavingProfile(true)
    try {
      await update(ref(db, `hospitals/${hospitalId}/profile`), {
        name: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
      })
      setProfile((prev) => ({
        ...prev,
        name: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
      }))
      setHospitalName(editName.trim())
      setEditDialogOpen(false)
      toast({
        title: 'Hospital profile updated',
        description: 'Hospital details have been saved successfully.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to update profile',
        description: err instanceof Error ? err.message : 'Unknown error occurred.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        if (hospitalId) {
          await getStorageLocation(hospitalId)
          const profSnap = await get(ref(db, `hospitals/${hospitalId}/profile`))
          if (profSnap.exists()) {
            setProfile(profSnap.val())
          }
        }

        const res = await fetch('/api/system-info', {
          headers: {
            'x-hospital-id': hospitalId ?? '',
          },
        })
        const data = await res.json()
        if (res.status === 503 || data.error) {
          setBackendOffline(true)
          setDetectedPath(null)
          setHardwareInfo(data.hardware || null)
        } else {
          setBackendOffline(false)
          const suggested = data.project_docs_path || data.default_documents_path || ''
          setDetectedPath(suggested)
          setStoragePathInput(suggested)
          setHardwareInfo(data.hardware || null)
        }
      } catch (err) {
        console.error('Failed to load settings or system info:', err)
        setBackendOffline(true)
        setDetectedPath(null)
        setHardwareInfo(null)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [hospitalId])

  const handleSetLocation = async () => {
    if (!storagePathInput.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a valid storage path.',
        variant: 'destructive',
      })
      return
    }

    if (!currentUser?.email || !hospitalId) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to configure settings.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const trimmed = storagePathInput.trim()

      const configRes = await fetch('/api/dev/configure-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
          'x-hospital-id': hospitalId ?? '',
        },
        body: JSON.stringify({ path: trimmed }),
      })

      if (!configRes.ok) {
        const err = await configRes.json().catch(() => ({}))
        toast({
          title: 'Storage configuration failed',
          description: err.detail ?? err.error ?? 'Unknown error',
          variant: 'destructive',
        })
        return
      }

      await setStorageLocation(hospitalId, trimmed, currentUser.email)

      if (currentUser && userRole) {
        await writeActivityLog({
          hospitalId,
          action: 'settings.update',
          performedBy: buildPerformedBy(currentUser, userRole),
          entity: { type: 'settings', id: hospitalId, label: 'Storage Location' },
          summary: `Updated document storage location to ${trimmed}`,
          metadata: { storageLocation: trimmed },
        })
      }

      toast({
        title: 'Storage location configured',
        description: 'The document storage path has been permanently locked.',
      })
    } catch (err) {
      toast({
        title: 'Configuration failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isConfigured = Boolean(appSettings?.storageLocation)
  const isLocalOffline = backendOffline || gemini.status === 'offline'
  const isHardwareSupported = !isLocalOffline && Boolean(hardwareInfo?.is_supported)
  const isLocalReady = !isLocalOffline && Boolean(hardwareInfo?.is_ready)
  const localCpuText = hardwareInfo?.cpu_name || (hardwareInfo?.cpu_cores ? `${hardwareInfo.cpu_cores} Cores` : null)
  const localRamText = hardwareInfo?.total_ram_gb ? `${hardwareInfo.total_ram_gb} GB RAM` : null
  const localGpuText = hardwareInfo?.gpu_name ? `${hardwareInfo.gpu_name}${hardwareInfo?.gpu_vram_gb ? ` (${hardwareInfo.gpu_vram_gb} GB VRAM)` : ''}` : null
  const localHardwareSummary = [localCpuText, localRamText, localGpuText].filter(Boolean).join(' • ')

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Application configuration and preferences.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 0: Hospital Profile Card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold">
                    Hospital Profile
                  </CardTitle>
                </div>
                {userRole === 'super_admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEditDialog}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Hospital Info
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Organization details and administrative registration code.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Hospital Name */}
                <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                    Hospital Name
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {profile?.name || hospitalName || '—'}
                  </p>
                </div>

                {/* Hospital Code - Super Admin / Dev only */}
                {(userRole === 'super_admin' || userRole === 'dev') && (
                  <div className="space-y-1 rounded-lg border bg-muted/20 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                        Hospital Code
                      </span>
                      <p className="font-mono text-sm font-bold text-primary">
                        {hospitalCode || profile?.hospitalCode || '—'}
                      </p>
                    </div>
                    {(hospitalCode || profile?.hospitalCode) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                        className="h-7 px-2 text-xs gap-1"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Address */}
                <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                    Address
                  </span>
                  <p className="text-xs text-foreground font-medium">
                    {profile?.address || '—'}
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                    Phone
                  </span>
                  <p className="text-xs text-foreground font-medium font-mono">
                    {profile?.phone || '—'}
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                    Hospital Email
                  </span>
                  <p className="text-xs text-foreground font-medium font-mono">
                    {profile?.email || '—'}
                  </p>
                </div>

                {/* Registered Date */}
                <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                    Registered
                  </span>
                  <p className="text-xs text-foreground font-medium">
                    {profile?.createdAt ? formatDate(profile.createdAt) : '—'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
                This information was used to create your default hospital entry. Edit the hospital entry from the Hospitals page to update location details.
              </p>
            </CardContent>
          </Card>

          {/* Section 1: Document Storage Location */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Document Storage Location
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Document storage directory path used by the platform to store patient files and attachments.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <span>Default project storage location is active and ready.</span>
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Active Storage Path:
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                    <Lock className="h-2.5 w-2.5" /> System Default
                  </span>
                </div>
                <p className="font-mono text-xs font-medium text-foreground break-all bg-background p-2.5 rounded border border-border">
                  {appSettings?.storageLocation || detectedPath || 'backend/patient_docs'}
                </p>
                {appSettings?.storageLocationSetBy && appSettings?.storageLocationSetAt && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Configured on <span className="font-medium text-foreground">{formatDate(appSettings.storageLocationSetAt)}</span>
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Patient files are saved inside the application workspace storage directory.
              </p>
            </CardContent>
          </Card>

          {/* Section 2: Extraction Mode */}
          {(showLocalAi || showGeminiOnline) && (
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold">
                    Extraction Mode
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Choose how patient documents are analysed. Online uses cloud AI for high accuracy. Offline uses on-device local AI.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                <div className={cn(
                  'grid gap-4',
                  showLocalAi && showGeminiOnline ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                )}>
                  {/* Option 1 — Offline (Local AI) */}
                  {showLocalAi && (
                    <div
                      onClick={() => {
                        if (isLocalReady && currentMode !== 'offline' && !savingMode) {
                          handleModeChange('offline')
                        }
                      }}
                      className={cn(
                        'relative flex flex-col justify-between rounded-xl border p-4 transition-all',
                        isLocalReady
                          ? currentMode === 'offline'
                            ? 'border-primary bg-primary/5 cursor-default'
                            : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                          : 'border-border/60 bg-muted/40 opacity-75 cursor-not-allowed select-none'
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cpu className={cn('h-5 w-5', isLocalReady && currentMode === 'offline' ? 'text-primary' : 'text-muted-foreground')} />
                            <span className="text-sm font-semibold text-foreground">Offline (Local AI)</span>
                          </div>
                          {isLocalReady ? (
                            currentMode === 'offline' ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Compatible
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-medium">
                              Not supported on your device
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isLocalReady
                            ? `Runs local AI on-device (${localHardwareSummary}). Zero external network transmission.`
                            : isLocalOffline
                            ? 'Local AI background service is not running on this device.'
                            : !isHardwareSupported
                            ? `Device does not meet minimum specs (Ryzen 7 / i7+, 16GB RAM, 8GB VRAM). Detected: ${localHardwareSummary || 'Insufficient resources'}.`
                            : 'Hardware is capable, but local AI model file (.gguf) is missing from disk.'}
                        </p>
                      </div>
                      <div className="pt-3">
                        {isLocalReady ? (
                          <Badge variant="secondary" className="text-[10px] font-medium text-foreground">
                            {localHardwareSummary ? `Hardware: ${localHardwareSummary}` : 'Ready for on-device inference'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-medium text-amber-800 bg-amber-100/70 dark:bg-amber-950/50 dark:text-amber-300">
                            {isLocalOffline
                              ? 'Local Engine Offline'
                              : !isHardwareSupported
                              ? 'Requires Ryzen 7+, 16GB RAM, 8GB VRAM'
                              : 'Model Weights Missing'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Option 2 — Online */}
                  {showGeminiOnline && (
                    <div
                      onClick={() => {
                        if (currentMode !== 'online' && !savingMode) {
                          handleModeChange('online')
                        }
                      }}
                      className={cn(
                        'relative flex flex-col justify-between rounded-xl border p-4 transition-all',
                        currentMode === 'online' || !currentMode
                          ? 'border-primary bg-primary/5 cursor-default'
                          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className={cn('h-5 w-5', currentMode === 'online' || !currentMode ? 'text-primary' : 'text-muted-foreground')} />
                            <span className="text-sm font-semibold text-foreground">Online (Cloud AI)</span>
                          </div>
                          {(currentMode === 'online' || !currentMode) && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Uses cloud AI document analysis. Requires internet and configured API key. Fast and accurate.
                        </p>
                      </div>
                      <div className="pt-3">
                        <Badge variant="secondary" className="text-[10px] font-medium border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
                          Requires API key
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status / Warning Messages below the cards */}
                {currentMode === 'online' && showGeminiOnline ? (
                  !gemini.configured ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        API key not configured. Online document analysis requires a configured API key below.
                      </span>
                    </div>
                  ) : null
                ) : currentMode === 'offline' && showLocalAi ? (
                  <p className="text-xs text-muted-foreground">
                    Local AI server must be running for offline extraction to work.
                  </p>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Extraction mode not configured. Select a mode to enable document analysis.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section 3: AI Service Configuration */}
          {showGeminiOnline && (
            <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">
                  AI Service Configuration
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Configure the cloud AI service used for document analysis.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              {!gemini.configured || isEditingKey ? (
                /* State 1: Key Not Configured or Editing */
                <div className="space-y-4">
                  {!gemini.configured && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <span>
                        AI service not configured. Enter your Google Gemini API key to enable Cloud AI features.
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleSaveKey} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-api-key" className="text-xs font-semibold">
                        API Key
                      </Label>
                      <Input
                        id="ai-api-key"
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Enter your API key"
                        className="text-xs font-mono"
                        disabled={savingKey}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingKey || !apiKeyInput.trim()}
                        className="text-xs font-semibold"
                      >
                        {savingKey ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>

                      {isEditingKey && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingKey(false)
                            setApiKeyInput('')
                          }}
                          disabled={savingKey}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                /* State 3: Key Configured */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <span>
                      AI service configured and ready
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3.5">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        API Key: <span className="font-mono text-foreground font-semibold">••••••••••••</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingKey(true)
                          setApiKeyInput('')
                        }}
                        disabled={clearingKey}
                        className="text-xs font-medium"
                      >
                        Update Key
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleClearKey}
                        disabled={clearingKey}
                        className="text-xs font-medium gap-1.5"
                      >
                        {clearingKey ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove Key
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Model Selection under API Key container */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold text-foreground block">
                      AI Model
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Choose which Gemini model is used for document analysis.
                    </p>
                  </div>
                  {savingModel && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>Saving...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_AI_MODELS.map((m) => {
                    const isSelected = (appSettings?.aiModel || 'gemini-3.8-flash') === m.id
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (!isSelected && !savingModel) {
                            handleModelChange(m.id)
                          }
                        }}
                        className={cn(
                          'relative flex flex-col justify-between rounded-lg border p-3 text-left transition-all cursor-pointer',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-muted/20'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground">
                            {m.label}
                          </span>
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                              {m.tag}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          {m.desc}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Section 4: AI Server Connection (Document AI & Transcription) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">
                    AI Server Connection
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  Cloudflare Tunnel / Local
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Configure external endpoints for local AI backend (FastAPI) and speech-to-text engine (Sherpa-ONNX) when running EHR Platform on cloud hosting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sub-section 1: FastAPI Backend */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-semibold text-foreground">
                      Document AI Backend (FastAPI)
                    </Label>
                  </div>
                  {appSettings?.backendUrl ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white font-mono">
                      Connected and ready
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-muted-foreground font-mono">
                      Not connected — features requiring the local service will be unavailable
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="https://your-tunnel.trycloudflare.com or http://127.0.0.1:8765"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    className="text-xs font-mono flex-1"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={handleSaveBackendUrl}
                      disabled={savingBackendUrl}
                      className="text-xs font-semibold"
                    >
                      {savingBackendUrl ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          Saving
                        </>
                      ) : (
                        'Save URL'
                      )}
                    </Button>
                    {appSettings?.backendUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearBackendUrl}
                        disabled={savingBackendUrl}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Reset to Local
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleTestBackend}
                      disabled={testingBackend}
                      className="text-xs"
                    >
                      {testingBackend ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </Button>
                  </div>
                </div>

                {appSettings?.backendUrl && (
                  <p className="text-[11px] text-muted-foreground">
                    Configured by <span className="font-mono text-foreground">{appSettings.backendUrlSetBy || 'admin'}</span>
                    {appSettings.backendUrlSetAt ? ` on ${formatDate(appSettings.backendUrlSetAt)}` : ''}
                  </p>
                )}

                {backendTestStatus && (
                  <div className={cn(
                    'p-2.5 rounded-md text-xs flex items-center gap-2 border',
                    backendTestStatus.connected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/10 border-destructive/30 text-destructive'
                  )}>
                    {backendTestStatus.connected ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="font-sans">{backendTestStatus.message}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4" />

              {/* Sub-section 2: Sherpa-ONNX Transcription WebSocket */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-semibold text-foreground">
                      Voice Transcription Service
                    </Label>
                    {liveTranscriptionStatus === 'online' && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                        Connected and ready
                      </Badge>
                    )}
                    {liveTranscriptionStatus === 'offline' && (
                      <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/40">
                        Not connected
                      </Badge>
                    )}
                    {liveTranscriptionStatus === 'checking' && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Checking...
                      </Badge>
                    )}
                  </div>
                  {appSettings?.transcriptionUrl ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white font-mono">
                      Connected and ready
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-muted-foreground font-mono">
                      Not connected — features requiring the local service will be unavailable
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="wss://your-tunnel-2.trycloudflare.com or ws://127.0.0.1:8000"
                    value={transcriptionUrlInput}
                    onChange={(e) => setTranscriptionUrlInput(e.target.value)}
                    className="text-xs font-mono flex-1"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={handleSaveTranscriptionUrl}
                      disabled={savingTranscriptionUrl}
                      className="text-xs font-semibold"
                    >
                      {savingTranscriptionUrl ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          Saving
                        </>
                      ) : (
                        'Save URL'
                      )}
                    </Button>
                    {appSettings?.transcriptionUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearTranscriptionUrl}
                        disabled={savingTranscriptionUrl}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Reset to Local
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleTestTranscription}
                      disabled={testingTranscription}
                      className="text-xs"
                    >
                      {testingTranscription ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </Button>
                  </div>
                </div>

                {appSettings?.transcriptionUrl && (
                  <p className="text-[11px] text-muted-foreground">
                    Configured by <span className="font-mono text-foreground">{appSettings.transcriptionUrlSetBy || 'admin'}</span>
                    {appSettings.transcriptionUrlSetAt ? ` on ${formatDate(appSettings.transcriptionUrlSetAt)}` : ''}
                  </p>
                )}

                {transcriptionTestStatus && (
                  <div className={cn(
                    'p-2.5 rounded-md text-xs flex items-center gap-2 border',
                    transcriptionTestStatus.connected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/10 border-destructive/30 text-destructive'
                  )}>
                    {transcriptionTestStatus.connected ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="font-sans">{transcriptionTestStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Sub-section 3: Collapsible Cloudflare Tunnel Guide */}
              <div className="border-t pt-3">
                <button
                  type="button"
                  onClick={() => setTunnelHelpOpen(!tunnelHelpOpen)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-primary" />
                    Cloudflare Tunnel Quick Guide (For Cloud Deployments)
                  </span>
                  {tunnelHelpOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {tunnelHelpOpen && (
                  <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs space-y-2 border border-border text-muted-foreground">
                    <p className="text-foreground font-medium">
                      How to expose your local clinic AI services to Vercel or cloud EHR deployments:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1">
                      <li>
                        <strong className="text-foreground">Install Cloudflared:</strong> Run{' '}
                        <code className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono text-foreground">
                          winget install --id Cloudflare.cloudflared
                        </code>{' '}
                        in PowerShell.
                      </li>
                      <li>
                        <strong className="text-foreground">Start FastAPI Tunnel:</strong> Run{' '}
                        <code className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono text-foreground">
                          cloudflared tunnel --url http://127.0.0.1:8765
                        </code>{' '}
                        and copy the assigned <code className="text-primary font-mono">https://*.trycloudflare.com</code> URL above.
                      </li>
                      <li>
                        <strong className="text-foreground">Start Transcription Tunnel:</strong> Run{' '}
                        <code className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono text-foreground">
                          cloudflared tunnel --url http://127.0.0.1:8000
                        </code>{' '}
                        and paste into Transcription URL using <code className="text-primary font-mono">wss://*.trycloudflare.com</code>.
                      </li>
                      <li>
                        <strong className="text-foreground">Automated Script:</strong> Alternatively, run{' '}
                        <code className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono text-foreground">
                          start-backend-light.bat
                        </code>{' '}
                        which spins up the backend and tunnels in one step.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Future Settings Placeholder */}
          <Card className="border-dashed bg-card/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sliders className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">
                  General Preferences
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground italic">
                More settings coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Hospital Info Dialog (Super Admin only) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Hospital Info</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update organization contact details and official hospital name.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-hosp-name" className="text-xs font-semibold">
                Hospital Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-hosp-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={savingProfile}
                className="text-xs"
                placeholder="e.g. City General Hospital"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-hosp-addr" className="text-xs font-semibold">
                Address
              </Label>
              <Input
                id="edit-hosp-addr"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                disabled={savingProfile}
                className="text-xs"
                placeholder="e.g. 123 Healthcare Ave, City, State"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-hosp-phone" className="text-xs font-semibold">
                  Phone
                </Label>
                <Input
                  id="edit-hosp-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={savingProfile}
                  className="text-xs font-mono"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-hosp-email" className="text-xs font-semibold">
                  Hospital Email
                </Label>
                <Input
                  id="edit-hosp-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={savingProfile}
                  className="text-xs font-mono"
                  placeholder="contact@hospital.org"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(false)}
                disabled={savingProfile}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingProfile || !editName.trim()}
                className="text-xs font-semibold"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
