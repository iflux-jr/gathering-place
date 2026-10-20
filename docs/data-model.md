# Data model and security rules

What each Firestore collection holds, and who can read or write it. The rules themselves are in [`firestore.rules`](../firestore.rules) and are tested by `npm run test:rules`.

## Collections

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
