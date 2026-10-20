# Setup and deployment

Everything needed to run your own copy: the Firebase project, environment variables, deploys, and upgrading an existing install.

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

## Deployment

The project is moving from Netlify to **Firebase Hosting**, so the site, Firestore rules and indexes deploy together from one place. Until the steps below are done, Netlify keeps serving the site as before.

### Continuous integration (GitHub Actions)

`.github/workflows/ci.yml` runs on every pull request and every push to `main`: lint, type-check, unit tests, security rules tests against the Firestore emulator, and a production build. Once the secrets below exist, each pull request also gets a **preview link** (a Firebase Hosting preview channel that expires after 7 days), posted as a comment on the pull request.

`.github/workflows/deploy.yml` deploys hosting, `firestore.rules` and `firestore.indexes.json` to production after CI passes on `main`. It can also be run by hand from the **Actions** tab. Both workflows skip deploying, with a notice, until the secrets exist.

### One-time setup for Firebase Hosting deploys

1. Install the Firebase CLI (`npm install -g firebase-tools`) and run `firebase login`.
2. In the project folder, run `firebase init hosting:github`. Choose project `gathering-place-d03e7` and repository `iflux-jr/gathering-place`, and answer **No** to the build-script and deploy-on-merge questions. This creates a service account and stores it as the GitHub secret `FIREBASE_SERVICE_ACCOUNT_GATHERING_PLACE_D03E7`, which the workflows already use. Afterwards, undo the files it writes: `git checkout -- firebase.json .firebaserc` and delete `.github/workflows/firebase-hosting-pull-request.yml`.
3. The new service account (`github-action-…`) can only deploy hosting. In Google Cloud Console → IAM for the project, edit it and add the roles **Firebase Rules Admin** and **Cloud Datastore Index Admin** so the deploy can publish rules and indexes too.
4. Add the six web app values as secrets with the same names as in `.env`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Without them the site builds but can't connect to Firebase.
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

## Upgrading from the previous version

Existing data keeps working as it is: students, attendance, class settings, drop requests and archives are read unchanged, and the class list falls back to the original eight until an admin edits it. After the new version is deployed (rules and indexes included, which the deploy workflow does):

1. **Sign in as an admin and press "Recalculate totals"** on the home page once. It builds the per-session totals from attendance taken before the update. It reads the current attendance once and writes only to `attendanceSummary`.
2. **Index existing phone numbers** with the script in [Firebase Setup, step 9](#9-index-existing-students-phone-numbers-once-when-upgrading-to-self-registration): dry run first, then `--apply`. Until then, duplicates are still caught when a sign-up is accepted.
3. **Teachers' accounts are unchanged.** Teachers no longer add students; send them to **Invite students** to share the sign-up link.
4. Optionally turn on [spam protection](#10-spam-protection-optional-recommended).

## Starting over: wiping the data

`scripts/reset-data.mjs` removes every student, sign-up, attendance record, drop request, archive and staff account, and keeps one admin plus the class setup (`classConfig` and `systemSettings`). It cannot be undone, so take a Firestore export first (Firebase Console → Firestore → Import/Export).

```bash
# Dry run: counts what would go and changes nothing
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/reset-data.mjs --keep you@example.com
# Delete, with the project id typed out
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/reset-data.mjs --keep you@example.com --apply --confirm <project-id>
```

The account named with `--keep` must be an admin, so you can't lock yourself out. Afterwards, add staff again from **Settings**.
