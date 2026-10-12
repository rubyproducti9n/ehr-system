'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Mic,
  Search,
  Dna,
  FileText,
  ShieldCheck,
  Building2,
  Mail,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface LearnMoreFeaturesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CONTACT_EMAILS = 'om.lokhande34@gmail.com, chivater@gmail.com'

const EMAIL_SUBJECT = 'Inquiry to Rent & Activate MyAarogyam EHR Platform'

type DeploymentOptionKey = 'fully-local' | 'cloud-ai-private' | 'fully-offline'

interface DeploymentOptionInfo {
  id: DeploymentOptionKey
  title: string
  badge: string
  shortSummary: string
  longTermExplanation: string
  architecturePoints: string[]
  caution?: string
}

const DEPLOYMENT_OPTIONS: Record<DeploymentOptionKey, DeploymentOptionInfo> = {
  'fully-local': {
    id: 'fully-local',
    title: 'Option 1: Fully Local System (On-Premises AI)',
    badge: 'Recommended for Privacy',
    shortSummary: 'AI models run on your hospital server; cloud database for backup.',
    longTermExplanation:
      'This configuration runs all AI models (live transcription, smart search, OCR extraction, and NER) locally on your hospital\'s hardware without sending any confidential or sensitive patient documents to third-party clouds. The primary database remains securely synchronized to the cloud for automatic backup and multi-device access. Custom on-premises database migration is also available upon request with tailored engineering fees.',
    architecturePoints: [
      'Zero external data transmission for AI processing & document parsing',
      'All inference executed strictly on your local hospital workstation/server',
      'Encrypted cloud database utilized exclusively for offsite failover & backup',
      'Customizable to on-premises database hosting with extra setup fees',
    ],
  },
  'cloud-ai-private': {
    id: 'cloud-ai-private',
    title: 'Option 2: Cloud AI Models with Private Infrastructure',
    badge: 'High Performance',
    shortSummary: 'AI models run on dedicated cloud instances; data never shared beyond AWS.',
    longTermExplanation:
      'AI models run on dedicated, private cloud compute nodes (AWS). Your patient data, documents, and transcripts are never shared with unauthorized third parties or used for public model training. The operational database remains hosted on cloud infrastructure with enterprise uptime, automated scaling, and continuous multi-zone replication.',
    architecturePoints: [
      'High-speed inference on dedicated cloud instances with elastic scaling',
      'Strict zero-retention & non-training enterprise data policy on AWS infrastructure',
      'Centralized cloud database with automated backups and real-time synchronization',
      'Low local hardware requirements for hospital staff terminals',
    ],
  },
  'fully-offline': {
    id: 'fully-offline',
    title: 'Option 3: Fully Air-Gapped & Offline (Models + Database)',
    badge: '100% Isolated',
    shortSummary: 'Completely disconnected from the internet. All models, storage & database on-premises.',
    longTermExplanation:
      'The entire platform operates completely offline inside the hospital’s closed local area network (LAN). Both AI processing and the core database reside strictly on your on-premises servers, requiring no active internet connection.',
    caution:
      'Caution & Compliance Notice: Because this setup is entirely disconnected from managed cloud monitoring, your hospital assumes full technical and operational responsibility for server maintenance, offline data integrity, hardware failover, manual backup routines, and all cybersecurity measures against local network intrusions, unauthorized access, hacking, and data leakage.',
    architecturePoints: [
      'Complete air-gapped isolation with no outbound internet connectivity required',
      'AI compute engines and database records hosted 100% on local hospital hardware',
      'Hospital IT team manages local server security, backups, and network protection',
    ],
  },
}

const getEmailTemplate = (
  optionKey: DeploymentOptionKey,
  hospitalName?: string | null,
  hospitalCode?: string | null
) => {
  const opt = DEPLOYMENT_OPTIONS[optionKey]
  return `Hello MyAarogyam Team,

We are requesting activation and setup for the MyAarogyam EHR Platform.

Selected Architecture Plan:
- Deployment Tier: ${opt.title}
- Summary: ${opt.shortSummary}

Facility Information:
- Hospital / Clinic Name: ${hospitalName || '[Enter Hospital Name]'}
- Hospital Code / ID: ${hospitalCode || '[If registered, enter code]'}
- Contact Person: [Your Name]
- Contact Number: [Your Phone Number]
- Facility City / Location: [City, State]
- Estimated Daily Patient Volume: [e.g. 50-200]
- Preferred Onboarding Timeline: [e.g. Immediate / Next Month]

Please review our deployment request and connect with our administrative team regarding hardware prerequisites, setup procedures, and licensing details.

Thank you!`
}

