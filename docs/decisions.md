# Engineering decisions

Why the app is built the way it is.

## Deterministic Attendance Document IDs
Rather than using Firestore's auto-generated IDs, each attendance record uses a structured ID: `{studentId}_{classId}_W{semesterWeek}_S{sessionNumber}`. This makes duplicate prevention a database-level guarantee rather than an application-level check — `setDoc` with `merge: true` simply updates an existing record rather than creating a duplicate.

## Semester-Relative Week Numbers
The system calculates week numbers relative to the configured semester start date rather than using ISO calendar week numbers. This ensures that Week 1 always means the first week of the current intake, regardless of when in the calendar year the semester begins. A student who joins in March and one who joins in September both experience consistent week numbering within their respective semesters.

## Batched Archive Operations
Archiving a semester involves copying and deleting potentially hundreds of documents. Firestore's `writeBatch` has a limit of 500 operations per batch. The archive service processes documents in chunks of 200 (some take two writes) with a separate batch commit per chunk, keeping the operation well within limits regardless of class size.

## Security Rule Design — Avoiding Cascading `get()` Failures
Early versions of the security rules used a `profile()` helper that called `get(users/{uid})` inside every rule evaluation. This caused a race condition: immediately after login, if the `get()` inside the rule evaluation timed out before the user document was confirmed readable, the entire rule returned `permission-denied`, crashing real-time listeners. The fix separates concerns — `signedIn()` uses only `request.auth != null` (a pure token check) for read-only public data like system settings and class config, while `isAdmin()` and `isTeacher()` (which call `get()`) are reserved for write operations and class-scoped reads where role distinction is strictly required.

## Per-Class Archiving
Rather than a single global "end semester" button, archiving operates per class. This reflects the operational reality of vocational centres where different programmes may run on different calendars. The Computer class can archive and begin a new intake while the Tailoring class is still in Week 8 of its current semester.

## Totals Written With the Register
Without Cloud Functions there's nothing on the server to keep running totals. Instead the teacher's register batch also writes that session's total, and the rules check it belongs to their class and adds up. If totals ever drift (for example after editing records by hand), **Recalculate totals** rebuilds them from the records.

## Public Sign-Up Without a Server
A sign-up is three documents written in one batch, each checked by the rules against the others. Creating `phoneIndex/{phoneKey}` fails if the number is already claimed, which makes "one person per number" a database guarantee rather than a race-prone client check. Reference codes avoid look-alike characters (no 0/O, 1/I/L) so they can be read over the phone.

## Classes as Data, With Safe Removal
The class list lives in one document, edited in a transaction so two admins can't overwrite each other. Removing a class never destroys history: a class with attendance or archives is retired instead of deleted, and removal is blocked while students, a teacher or waiting sign-ups depend on it.

## Staff Accounts Without Admin SDK
Creating a user with the client SDK signs in as that user. The app creates staff accounts on a throwaway second Firebase app instance, so the admin's own session is untouched, and sends a password-reset email so the admin never knows the password.

## Dual Admin/Teacher Role
A user with `role: 'admin'` and a non-null `assignedClass` gains access to both the Admin Dashboard and the Teacher Dashboard for their assigned class. The system detects this combination in the auth store and renders both navigation links and a dual role badge in the UI. The Firestore rules grant admin users full write access to attendance, covering both their admin and teaching responsibilities without requiring a separate teacher account.

---

*Built with React, Firebase, Tailwind CSS and Vite.*
