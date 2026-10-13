# The Gathering Place — Attendance Management System

A web app for the YSA vocational classes at The Gathering Place: students sign up themselves, admins review them, and teachers take attendance on their phones. It replaces paper registers with one live record that works on any device, even with patchy signal.

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
- [Upgrading from the previous version](#upgrading-from-the-previous-version)
- [Key Engineering Decisions](#key-engineering-decisions)

---

## Project Overview

The Gathering Place Attendance System is a role-based attendance management platform designed for vocational training institutions. It supports two user roles — **Admin** and **Teacher** — each with distinct permissions and views. The system handles student registration, multi-session weekly attendance, semester lifecycle management, student drop requests, holiday tracking, and historical data archiving across semesters.

The app is designed for phones first, updates live through Firestore listeners, and runs entirely on Firebase (Hosting, Authentication and Firestore) on the free Spark plan, with no server code.

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

Deployed on Firebase Hosting (moving from Netlify, see [Deployment](#deployment)). Staff sign in with an account an admin creates; students only use the public sign-up and status pages.

---

## Feature Summary

### Authentication
- Email and password login via Firebase Authentication.
- Role-based access: `admin` and `teacher`, resolved from a Firestore user profile on login.
- A user can hold both roles simultaneously (e.g. an admin who also teaches a class).
- Protected routes enforce role requirements at the router level.

### Student Registration
- **Students sign themselves up** at `/join` with their name, phone number, optional gender, ward or branch and email, and one or two classes. They tick a consent box and get a reference code to check their status at `/status` (and can send it to themselves on WhatsApp).
- **Admins review each sign-up** under **Sign-ups**: accept or decline one at a time or in bulk. A decline reason is for admins only unless the admin ticks the box to show it on the student's status page. Declined records are kept.
- **One person per phone number.** `0803 123 4567`, `+234 803 123 4567` and `2348031234567` count as the same number. A number can't be used by two students, or by a student and a waiting sign-up.
- **Returning students** are linked to their record from an earlier semester when they're accepted or added.
- **Admins can still add a student directly** under **Add student**, skipping review. Teachers no longer add students; they share the sign-up link or QR code from **Invite students**, which can pick their class in advance.
- **Pausing sign-ups** in Settings closes the public form and shows the admin's message.
- **Spam protection:** a hidden honeypot field, strict security rules for signed-out writes, and Firebase App Check with reCAPTCHA v3 when configured.

### Classes
- Admins manage classes on the **Classes** page: add a class with a name and colour, and set its semester dates, sessions per week and teacher.
- Every class has its own colour, used on chips, cards and charts across the app.
- Removing a class is guarded. It's blocked while it has active students (archive first), a teacher, or waiting sign-ups. A class with past attendance or archives is **retired**, which keeps its history and stops new sign-ups, and can be restored. A class nobody used is deleted.
- The list starts as the original eight: Computer, Make-up, Wig Making, Barbing, Baking, Resin Art, Nail Tech and Tailoring.

### Teacher Dashboard
- Each teacher sees only the students enrolled in their assigned class, on a page built for phones: a large Present and Absent button per student, "everyone present" and "mark the rest" shortcuts, and search for big classes.
- **Week picker:** this week opens by default; teachers can step back to catch up on an earlier week but not forward. After the semester ends, any week can still be completed.
- **Sessions:** with more than one session a week, each session shows whether it's sent, still to do, or had no class.
- **Nothing gets lost:** marks are saved on the device as they're made, so closing the page or losing signal keeps them until they're sent. The app keeps an offline copy of the class (Firestore's IndexedDB cache), and marks sent without signal are delivered when it returns.
- **No class:** a session can be marked as having no class, which leaves it out of every attendance percentage, and undone.
- **Students tab:** each student's attendance rate this semester, their phone number, and their other class.
- **Drop requests:** teachers ask the admin to drop a student, follow the decision, and can withdraw a request while it's waiting.
- Teachers don't add students; they share the sign-up link from **Invite students**.

### Admin
| Page | Purpose |
|---|---|
| Home | What's waiting (sign-ups, drop requests, classes missing a semester or teacher), headline numbers, which registers each class has sent this week, and attendance by week |
| Sign-ups | Review the public sign-up queue, singly or in bulk |
| Students | Search, filter by class, export CSV; a student's attendance and removing them from a class |
| Attendance | One class and week as a register grid; export a class's semester as CSV |
| Classes | Add, edit, retire, restore and remove classes; semester, sessions and teacher |
| Drop requests | Approve, or decline with a note the teacher sees |
| Archive | End a class's semester, browse and export past semesters |
| Settings | Open or pause sign-ups; add staff, change roles and classes, remove access |

**Staff accounts** are created in the app: the admin enters a name, email, role and class, and the new person gets an email to set their password. Removing access deletes their profile, so they can open nothing and see a "No access" screen. (The sign-in account itself can only be deleted in the Firebase console, which is needed only to reuse that email.)

### Semester Lifecycle
- Each class has an independently configured semester with a start date, end date, and label.
- Attendance can only be recorded within the active semester window.
- Week numbers are semester-relative (Week 1 = first week of semester, not ISO calendar week).
- When a semester ends, the admin archives the class: all student and attendance records are copied to a permanent subcollection archive, then removed from the active collections. The operation runs in batches of 200 (each can take two writes) to respect Firestore's limit of 500 writes per batch.
- Archived data is browsable and exportable from **Archive** and is never deleted.

### Attendance Integrity
- Each attendance record has a deterministic document ID (`studentId_classId_W{week}_S{session}`), preventing duplicates at the database level.
- Holiday sessions are stored with an `isHoliday` flag and excluded from attendance percentage denominators.
- Attendance percentage is calculated as `present sessions / (total sessions − holiday sessions)`.
- All records are retained. Archiving copies records first and removes the originals only after the copy is written; an interrupted archive can be run again to finish.

### Live updates and cost
Pages listen only to what they show. The admin home reads one small total per session (`attendanceSummary`), which teachers write alongside each register, rather than every attendance record; the Attendance page loads one class and week at a time; a student's history loads when it's opened. This keeps reads low on the Spark plan's daily quota.

### Data Export
Student lists, a class's semester attendance and archived semesters can be exported to CSV. The export code loads only when someone exports.

### QR Codes
**Invite students** shows a QR code and link to the sign-up form, optionally with a class picked in advance, to print or share on WhatsApp.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | React 18 | Component-based UI |
| Build tool | Vite 5 | Fast development server and production bundler |
| Styling | Tailwind CSS 3 | Utility-first CSS with custom design tokens |
| State management | Zustand | Auth state and the live class list |
| Routing | React Router v6 | Client-side navigation and route guards |
| Backend / Database | Firebase Firestore | NoSQL real-time document database |
| Authentication | Firebase Authentication | Email/password auth with JWT tokens |
| Hosting | Firebase Hosting | Static hosting, preview links per pull request |
| UI primitives | Radix UI | Accessible dialogs, tabs and checkboxes |
| Icons | Lucide React | Consistent icon set |
| QR codes | qrcode.react | Sign-up link QR codes |
| CSV export | PapaParse | Client-side CSV serialisation |
| Notifications | react-hot-toast | Non-blocking toast messages |
| Fonts | Outfit + Plus Jakarta Sans | Headings and body text via Google Fonts |
| Language | TypeScript (gradual) | New code is TypeScript; older `.js` files convert as they change |

---

## System Architecture

```
Browser (React SPA)
    │
    ├── React Router          → Lazy-loaded pages + role guards
    ├── Zustand
    │     ├── authStore       → User, profile, role, "no access"
    │     └── classStore      → Live class list (falls back to the original eight)
    │
    ├── Pages
    │     ├── Public: Join (/join), Status (/status), Login
    │     ├── Teacher: TeacherPage (register, students, drop requests), Invite
    │     └── Admin: Home, Sign-ups, Students, Attendance, Classes,
    │               Drop requests, Archive, Settings, Add student
    │
    └── Firebase SDK
          ├── Authentication  → Sign-in; a second throwaway app creates staff accounts
          ├── App Check       → reCAPTCHA v3, when configured
          └── Firestore       → Persistent offline cache, listeners and batched writes

Firebase (Google Cloud, Spark plan)
    ├── Hosting              → The built site
    ├── Authentication       → Staff identities
    └── Firestore            → Data, security rules and composite indexes
```

There are no Cloud Functions. Everything the server must guarantee (who can write what, one registration per phone number, totals that add up) is enforced by the security rules, which are tested in CI.

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
phone:            string   — as entered
phoneKey:         string   — digits-only international form, e.g. '2348031234567'
gender:           string | null
classes:          string[] — max 2 class IDs
ward:             string   — optional
email:            string   — optional
registrationId:   string   — reference code of the sign-up they came from, if any
createdAt:        Timestamp
reRegistered:     boolean  — true if returning from archive
previousArchive:  string   — archive key of previous semester
droppedFrom:      map      — classId → { droppedAt, droppedBy, requestId }
```

**`registrations/{refCode}`** (admin only)
A public sign-up waiting for review, or reviewed. The document ID is the 8-character reference code.
```
name, phone, phoneKey, gender, classes, ward, email, consent: true
status:        'pending' | 'accepted' | 'declined'
createdAt:     Timestamp
reviewedBy, reviewedAt, declineReason, shareReason, studentId
```

**`registrationStatus/{refCode}`**
What the public status page shows: readable by anyone who has the code, never listable.
```
status:  'pending' | 'accepted' | 'declined'
classes, createdAt, reviewedAt
note:    string   — only when the admin chose to share a decline reason
```

**`phoneIndex/{phoneKey}`**
One document per number in use, so the rules can refuse a second sign-up or student with the same number.
```
{ kind: 'pending', registrationId }   — held by a waiting sign-up
{ kind: 'student', studentId }        — held by an active student
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

**`attendanceSummary/{classId_W{week}_S{session}}`**
One total per class session, written by the teacher in the same batch as the register. The admin home reads these instead of every record.
```
classId, semesterWeek, sessionNumber
present, absent, total   — total == present + absent (enforced by the rules)
markedBy:  string
updatedAt: Timestamp
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

**`systemSettings/classes`**
The admin's class list. Readable by anyone (the sign-up form needs it); written by admins.
```
classes: Array<{ id, label, colorKey, status: 'active' | 'retired', order }>
activeIds: string[]   — the rules check sign-up classes against this
updatedAt, updatedBy
```
Until this document exists, the app and the rules use the original eight classes.

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

5. **Signed-out writes are tightly shaped** — a sign-up is a batch of three documents (`registrations`, `registrationStatus`, `phoneIndex`) that the rules check against each other: same reference code, a valid phone key, active classes, sign-ups open, and no existing claim on the number.

6. **Archives are admin-only** — all archive subcollections are locked to admin reads and writes. Teachers have no access to historical data from past semesters.

### Permission Matrix

| Collection | Admin | Teacher (own class) | Teacher (other class) | Signed out |
|---|---|---|---|---|
| `users` | Read + Write | Read own | No access | No access |
| `students` | Full | Read | No access | No access |
| `attendance` | Full | Read + Write | No access | No access |
| `attendanceSummary` | Full | Write own class's totals | No access | No access |
| `classConfig` | Read + Write | Read + update own class's holidays | Read only | No access |
| `dropRequests` | Full | Create + Read; withdraw own pending | No access | No access |
| `systemSettings` | Read + Write | Read only | Read only | Read `registration` and `classes` |
| `registrations` | Read + Update | No access | No access | Create a valid pending sign-up |
| `registrationStatus` | Read + Update | No access | No access | Read one by code; create with a sign-up |
| `phoneIndex` | Full | No access | No access | Create with a sign-up (fails if the number is taken) |
| `studentArchives` | Full | No access | No access | No access |
| `attendanceArchives` | Full | No access | No access | No access |
| `archiveIndex` | Full | No access | No access | No access |

---

## Project Structure

```
gathering-place/
├── .github/workflows/        — CI (checks, rules tests, preview links) and production deploy
├── public/                   — Icons and manifest
├── scripts/
│   └── migrate-registrations.mjs — One-time phone index backfill (dry run by default)
├── src/
│   ├── assets/brand/         — Placeholder logos (replace with the real ones)
│   ├── components/
│   │   ├── brand/            — <Logo/>
│   │   ├── layout/           — AppShell (sidebar, bottom bar), PageHeader, auth and public layouts
│   │   ├── registration/     — ClassPicker
│   │   ├── shared/           — Route guards, splash screen
│   │   ├── teacher/          — Register, roster, drop requests, week picker
│   │   └── ui/               — Design system: Button, Card, Chip, Dialog, Field, Tabs, states…
│   ├── firebase/             — One module per area: attendance, classes, registrations,
│   │                           staff, summaries, archive, students, users, settings
│   ├── lib/                  — Pure, unit-tested helpers: phone numbers, reference codes,
│   │                           class catalog, attendance totals, drafts
│   ├── pages/                — One file per route
│   ├── store/                — authStore, classStore
│   ├── theme/                — Design tokens (colours, type, radii) and class colours
│   ├── types/firestore.ts    — Firestore document shapes
│   └── utils/                — Dates, CSV export, constants
├── tests/
│   ├── unit/                 — Vitest
│   └── rules/                — Security rules tests against the emulator
├── firestore.rules
├── firestore.indexes.json
├── firebase.json             — Hosting, rules, indexes and emulator config
└── netlify.toml              — Kept until Netlify is retired
```

The design system is documented live at `/styleguide`.

---

## Local Development Setup

### Prerequisites
- Node.js 22 (see `.nvmrc`)
- Java 21 or newer, only for the security rules tests (the Firestore emulator needs it)
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
| `npm run typecheck` | Type-check TypeScript files (JavaScript files are allowed alongside) |
| `npm test` | Run unit tests with Vitest |
| `npm run test:rules` | Start the Firestore emulator and test `firestore.rules` against it |
| `npm run check` | Lint, type-check, unit tests and build in one go |
| `npm run emulators` | Start local Auth and Firestore emulators; run the app against them with `VITE_USE_EMULATORS=true npm run dev` |

New code is written in TypeScript; existing `.js`/`.jsx` files are converted as they are redesigned. Firestore document shapes live in `src/types/firestore.ts`.

---

## Environment Variables

Create a `.env` file in the project root. The `VITE_FIREBASE_*` variables are required.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Optional: reCAPTCHA v3 site key, turns on Firebase App Check (see "Spam protection")
VITE_RECAPTCHA_SITE_KEY=
# Local development only: use the emulators started by `npm run emulators`
VITE_USE_EMULATORS=
```

These values are found in Firebase Console → Project Settings → Your apps → Web app config.

> **Important:** The `.env` file must never be committed to version control. It is listed in `.gitignore`. For deploys, the same values are GitHub Actions secrets (see [Deployment](#deployment)).

---

## Firebase Setup

### 1. Create a Firebase Project
Go to [console.firebase.google.com](https://console.firebase.google.com), create a project, and register a web app to obtain the config values above.

### 2. Enable Authentication
Firebase Console → Authentication → Sign-in method → Enable **Email/Password**.

### 3. Create Firestore Database
Firebase Console → Firestore Database → Create database → Start in **production mode** → Select a region.

### 4. Add Your Domain to Authorised Domains
Firebase Console → Authentication → Settings → Authorised domains. `gathering-place-d03e7.web.app` and `.firebaseapp.com` are there already; add any custom domain, and your Netlify domain while it's still in use. Without this, sign-in fails on that domain.

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

Only the first admin is made by hand. In Firebase Console → Authentication → Users → Add user, then copy the UID.

In Firestore → `users` collection → Add document with the UID as the document ID:

```
name:          "Your Name"
email:         "your@email.com"
role:          "admin"
assignedClass: null
```

### 7. Add Staff

Sign in as that admin → **Settings** → **Add staff**. Enter their name, email, role and class; they get an email with a link to set their password.

### 8. Set Up Classes

**Classes** → **Edit** on each class to set semester dates, sessions per week and teacher. Add or remove classes here too.

### 9. Index existing students' phone numbers (once, when upgrading to self-registration)

The public sign-up form relies on a `phoneIndex` collection to refuse numbers that already belong to a student. Students created before self-registration need an entry. The script only adds fields and documents, never deletes, and changes nothing unless you pass `--apply`.

1. In Firebase Console → Project settings → Service accounts, generate a private key and save it outside the repository.
2. Dry run, which prints what it would write and any numbers it can't read or that two students share:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/migrate-registrations.mjs --project <your-project-id>
   ```
3. Fix any listed problems in the app, then run it again with `--apply`. Running it twice is safe. Always look at the dry run's output before applying.

Until this has run, accepting a sign-up still checks existing students by phone, so duplicates are caught at review rather than at sign-up.

### 10. Spam protection (optional, recommended)

1. Create a reCAPTCHA v3 key for your domain at <https://www.google.com/recaptcha/admin>.
2. In Firebase Console → App Check, register the web app with that key's secret.
3. Set `VITE_RECAPTCHA_SITE_KEY` (locally and as a GitHub secret) and deploy.
4. Watch App Check → Firestore metrics for a few days. Once almost all requests are verified, click **Enforce**.

---

## Deployment

The project is moving from Netlify to **Firebase Hosting**, so the site, Firestore rules and indexes deploy together from one place. Until the steps below are done, Netlify keeps serving the site as before.

### Continuous integration (GitHub Actions)

`.github/workflows/ci.yml` runs on every pull request and every push to `main`: lint, type-check, unit tests, security rules tests against the Firestore emulator, and a production build. Once the secrets below exist, each pull request also gets a **preview link** (a Firebase Hosting preview channel that expires after 7 days), posted as a comment on the pull request.

`.github/workflows/deploy.yml` deploys hosting, `firestore.rules` and `firestore.indexes.json` to production after CI passes on `main`. It can also be run by hand from the **Actions** tab. Both workflows skip deploying, with a notice, until the secrets exist.

### One-time setup for Firebase Hosting deploys

1. Install the Firebase CLI (`npm install -g firebase-tools`) and run `firebase login`.
2. In the project folder, run `firebase init hosting:github`. When asked, choose the existing project `gathering-place-d03e7` and repository `iflux-jr/gathering-place`, and answer **No** to overwriting the workflow files and **No** to overwriting `firebase.json`. This creates a service account and stores it as a GitHub secret.
3. In GitHub, open **Settings → Secrets and variables → Actions** and check that the CLI created a secret named `FIREBASE_SERVICE_ACCOUNT_GATHERING_PLACE_D03E7`. The workflows already use that name. If the CLI also wrote new workflow files, delete them; the ones in `.github/workflows/` cover the same jobs.
4. Add the six web app values as secrets with the same names as in `.env`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
5. Merge to `main` (or run **Deploy** from the Actions tab). The site is then live at `https://gathering-place-d03e7.web.app`.
6. Optional: connect a custom domain under Firebase Console → Hosting → Add custom domain, then retire the Netlify site.

> **Note:** the production deploy also publishes `firestore.rules`. Rule changes are covered by `npm run test:rules` in CI before they can reach production.

### Netlify (current, being retired)

The `netlify.toml` build still works (Node 22, `npm run build`, publish `dist`) and keeps serving the site until you switch the domain over.

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

## Upgrading from the previous version

Existing data keeps working as it is: students, attendance, class settings, drop requests and archives are read unchanged, and the class list falls back to the original eight until an admin edits it. After the new version is deployed (rules and indexes included, which the deploy workflow does):

1. **Sign in as an admin and press "Recalculate totals"** on the home page once. It builds the per-session totals from attendance taken before the update. It reads the current attendance once and writes only to `attendanceSummary`.
2. **Index existing phone numbers** with the script in [Firebase Setup, step 9](#9-index-existing-students-phone-numbers-once-when-upgrading-to-self-registration): dry run first, then `--apply`. Until then, duplicates are still caught when a sign-up is accepted.
3. **Teachers' accounts are unchanged.** Teachers no longer add students; send them to **Invite students** to share the sign-up link.
4. Optionally turn on [spam protection](#10-spam-protection-optional-recommended).

---

## Key Engineering Decisions

### Deterministic Attendance Document IDs
Rather than using Firestore's auto-generated IDs, each attendance record uses a structured ID: `{studentId}_{classId}_W{semesterWeek}_S{sessionNumber}`. This makes duplicate prevention a database-level guarantee rather than an application-level check — `setDoc` with `merge: true` simply updates an existing record rather than creating a duplicate.

### Semester-Relative Week Numbers
The system calculates week numbers relative to the configured semester start date rather than using ISO calendar week numbers. This ensures that Week 1 always means the first week of the current intake, regardless of when in the calendar year the semester begins. A student who joins in March and one who joins in September both experience consistent week numbering within their respective semesters.

### Batched Archive Operations
Archiving a semester involves copying and deleting potentially hundreds of documents. Firestore's `writeBatch` has a limit of 500 operations per batch. The archive service processes documents in chunks of 200 (some take two writes) with a separate batch commit per chunk, keeping the operation well within limits regardless of class size.

### Security Rule Design — Avoiding Cascading `get()` Failures
Early versions of the security rules used a `profile()` helper that called `get(users/{uid})` inside every rule evaluation. This caused a race condition: immediately after login, if the `get()` inside the rule evaluation timed out before the user document was confirmed readable, the entire rule returned `permission-denied`, crashing real-time listeners. The fix separates concerns — `signedIn()` uses only `request.auth != null` (a pure token check) for read-only public data like system settings and class config, while `isAdmin()` and `isTeacher()` (which call `get()`) are reserved for write operations and class-scoped reads where role distinction is strictly required.

### Per-Class Archiving
Rather than a single global "end semester" button, archiving operates per class. This reflects the operational reality of vocational centres where different programmes may run on different calendars. The Computer class can archive and begin a new intake while the Tailoring class is still in Week 8 of its current semester.

### Totals Written With the Register
Without Cloud Functions there's nothing on the server to keep running totals. Instead the teacher's register batch also writes that session's total, and the rules check it belongs to their class and adds up. If totals ever drift (for example after editing records by hand), **Recalculate totals** rebuilds them from the records.

### Public Sign-Up Without a Server
A sign-up is three documents written in one batch, each checked by the rules against the others. Creating `phoneIndex/{phoneKey}` fails if the number is already claimed, which makes "one person per number" a database guarantee rather than a race-prone client check. Reference codes avoid look-alike characters (no 0/O, 1/I/L) so they can be read over the phone.

### Classes as Data, With Safe Removal
The class list lives in one document, edited in a transaction so two admins can't overwrite each other. Removing a class never destroys history: a class with attendance or archives is retired instead of deleted, and removal is blocked while students, a teacher or waiting sign-ups depend on it.

### Staff Accounts Without Admin SDK
Creating a user with the client SDK signs in as that user. The app creates staff accounts on a throwaway second Firebase app instance, so the admin's own session is untouched, and sends a password-reset email so the admin never knows the password.

### Dual Admin/Teacher Role
A user with `role: 'admin'` and a non-null `assignedClass` gains access to both the Admin Dashboard and the Teacher Dashboard for their assigned class. The system detects this combination in the auth store and renders both navigation links and a dual role badge in the UI. The Firestore rules grant admin users full write access to attendance, covering both their admin and teaching responsibilities without requiring a separate teacher account.

---

*Built with React, Firebase, Tailwind CSS and Vite.*