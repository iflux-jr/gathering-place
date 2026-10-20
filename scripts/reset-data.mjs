#!/usr/bin/env node
// One-off reset: removes every student, teacher and record, keeping one admin account and
// the class setup (classConfig and systemSettings: the class list, semesters, sessions and
// whether sign-ups are open). It cannot be undone, so export a backup first.
//
// Dry run (default) counts what it would delete and changes nothing:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json \
//     node scripts/reset-data.mjs --keep you@example.com
// Apply (the project id must be typed out, so it can't run against the wrong project):
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json \
//     node scripts/reset-data.mjs --keep you@example.com --apply --confirm <project-id>
// Against the local emulators:
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//     node scripts/reset-data.mjs --project demo-gathering-place --keep admin@test.dev

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const arg = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const apply = args.includes('--apply');
const keepEmail = arg('--keep')?.trim().toLowerCase();
const emulated = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!keepEmail) {
  console.error('Name the account to keep: --keep you@example.com');
  process.exit(1);
}

const app = initializeApp({
  ...(emulated ? {} : { credential: applicationDefault() }),
  ...(arg('--project') ? { projectId: arg('--project') } : {}),
});
const db = getFirestore();
const auth = getAuth();

// Everything here goes. classConfig and systemSettings are deliberately absent.
const WIPE = [
  'students', 'phoneIndex', 'attendance', 'attendanceSummary', 'dropRequests',
  'registrations', 'registrationStatus', 'studentArchives', 'attendanceArchives', 'archiveIndex',
];

// ── Find the account to keep, and refuse to go on unless it is a real admin ──
let keeper;
try {
  keeper = await auth.getUserByEmail(keepEmail);
} catch {
  console.error(`No sign-in account uses ${keepEmail}. Nothing was changed.`);
  process.exit(1);
}
const keeperProfile = await db.collection('users').doc(keeper.uid).get();
if (!keeperProfile.exists || keeperProfile.get('role') !== 'admin') {
  console.error(`${keepEmail} has no admin profile in users/. Nothing was changed, so you can't lock yourself out.`);
  process.exit(1);
}

// ── Count ──
async function countTree(collection) {
  // Archives keep their records in subcollections under documents that may not exist themselves
  const refs = await db.collection(collection).listDocuments();
  let n = 0;
  for (const ref of refs) {
    const snap = await ref.get();
    if (snap.exists) n++;
    for (const sub of await ref.listCollections()) n += (await sub.count().get()).data().count;
  }
  return n;
}

const counts = {};
for (const c of WIPE) counts[c] = await countTree(c);
const otherProfiles = (await db.collection('users').get()).docs.filter(d => d.id !== keeper.uid);
counts['users (profiles)'] = otherProfiles.length;

const otherLogins = [];
let page;
do {
  page = await auth.listUsers(1000, page?.pageToken);
  otherLogins.push(...page.users.filter(u => u.uid !== keeper.uid));
} while (page.pageToken);
counts['sign-in accounts'] = otherLogins.length;

const kept = ['classConfig', 'systemSettings'];
const keptCounts = Object.fromEntries(await Promise.all(kept.map(async c => [c, (await db.collection(c).count().get()).data().count])));

// Known once Firestore has made a request
const projectId = app.options.projectId ?? db.projectId;

console.log(`\nProject: ${projectId}${emulated ? ' (emulator)' : ''}`);
console.log(`Keeping: ${keeperProfile.get('name') ?? keepEmail} <${keepEmail}>, admin`);
console.log(`Keeping: ${kept.map(c => `${c} (${keptCounts[c]})`).join(', ')}\n`);
console.log('Will delete:');
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(20)} ${v}`);
if (otherLogins.length) console.log(`\n  Sign-ins removed: ${otherLogins.map(u => u.email ?? u.uid).join(', ')}`);

if (!apply) {
  console.log('\nDry run: nothing was changed. Add --apply --confirm ' + projectId + ' to delete.');
  process.exit(0);
}

if (!emulated && arg('--confirm') !== projectId) {
  console.error(`\nTo delete, add --confirm ${projectId} (the project id typed out). Nothing was changed.`);
  process.exit(1);
}

// ── Delete ──
console.log('\nDeleting…');
for (const c of WIPE) {
  await db.recursiveDelete(db.collection(c));
  console.log(`  ✓ ${c}`);
}
for (let i = 0; i < otherProfiles.length; i += 400) {
  const batch = db.batch();
  for (const d of otherProfiles.slice(i, i + 400)) batch.delete(d.ref);
  await batch.commit();
}
console.log('  ✓ users (profiles)');
for (let i = 0; i < otherLogins.length; i += 1000) {
  const res = await auth.deleteUsers(otherLogins.slice(i, i + 1000).map(u => u.uid));
  if (res.failureCount) console.error(`  ! ${res.failureCount} sign-in accounts could not be deleted`, res.errors);
}
console.log('  ✓ sign-in accounts');
console.log(`\nDone. ${keepEmail} is the only account left.`);
