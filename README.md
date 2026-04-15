# 🏛️ The Gathering Place — Attendance System

A production-ready, full-stack attendance management system built with **React + Vite**, **Firebase**, and **Tailwind CSS**.

---

## 📁 Folder Structure

```
gathering-place/
├── public/
│   └── favicon.svg
├── scripts/
│   └── seed.js                  # Seed fake students for testing
├── src/
│   ├── components/
│   │   └── shared/
│   │       ├── AdminRoute.jsx       # Admin-only route guard
│   │       ├── Navbar.jsx           # Top navigation
│   │       ├── ProtectedRoute.jsx   # Auth route guard
│   │       ├── SplashScreen.jsx     # Initial loading screen
│   │       └── UIComponents.jsx     # Reusable UI primitives
│   ├── firebase/
│   │   ├── attendance.js        # Attendance Firestore operations
│   │   ├── config.js            # Firebase initialization
│   │   ├── students.js          # Student Firestore operations
│   │   └── users.js             # Auth + user profile operations
│   ├── pages/
│   │   ├── AdminDashboard.jsx   # Full admin view
│   │   ├── LoginPage.jsx        # Auth page
│   │   ├── NotFoundPage.jsx     # 404
│   │   ├── RegisterPage.jsx     # Student registration
│   │   └── TeacherDashboard.jsx # Teacher attendance view
│   ├── store/
│   │   └── authStore.js         # Zustand auth state
│   ├── styles/
│   │   └── globals.css          # Tailwind + custom CSS
│   ├── utils/
│   │   ├── constants.js         # App constants (classes, roles)
│   │   ├── dateUtils.js         # Week number, date formatting
│   │   └── exportUtils.js       # CSV export helpers
│   ├── App.jsx                  # Router setup
│   └── main.jsx                 # Entry point
├── .env.example                 # Environment variable template
├── firebase.json                # Firebase hosting config
├── firestore.indexes.json       # Composite index definitions
├── firestore.rules              # Security rules
├── netlify.toml                 # Netlify deployment config
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd gathering-place
npm install
```

### 2. Firebase Setup

#### a) Create a Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `gathering-place`
3. Disable Google Analytics (optional)

#### b) Enable Authentication
1. Firebase Console → **Authentication** → **Get started**
2. Enable **Email/Password** provider

