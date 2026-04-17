# The Gathering Place — Attendance Management System

A full-stack, production-ready web application for managing student attendance across multiple vocational training classes. Built for a vocational skills centre running 8 concurrent programmes, replacing a manual paper-based process with a real-time digital system accessible from any device.

---

## Table of Contents

- [Project Overview](#project-overview)
- [The Problem It Solves](#the-problem-it-solves)
- [Live Application](#live-application)
- [Feature Summary](#feature-summary)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Security Model](#security-model)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Firebase Setup](#firebase-setup)
- [Deployment](#deployment)
- [Key Engineering Decisions](#key-engineering-decisions)

---

## Project Overview

The Gathering Place Attendance System is a role-based attendance management platform designed for vocational training institutions. It supports two user roles — **Admin** and **Teacher** — each with distinct permissions and views. The system handles student registration, multi-session weekly attendance, semester lifecycle management, student drop requests, holiday tracking, and historical data archiving across semesters.

The application is fully mobile-responsive, operates in real time using Firebase Firestore listeners, and is deployed on Netlify with Firebase as the backend.

---

## The Problem It Solves

Vocational training centres typically track attendance manually using paper registers. This creates several operational problems:

- **No central visibility.** Management cannot see attendance across all classes simultaneously.
- **Data loss risk.** Paper records are easily damaged, misplaced, or destroyed.
- **No historical tracking.** There is no reliable way to query past attendance or calculate student attendance percentages over time.
- **No audit trail.** There is no record of when attendance was marked or by whom.
- **Manual reporting.** Producing weekly or semester summaries requires manual aggregation.
- **No semester continuity.** When a new intake begins, previous student records have no structured home.

This application addresses all of these by providing a structured, cloud-backed, role-enforced system where:

- Each teacher manages only their assigned class.
- The admin has full visibility across all classes.
- Attendance is tracked per session, per week, within a defined semester.
- Historical data is archived — never deleted — when a new semester begins.
- All data is accessible in real time from any device.

---

## Live Application

Deployed on Netlify. Access requires a valid teacher or admin account created by the system administrator.

---

## Feature Summary

### Authentication
- Email and password login via Firebase Authentication.
- Role-based access: `admin` and `teacher`, resolved from a Firestore user profile on login.
- A user can hold both roles simultaneously (e.g. an admin who also teaches a class).
- Protected routes enforce role requirements at the router level.

### Student Registration
- Register students with name, phone number, gender, and up to 2 class selections from 8 available programmes.
- Phone number uniqueness is enforced within the active semester.
- On phone entry, the system checks the archive for previously enrolled students and pre-fills their details, enabling seamless re-registration across semesters.
- Registration can be paused by the admin with a custom message shown to all users.

### The 8 Vocational Classes
Computer · Make-up · Wig Making · Barbing · Baking · Resin Art · Nail Tech · Tailoring

### Teacher Dashboard
- Each teacher sees only the students enrolled in their assigned class.
- Attendance is marked per session (up to the configured sessions-per-week limit).
- Session tabs indicate status: completed, active, pending, or holiday.
- A semester progress bar shows the current week within the 12-week semester.
- Teachers can mark a session as a **Holiday / No Class**, which excludes it from all attendance percentage calculations.
- Teachers can submit a **drop request** for a student, which enters a pending state awaiting admin approval.

### Admin Dashboard
A tabbed interface providing full system access:

| Tab | Purpose |
|---|---|
| Overview | System-wide stats, class enrollment summary, attendance trend chart |
| Students | Full student list with filtering, search, direct drop, and per-student attendance history |
| Attendance | All attendance records, filterable by class and semester week, with CSV export |
| Analytics | Bar and pie charts for enrollment distribution, attendance rates, and weekly trends |
| Class Setup | Configure semester dates and sessions-per-week for each class |
| Drop Requests | Approve or reject teacher-submitted drop requests with optional rejection reason |
| Archive | Archive a class's semester data and browse historical archives |
| Registration | Pause or resume student registration with a custom message |
| Teachers | View all teacher and admin accounts |

### Semester Lifecycle
- Each class has an independently configured semester with a start date, end date, and label.
- Attendance can only be recorded within the active semester window.
- Week numbers are semester-relative (Week 1 = first week of semester, not ISO calendar week).
- When a semester ends, the admin archives the class: all student and attendance records are copied to a permanent subcollection archive, then removed from the active collections. The operation runs in batches of 400 documents to respect Firestore's write limits.
- Archived data is browsable from the Admin Dashboard and is never deleted.

### Attendance Integrity
- Each attendance record has a deterministic document ID (`studentId_classId_W{week}_S{session}`), preventing duplicates at the database level.
- Holiday sessions are stored with an `isHoliday` flag and excluded from attendance percentage denominators.
- Attendance percentage is calculated as `present sessions / (total sessions − holiday sessions)`.
- All records are retained indefinitely. Archiving copies records; it does not delete originals until the copy is confirmed.

### Real-Time Updates
All dashboard views use Firestore `onSnapshot` listeners. When a teacher marks attendance, the admin dashboard reflects the change instantly without a page refresh.

### Data Export
Filtered student lists and attendance records can be exported to CSV using PapaParse.

### QR Codes
After registering a student, a QR code is generated encoding their unique student ID, suitable for printing and future check-in integrations.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | React 18 | Component-based UI |
| Build tool | Vite 5 | Fast development server and production bundler |
| Styling | Tailwind CSS 3 | Utility-first CSS with custom design tokens |
| State management | Zustand | Lightweight global state for auth |
| Routing | React Router v6 | Client-side navigation and route guards |
| Backend / Database | Firebase Firestore | NoSQL real-time document database |
| Authentication | Firebase Authentication | Email/password auth with JWT tokens |
| Hosting | Netlify | Static site hosting with SPA redirect rules |
| Charts | Recharts | Bar and pie charts for analytics |
| Icons | Lucide React | Consistent icon set |
| QR codes | qrcode.react | Student QR code generation |
| CSV export | PapaParse | Client-side CSV serialisation |
| Notifications | react-hot-toast | Non-blocking toast messages |
| Fonts | Fraunces + Plus Jakarta Sans | Display and body typography via Google Fonts |

---

## System Architecture

```
Browser (React SPA)
    │
    ├── React Router         → Page-level routing + role guards
    ├── Zustand (authStore)  → Auth state (user, profile, role)
    │
    ├── Pages
    │     ├── LoginPage
    │     ├── RegisterPage
    │     ├── TeacherDashboard
    │     └── AdminDashboard
    │           ├── ClassConfigPanel
    │           ├── DropRequestsPanel
    │           ├── RegistrationControlPanel
    │           └── SemesterArchivePanel
    │
    └── Firebase SDK
          ├── Authentication  → Login / logout / auth state
          └── Firestore       → All data reads and writes
                ├── Real-time listeners (onSnapshot)
                └── Batched writes (writeBatch)

Firebase (Google Cloud)
    ├── Authentication       → User identity and JWT tokens
    └── Firestore            → Document database
          ├── Security Rules → Server-side access control
          └── Composite Indexes → Query performance
```

The application is a single-page application (SPA). All routing happens client-side. Netlify is configured with a catch-all redirect (`/* → /index.html`) so direct URL access and page refreshes work correctly.

---

## Database Schema

### Collections

**`users/{uid}`**
Stores the Firestore profile linked to a Firebase Auth account.
```
id:            string   — Firebase Auth UID
name:          string
email:         string
role:          'admin' | 'teacher'
assignedClass: string | null   — class ID, e.g. 'computer'
createdAt:     Timestamp
```

**`students/{id}`**
Active students in the current semester.
```
id:               string   — Firestore auto-ID
name:             string
phone:            string   — unique within active collection
gender:           string | null
classes:          string[] — max 2 class IDs
createdAt:        Timestamp
reRegistered:     boolean  — true if returning from archive
previousArchive:  string   — archive key of previous semester
```

**`attendance/{studentId_classId_W{week}_S{session}}`**
One document per student per class per semester week per session.
```
studentId:     string
studentName:   string
className:     string
semesterWeek:  number   — 1–12 relative to semester start date
sessionNumber: number   — 1, 2, etc.
isoWeek:       number   — kept for reference
year:          number
date:          string   — ISO timestamp of submission
present:       boolean | null   — null when isHoliday is true
isHoliday:     boolean
markedBy:      string   — teacher UID
submittedAt:   Timestamp
updatedAt:     Timestamp
```

**`classConfig/{classId}`**
Per-class configuration managed by admin.
```
sessionsPerWeek: number
semester: {
  startDate:   string   — ISO date e.g. '2025-01-06'
  endDate:     string
  label:       string   — e.g. 'Jan–Mar 2025'
  totalWeeks:  number   — 12
}
holidays: Array<{
  key:           string   — 'W{week}_S{session}'
  semesterWeek:  number
  sessionNumber: number
  markedBy:      string
  markedAt:      string
}>
updatedAt:  Timestamp
updatedBy:  string
```

**`dropRequests/{id}`**
Teacher-submitted requests to remove a student from a class.
```
studentId:       string
studentName:     string
className:       string
requestedBy:     string   — teacher UID
reason:          string
status:          'pending' | 'approved' | 'rejected' | 'cancelled'
resolvedBy:      string | null
resolvedAt:      Timestamp | null
rejectionReason: string | null
requestedAt:     Timestamp
```

**`systemSettings/registration`**
Global registration toggle.
```
isOpen:    boolean
message:   string   — shown to users when closed
pausedAt:  Timestamp
openedAt:  Timestamp
updatedBy: string
updatedAt: Timestamp
```

**`systemSettings/activeSemester`**
Tracks the current semester number globally.
```
semesterNumber: number
label:          string
startedAt:      Timestamp
startedBy:      string
```

**`studentArchives/{archiveKey}/students/{id}`**
Archived snapshots of students at the time of semester close. Structure mirrors the `students` collection plus archival metadata.

**`attendanceArchives/{archiveKey}/records/{id}`**
Archived attendance records. Structure mirrors the `attendance` collection plus archival metadata.

**`archiveIndex/{archiveKey}`**
Metadata index for the archive browser.
```
classId:         string
semesterLabel:   string
semesterNumber:  number
studentCount:    number
attendanceCount: number
archivedAt:      string
archivedBy:      string
```

---

## Security Model

Access control is enforced server-side via Firestore Security Rules. The client-side role guards (React Router) are a UX convenience only — the database will reject any unauthorised operation regardless of what the UI shows.

### Rule Design Principles

1. **`signedIn()`** — checks `request.auth != null` only. Used for reads that all authenticated users need (system settings, class config). Avoids any Firestore `get()` call, which can fail and cascade into permission errors.

2. **`isAdmin()` / `isTeacher()`** — perform a `get()` on the `users` document to read the role. Used only where role distinction is required (write operations and class-scoped reads).

3. **Class isolation** — teachers can only read students and attendance where the document's `className` or `classes` array matches their `assignedClass`. This is enforced at the document level, not the collection level.

4. **Attendance integrity** — teachers can only write attendance records where `className == userClass()` and `markedBy == request.auth.uid`. They cannot write to another teacher's class or impersonate another user.

5. **Archives are admin-only** — all archive subcollections are locked to admin reads and writes. Teachers have no access to historical data from past semesters.

### Permission Matrix

| Collection | Admin | Teacher (own class) | Teacher (other class) |
|---|---|---|---|
| `users` | Read + Write | Read own | No access |
| `students` | Full | Read + Create | No access |
| `attendance` | Full | Read + Write | No access |
| `classConfig` | Read + Write | Read only | Read only |
| `dropRequests` | Full | Create + Read | No access |
| `systemSettings` | Read + Write | Read only | Read only |
| `studentArchives` | Full | No access | No access |
| `attendanceArchives` | Full | No access | No access |
| `archiveIndex` | Full | No access | No access |

---

## Project Structure

```
gathering-place/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── ClassConfigPanel.jsx       — Semester dates + sessions per week
│   │   │   ├── DropRequestsPanel.jsx      — Approve / reject drop requests
│   │   │   ├── RegistrationControlPanel.jsx — Pause / resume registration
│   │   │   └── SemesterArchivePanel.jsx   — Archive + browse past semesters
│   │   └── shared/
│   │       ├── AdminRoute.jsx             — Admin-only route guard
│   │       ├── Navbar.jsx                 — Top navigation with role badges
│   │       ├── ProtectedRoute.jsx         — Auth route guard
│   │       ├── SplashScreen.jsx           — Initial loading screen
│   │       └── UIComponents.jsx           — Design system primitives
│   ├── firebase/
│   │   ├── archive.js                     — Semester archiving operations
│   │   ├── attendance.js                  — Attendance CRUD + real-time listeners
│   │   ├── classConfig.js                 — Class configuration + holidays
│   │   ├── config.js                      — Firebase app initialisation
│   │   ├── dropRequests.js                — Drop request lifecycle
│   │   ├── students.js                    — Student CRUD + re-registration
│   │   ├── systemSettings.js              — Registration control + semester tracking
│   │   └── users.js                       — Auth + user profile operations
│   ├── pages/
│   │   ├── AdminDashboard.jsx             — 9-tab admin interface
│   │   ├── LoginPage.jsx                  — Authentication page
│   │   ├── NotFoundPage.jsx               — 404
│   │   ├── RegisterPage.jsx               — Student registration with archive lookup
│   │   └── TeacherDashboard.jsx           — Session-based attendance marking
│   ├── store/
│   │   └── authStore.js                   — Zustand auth state + role helpers
│   ├── styles/
│   │   └── globals.css                    — Tailwind base + custom design system
│   └── utils/
│       ├── constants.js                   — Classes, roles, limits
│       ├── dateUtils.js                   — Semester week calculation utilities
│       └── exportUtils.js                 — CSV formatting helpers
├── .env.example                           — Environment variable template
├── .gitignore
├── firestore.indexes.json                 — Composite index definitions
├── firestore.rules                        — Server-side security rules
├── firebase.json                          — Firebase project config
├── netlify.toml                           — Netlify build + redirect config
├── index.html                             — App entry point + Google Fonts
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## Local Development Setup

### Prerequisites
- Node.js 18 or higher
- npm
- A Firebase project (see [Firebase Setup](#firebase-setup))

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd gathering-place

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Fill in your Firebase values (see Environment Variables section)

# 4. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server with HMR |
| `npm run build` | Build optimised production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across all source files |

---

## Environment Variables

Create a `.env` file in the project root. All variables are required.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

These values are found in Firebase Console → Project Settings → Your apps → Web app config.

> **Important:** The `.env` file must never be committed to version control. It is listed in `.gitignore`. For Netlify deployments, these values must be added separately via the Netlify dashboard under Site Settings → Environment Variables. A redeploy is required after adding them.

---

## Firebase Setup

### 1. Create a Firebase Project
Go to [console.firebase.google.com](https://console.firebase.google.com), create a project, and register a web app to obtain the config values above.

### 2. Enable Authentication
Firebase Console → Authentication → Sign-in method → Enable **Email/Password**.

### 3. Create Firestore Database
Firebase Console → Firestore Database → Create database → Start in **production mode** → Select a region.

### 4. Add Your Domain to Authorised Domains
Firebase Console → Authentication → Settings → Authorised domains → Add your Netlify domain (e.g. `yoursite.netlify.app`). Without this step, login will fail on the deployed site.

### 5. Deploy Security Rules and Indexes

Install the Firebase CLI if not already installed:
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project, alias it 'default'
```

Deploy rules and indexes:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 6. Create the First Admin Account

In Firebase Console → Authentication → Users → Add user. Copy the generated UID.

In Firestore → `users` collection → Add document with the UID as the document ID:

```
id:            <uid>
name:          "Your Name"
email:         "your@email.com"
role:          "admin"
assignedClass: null
createdAt:     (server timestamp)
```

### 7. Create Teacher Accounts

Repeat step 6 for each teacher, setting:
```
role:          "teacher"
assignedClass: "<class-id>"
```

**Available class IDs:** `computer` · `make-up` · `wig-making` · `barbing` · `baking` · `resin-art` · `nail-tech` · `tailoring`

### 8. Configure Classes

Log in as admin → Admin Dashboard → **Class Setup** tab → Configure each class with semester dates and sessions per week.

---

## Deployment

The project is configured for deployment on Netlify.

### Option A — Netlify Dashboard (Recommended)

1. Push the project to a GitHub repository.
2. In the Netlify dashboard, click **Add new site → Import from Git**.
3. Connect the repository. Netlify auto-detects `netlify.toml` and sets:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add all six `VITE_FIREBASE_*` environment variables under **Site settings → Environment variables**.
5. Click **Deploy site**.
6. After deploy, add your Netlify domain to Firebase Authorised Domains.

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### SPA Routing

The `netlify.toml` includes a catch-all redirect rule:
```toml
[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

This ensures that navigating directly to a URL like `/admin` or `/teacher` returns the React app rather than a 404.

---

## Key Engineering Decisions

### Deterministic Attendance Document IDs
Rather than using Firestore's auto-generated IDs, each attendance record uses a structured ID: `{studentId}_{classId}_W{semesterWeek}_S{sessionNumber}`. This makes duplicate prevention a database-level guarantee rather than an application-level check — `setDoc` with `merge: true` simply updates an existing record rather than creating a duplicate.

### Semester-Relative Week Numbers
The system calculates week numbers relative to the configured semester start date rather than using ISO calendar week numbers. This ensures that Week 1 always means the first week of the current intake, regardless of when in the calendar year the semester begins. A student who joins in March and one who joins in September both experience consistent week numbering within their respective semesters.

### Batched Archive Operations
Archiving a semester involves copying and deleting potentially hundreds of documents. Firestore's `writeBatch` has a limit of 500 operations per batch. The archive service processes documents in chunks of 400 with a separate batch commit per chunk, keeping the operation well within limits regardless of class size.

### Security Rule Design — Avoiding Cascading `get()` Failures
Early versions of the security rules used a `profile()` helper that called `get(users/{uid})` inside every rule evaluation. This caused a race condition: immediately after login, if the `get()` inside the rule evaluation timed out before the user document was confirmed readable, the entire rule returned `permission-denied`, crashing real-time listeners. The fix separates concerns — `signedIn()` uses only `request.auth != null` (a pure token check) for read-only public data like system settings and class config, while `isAdmin()` and `isTeacher()` (which call `get()`) are reserved for write operations and class-scoped reads where role distinction is strictly required.

### Per-Class Archiving
Rather than a single global "end semester" button, archiving operates per class. This reflects the operational reality of vocational centres where different programmes may run on different calendars. The Computer class can archive and begin a new intake while the Tailoring class is still in Week 8 of its current semester.

### Dual Admin/Teacher Role
A user with `role: 'admin'` and a non-null `assignedClass` gains access to both the Admin Dashboard and the Teacher Dashboard for their assigned class. The system detects this combination in the auth store and renders both navigation links and a dual role badge in the UI. The Firestore rules grant admin users full write access to attendance, covering both their admin and teaching responsibilities without requiring a separate teacher account.

---

*Built with React, Firebase, Tailwind CSS, and Vite. Deployed on Netlify.*