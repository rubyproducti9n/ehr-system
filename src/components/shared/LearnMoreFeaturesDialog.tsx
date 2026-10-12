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
  Copy,
  Check,
  Sparkles,
  ServerOff,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface LearnMoreFeaturesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CONTACT_EMAILS = 'om.lokhande34@gmail.com, chivater@gmail.com'

const EMAIL_SUBJECT = 'Inquiry to Rent & Activate MyAarogyam EHR Platform'

const getEmailBody = (hospitalName?: string | null, hospitalCode?: string | null) => `Hello MyAarogyam Team,

We are interested in activating and renting the MyAarogyam EHR Platform for our healthcare facility.

Facility Details:
- Hospital / Clinic Name: ${hospitalName || '[Enter Hospital Name]'}
- Hospital Code / ID: ${hospitalCode || '[If registered, enter code]'}
- Contact Person: [Your Name]
- Contact Number: [Your Phone Number]
- Estimated Doctors / Staff Count: [e.g. 5-25]
- Location / City: [Your City]

Please provide us with onboarding details, service pricing, and server setup instructions.

Thank you!
`

export function LearnMoreFeaturesDialog({
  open,
  onOpenChange,
}: LearnMoreFeaturesDialogProps) {
  const hospitalName = useAppStore((state) => state.hospitalName)
  const hospitalCode = useAppStore((state) => state.hospitalCode)

  const [copied, setCopied] = useState(false)
  const [showEmailOptions, setShowEmailOptions] = useState(false)

  const emailBody = getEmailBody(hospitalName, hospitalCode)

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `To: ${CONTACT_EMAILS}\nSubject: ${EMAIL_SUBJECT}\n\n${emailBody}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                Next-Generation AI Clinical Operating System & Practice Management
              </DialogDescription>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            MyAarogyam is a private, enterprise-grade healthcare management suite designed for hospitals, clinics, and multi-specialty centers. All high-speed AI processing and confidential record pipelines run in a dedicated, secure architecture.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="p-6 space-y-5">
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
                <span>Semantic Clinical Search</span>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Intelligent hospital-scoped vector search using Gemma 2 embeddings & ChromaDB to discover diagnoses, symptoms, and visit histories.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Dna className="h-4 w-4" />
                <span>GatorTron Clinical NER</span>
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
                Ingest scanned prescriptions, lab results, and paper records with automated structured clinical notes extraction.
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
                <span>Offline-First Privacy Architecture</span>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Dedicated local storage root ensuring protected health records remain strictly on-premises without cloud leak risk.
              </p>
            </div>
          </div>

          {/* Activation Notice Box */}
          <div className="p-4 rounded-xl bg-muted/40 border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h5 className="text-sm font-bold text-foreground">
                  Ready to activate MyAarogyam for your hospital?
                </h5>
                <p className="text-xs text-muted-foreground">
                  Rent your dedicated instance or request setup support from our deployment engineering team.
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/40 bg-primary/5">
                Enterprise Onboarding
              </Badge>
            </div>

            {/* Email client selection buttons */}
            <div className="pt-1 space-y-2">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Choose your email client to send request:
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

            {/* Copy contact info shortcut */}
            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
              <span className="text-muted-foreground text-[11px]">
                To: <span className="font-mono text-foreground">{CONTACT_EMAILS}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-600 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Details
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} MyAarogyam EHR • All Rights Reserved
          </p>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
