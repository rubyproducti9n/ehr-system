# EHR Platform

A modern, high-performance Electronic Health Record (EHR) web application built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, and **Firebase Realtime Database & Authentication**.

---

## 🌟 Features

- **Authentication & Security**: Secure email/password login and persistent session state with Firebase Auth, protected route shells, and production-grade Firebase Realtime Database validation rules.
- **Interactive Dashboard**: Real-time KPI statistics cards, recently admitted patients, upcoming appointments breakdown, and quick actions.
- **Universal Search (Cmd+K)**: Instant keyboard-driven global palette searching across Patients, Providers, and Facilities simultaneously.
- **Comprehensive Patient Management**:
  - Full CRUD operations with multi-step creation flow.
  - Interactive search and filterable data tables with status badges.
  - Dynamic Patient Profile (`/patients/[id]`) with a demographics overview panel and fast sub-tab navigation.
  - **5 Realtime Sub-Tabs**:
    1. **ADT Events**: Admission, Discharge, and Transfer tracking timeline.
    2. **Lab Results**: Structured panels, tests, reference units, and status tagging (Normal, Abnormal, Critical, Pending).
    3. **Prescriptions**: Active medication orders, dosages, routes, frequencies, and status controls.
    4. **Documents**: Clinical notes, discharge summaries, lab reports, imaging references, and category filters.
    5. **Encounters**: Inpatient/Outpatient/Emergency/Telehealth documentation with inline read/edit toggle and clinical summaries.
- **Provider & Facility Directory**:
  - Full CRUD for healthcare providers (with 10-digit NPI validation, specialties, contact details).
  - Full CRUD for medical facilities (Hospitals, Clinics, Urgent Cares, Labs, Pharmacies, Imaging Centers).
- **Clinical Scheduling**:
  - Root-level appointment tracking across patients, providers, and facilities.
  - Real-time date filtering, appointment type indicators, and status updates (Scheduled, Confirmed, In-Progress, Completed, Cancelled, No-Show).
- **Production Hardened**:
  - React Error Boundaries across roots and sub-tabs.
  - Unified Empty State component.
  - Accessible forms and keyboard shortcuts (`Cmd+K`, escape dismissals, focus traps).
  - Security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend & Database**: [Firebase Realtime Database](https://firebase.google.com/products/realtime-database)
- **Authentication**: [Firebase Authentication](https://firebase.google.com/products/auth)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm / yarn / pnpm

### 2. Clone the Repository & Install Dependencies
```bash
git clone <your-repo-url>
cd ehr-platform
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory and populate it with your Firebase project credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🔒 Firebase Security Rules & Deployment

Deploy the database security rules defined in `database.rules.json`:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules to your project
firebase deploy --only database
```

---

## 🚢 Production Deployment to Vercel

1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New > Project** and import the repository.
3. Configure the **Environment Variables** in Vercel settings matching all 7 `NEXT_PUBLIC_FIREBASE_*` variables from `.env.local`.
4. Click **Deploy**.
5. **Authorize the Production Domain in Firebase**:
   - Go to [Firebase Console](https://console.firebase.google.com/) > **Authentication** > **Settings** > **Authorized domains**.
   - Add your Vercel deployment domain (e.g. `your-app.vercel.app`).

---

## 👤 User Management

User accounts can be provisioned through the Firebase Console or via Firebase Admin SDK scripts:
1. Navigate to **Firebase Console** > **Authentication** > **Users**.
2. Click **Add user** and create clinical / administrative credentials.
3. Users can then log into the application securely at `/login`.

---

## 🔮 Phase 2 Roadmap

- [ ] AI-assisted clinical transcription with Gemini Live / Speech-to-Text in Encounters.
- [ ] Direct file attachments in Documents using Firebase Storage / Cloud Storage with signed URLs.
- [ ] Granular Role-Based Access Control (RBAC) (Doctor, Nurse, Admin, Billing) enforced at token claim level.
- [ ] HL7 / FHIR standard data export and import pipelines.
- [ ] Calendar grid and provider schedule availability view in `/scheduling`.