export function LearnMoreFeaturesDialog({
  open,
  onOpenChange,
}: LearnMoreFeaturesDialogProps) {
  const hospitalName = useAppStore((state) => state.hospitalName)
  const hospitalCode = useAppStore((state) => state.hospitalCode)

  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [selectedOption, setSelectedOption] = useState<DeploymentOptionKey>('fully-local')

  const currentOptionInfo = DEPLOYMENT_OPTIONS[selectedOption]
  const emailBody = getEmailTemplate(selectedOption, hospitalName, hospitalCode)

  const openGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      CONTACT_EMAILS
    )}&su=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(emailBody)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const openOutlook = () => {
    const url = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(
      CONTACT_EMAILS
    )}&subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(
      emailBody
    )}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const openYahoo = () => {
    const url = `https://compose.mail.yahoo.com/?to=${encodeURIComponent(
      CONTACT_EMAILS
    )}&subj=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(
      emailBody
    )}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const openDefaultMail = () => {
    window.location.href = `mailto:${CONTACT_EMAILS}?subject=${encodeURIComponent(
      EMAIL_SUBJECT
    )}&body=${encodeURIComponent(emailBody)}`
  }

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentStep(1)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border bg-background shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 border-b">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground font-lato">
                MyAarogyam EHR Platform
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-medium">
                Hospital Operating System & Practice Management
              </DialogDescription>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            MyAarogyam is a private, enterprise-grade healthcare management suite designed for hospitals, clinics, and multi-specialty centers. All high-speed processing and confidential record pipelines run in a dedicated, secure architecture.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Enterprise Features Included
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Feature 1 */}
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Mic className="h-4 w-4" />
                  <span>Live Audio Transcription</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Real-time medical speech-to-text powered by <code className="text-[11px] bg-muted px-1 rounded">omi-med-stt</code> with sub-second chunking and background noise suppression.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Search className="h-4 w-4" />
                  <span>Semantic Record Search</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Intelligent hospital-scoped vector search using Gemma 2 embeddings & ChromaDB to discover diagnoses, symptoms, and visit histories.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Dna className="h-4 w-4" />
                  <span>GatorTron NER</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Automated entity extraction for drug names, dosages, durations, and medical conditions with confidence-weighted visual badges.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <FileText className="h-4 w-4" />
                  <span>OCR & Document Intelligence</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Ingest scanned prescriptions, lab results, and paper records with automated structured notes extraction.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Building2 className="h-4 w-4" />
                  <span>Provider & Hospital Operations</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Bulk spreadsheet imports (.xlsx/.csv), smart column detection, multi-step duplicate resolution, and real-time scheduling.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Privacy Architecture</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Dedicated storage root ensuring protected health records remain strictly under hospital administrative governance.
                </p>
              </div>
            </div>
          </div>

          {/* 2-Step Activation Form Section */}
          <div className="rounded-xl border border-primary/30 bg-muted/30 p-5 space-y-4">
            {/* Step Indicators */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {currentStep === 2 ? '✓' : '1'}
                </div>
                <span className={`text-xs font-bold ${currentStep === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Step 1: Choose Architecture
                </span>
                <span className="text-muted-foreground/40 text-xs">→</span>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  2
                </div>
                <span className={`text-xs font-bold ${currentStep === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Step 2: Dispatch Request
                </span>
              </div>

              <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/40 bg-primary/5">
                Enterprise Onboarding
              </Badge>
            </div>

            {/* STEP 1: Select Deployment Model */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-foreground">
                    Select Your Preferred Deployment Architecture
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    Choose how AI computation and clinical databases will be hosted for your hospital.
                  </p>
                </div>

                {/* Dropdown Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="deployment-option-select" className="text-xs font-semibold text-foreground">
                    Architecture Plan:
                  </label>
                  <select
                    id="deployment-option-select"
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value as DeploymentOptionKey)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="fully-local">
                      Option 1: Fully Local System (On-Premises AI, Cloud Database Backup)
                    </option>
                    <option value="cloud-ai-private">
                      Option 2: Cloud AI Models with Private Infrastructure (AWS Only)
                    </option>
                    <option value="fully-offline">
                      Option 3: Fully Air-Gapped & Offline (Local Models & Database)
                    </option>
                  </select>
                </div>

                {/* Detailed Option Card explaining long-term impact */}
                <div className="rounded-lg border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h6 className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {currentOptionInfo.title}
                    </h6>
                    <Badge variant="secondary" className="text-[10px] font-medium shrink-0">
                      {currentOptionInfo.badge}
                    </Badge>
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                    {currentOptionInfo.longTermExplanation}
                  </p>

                  <ul className="space-y-1.5 pt-1 text-xs text-muted-foreground border-t border-border/50">
                    {currentOptionInfo.architecturePoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Caution Warning for Fully Offline Option */}
                  {currentOptionInfo.caution && (
                    <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                        ⚠️ Important Security & Governance Notice
                      </p>
                      <p className="leading-relaxed opacity-90 text-[11px]">
                        {currentOptionInfo.caution}
                      </p>
                    </div>
                  )}
                </div>

                {/* Continue to Step 2 Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-semibold gap-1.5 px-4"
                  >
                    Continue to Step 2
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Dispatch Request via Selected Client */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-foreground">
                      Choose Your Email Client to Send Request
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      The activation email has been automatically prepared based on your chosen plan.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                  >
                    ← Back to Step 1
                  </Button>
                </div>

                {/* Selected Plan Summary Pill */}
                <div className="p-3 rounded-lg border bg-card/60 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Selected Plan:</span>
                    <p className="font-semibold text-foreground">{currentOptionInfo.title}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="h-6 text-[10px] px-2"
                  >
                    Change Plan
                  </Button>
                </div>

                {/* Email Client Buttons */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Select client to open inquiry email:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openGmail}
                      className="w-full text-xs font-medium justify-center gap-1.5 hover:border-red-500 hover:text-red-600"
                    >
                      <Mail className="h-3.5 w-3.5 text-red-500" />
                      Gmail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openOutlook}
                      className="w-full text-xs font-medium justify-center gap-1.5 hover:border-blue-500 hover:text-blue-600"
                    >
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      Outlook
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openYahoo}
                      className="w-full text-xs font-medium justify-center gap-1.5 hover:border-purple-500 hover:text-purple-600"
                    >
                      <Mail className="h-3.5 w-3.5 text-purple-500" />
                      Yahoo Mail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openDefaultMail}
                      className="w-full text-xs font-medium justify-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-primary" />
                      Default App
                    </Button>
                  </div>
                </div>

                {/* Email Template Preview */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Generated Request Message Preview:
                  </span>
                  <div className="p-3 rounded-lg border bg-muted/40 font-mono text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                    {emailBody}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} MyAarogyam EHR • All Rights Reserved
          </p>
          <Button size="sm" onClick={() => handleDialogChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