#### c) Create Firestore Database
1. Firebase Console → **Firestore Database** → **Create database**
2. Start in **Production mode** (we'll set rules next)
3. Choose a region close to Nigeria (e.g., `europe-west1` or `us-central1`)

#### d) Get your Firebase config
1. Project Settings (⚙️) → **General** → **Your apps** → **Web app** → `</>`
2. Click **Add app**, register it
3. Copy the config object values

#### e) Create `.env` file
```bash
cp .env.example .env
```
Fill in your Firebase values:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=gathering-place.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gathering-place
VITE_FIREBASE_STORAGE_BUCKET=gathering-place.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

### 3. Deploy Firestore Security Rules

Install Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Create your first Admin account

1. Firebase Console → **Authentication** → **Add user**
   - Email: `admin@yourschool.com`
   - Password: (strong password)
   - Copy the **UID**

2. Firebase Console → **Firestore** → Add document:
   - Collection: `users`
   - Document ID: *(paste the UID)*
   - Fields:
     ```
     id:            <UID>
     name:          "System Admin"
     email:         "admin@yourschool.com"
     role:          "admin"
     assignedClass: null
     createdAt:     (server timestamp)
     ```

### 5. Create Teacher accounts

For each teacher:
1. Firebase Console → **Authentication** → **Add user**
2. Copy their UID
3. Add document in `users` collection:
   ```
   id:            <teacher-UID>
   name:          "Mrs. Blessing Obi"
   email:         "blessing@yourschool.com"
   role:          "teacher"
   assignedClass: "computer"   ← one of the class IDs below
   ```

**Class IDs:** `computer` | `make-up` | `wig-making` | `barbing` | `baking` | `resin-art`

### 6. Seed test data (optional)

With Firebase Admin SDK:
```bash
# Download serviceAccountKey.json from Firebase Console → Project Settings → Service accounts
node scripts/seed.js
```

### 7. Run locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

---

## ☁️ Deployment on Netlify

### Option A — Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Option B — Netlify Dashboard (recommended)
1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
3. Connect your GitHub repo
4. Build settings (auto-detected from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Add Environment Variables:
   - Site settings → **Environment variables**
   - Add all `VITE_FIREBASE_*` variables from your `.env`
6. Click **Deploy site** ✓

> **Important:** The `netlify.toml` already handles SPA routing (all 404s → index.html)

---

## 🔐 Security Rules Explained

| Collection    | Admin | Teacher (own class) | Teacher (other class) |
|---------------|-------|---------------------|-----------------------|
| `users`       | CRUD  | Read own            | No access             |
| `students`    | CRUD  | Read + Create       | No access             |
| `attendance`  | CRUD  | Read + Write        | No access             |

Key protections:
- Teachers can **only** see students enrolled in their `assignedClass`
- Teachers can **only** write attendance where `className == assignedClass`
- Attendance records are **keyed deterministically** (`studentId_class_Wweek_year`) — no duplicates possible
- `markedBy` field is **validated server-side** against `request.auth.uid`

---

## 📋 Database Schema

### `students/{id}`
```typescript
{
  id:        string,       // Firestore auto-ID
  name:      string,       // Full name
  phone:     string,       // Unique phone number
  gender:    string | null,
  classes:   string[],     // Max 2 class IDs
  createdAt: Timestamp,
}
```

### `attendance/{studentId_class_Wweek_year}`
```typescript
{
  studentId:   string,
  studentName: string,
  className:   string,
  weekNumber:  number,     // ISO week number
  year:        number,
  date:        string,     // ISO date string
  present:     boolean,
  markedBy:    string,     // Teacher UID
  submittedAt: Timestamp,
  updatedAt:   Timestamp,
}
```

### `users/{uid}`
```typescript
{
  id:            string,   // = Firebase Auth UID
  name:          string,
  email:         string,
  role:          'admin' | 'teacher',
  assignedClass: string | null,
  createdAt:     Timestamp,
}
```

---

## 🗝️ Key Logic Explained

### Week Number Generation
Uses **ISO 8601 week numbering** — Week 1 is the week containing the first Thursday of the year. This ensures consistent week numbers across all timezones and prevents attendance from being recorded in the "wrong" week.

### Duplicate Prevention
Attendance documents use a **deterministic ID**: `{studentId}_{className}_W{weekNumber}_{year}`. Using `setDoc` with `merge: true` means re-submitting updates the existing record rather than creating a duplicate.

### Real-time Updates
Firebase `onSnapshot` listeners power:
- Teacher dashboard (student list + this week's attendance)
- Admin dashboard (all students, all attendance, all users)

All listeners are cleaned up with the returned `unsubscribe` function in `useEffect` cleanup.

### Attendance Percentage
```
percentage = (present sessions / total sessions) × 100
```
Color-coded: 🟢 ≥75% · 🟡 50–74% · 🔴 <50%

---

## 🛠️ Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18 + Vite 5                 |
| Styling     | Tailwind CSS 3 + custom classes   |
| Auth        | Firebase Authentication           |
| Database    | Firebase Firestore                |
| State       | Zustand                           |
| Routing     | React Router v6                   |
| Charts      | Recharts                          |
| QR Codes    | qrcode.react                      |
| CSV Export  | PapaParse                         |
| Toast       | react-hot-toast                   |
| Icons       | Lucide React                      |
| Hosting     | Netlify                           |
| Fonts       | Playfair Display + DM Sans        |

---

## 🔧 Available Scripts

```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint check
```

---

## 🎨 Design System

**Fonts:** Playfair Display (headings) + DM Sans (body)

**Colors:**
- Deep Brown `#5A3825` — Headers, navbars, trust
- Warm Orange `#E57A06` — CTAs, highlights, energy
- Soft Cream `#F2E9DE` — Background, calm

**Component classes** (in globals.css):
- `.btn-primary` `.btn-secondary` `.btn-outline` `.btn-ghost` `.btn-danger`
- `.input-field` `.input-label` `.input-error`
- `.card` `.card-hover`
- `.class-badge`
- `.page-wrapper`
- `.section-title`

---
