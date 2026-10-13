#!/usr/bin/env node
// One-off migration for self-registration (Phase 2, PR 4).
//
// Gives every current student a phoneKey and a phoneIndex entry, so the public sign-up form
// can refuse numbers that already belong to a student. It only adds fields and documents;
// it never deletes or overwrites student data.
//
// Dry run (default) prints what it would do and changes nothing:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/migrate-registrations.mjs
// Apply:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/migrate-registrations.mjs --apply
// Against the local emulator:
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-registrations.mjs --project demo-gathering-place
//
// Needs Node 22.18 or later (it imports the app's TypeScript phone helper directly).

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { phoneKey } from '../src/lib/phone.ts';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const projectArg = args.includes('--project') ? args[args.indexOf('--project') + 1] : undefined;

initializeApp({
  ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }),
  ...(projectArg ? { projectId: projectArg } : {}),
});
const db = getFirestore();

const students = (await db.collection('students').get()).docs;
const index = new Map((await db.collection('phoneIndex').get()).docs.map(d => [d.id, d.data()]));

const invalid = [];          // numbers we can't read; left alone, listed for an admin to fix
const byKey = new Map();     // phoneKey -> student docs
for (const s of students) {
  const key = phoneKey(s.get('phone'));
  if (!key) { invalid.push(s); continue; }
  byKey.set(key, [...(byKey.get(key) ?? []), s]);
}

const writes = [];           // { ref, data, label }
const duplicates = [];       // [key, docs] where more than one student shares a number
const conflicts = [];        // phoneIndex already points somewhere else

for (const [key, docs] of byKey) {
  if (docs.length > 1) { duplicates.push([key, docs]); continue; }
  const s = docs[0];
  if (s.get('phoneKey') !== key) {
    writes.push({ ref: s.ref, data: { phoneKey: key }, label: `students/${s.id}.phoneKey = ${key}` });
  }
  const existing = index.get(key);
  if (!existing) {
    writes.push({
      ref: db.collection('phoneIndex').doc(key),
      data: { kind: 'student', studentId: s.id, updatedAt: FieldValue.serverTimestamp() },
      label: `phoneIndex/${key} -> student ${s.id}`,
    });
  } else if (existing.kind !== 'student' || existing.studentId !== s.id) {
    conflicts.push({ key, student: s, existing });
  }
}

const name = d => `${d.get('name') ?? '(no name)'} [${d.id}]`;
console.log(`Students read: ${students.length}`);
console.log(`Writes planned: ${writes.length}`);
for (const w of writes.slice(0, 20)) console.log(`  ${w.label}`);
if (writes.length > 20) console.log(`  …and ${writes.length - 20} more`);

if (invalid.length) {
  console.log(`\nUnreadable phone numbers (${invalid.length}), not indexed. Fix these in the app:`);
  for (const d of invalid) console.log(`  ${name(d)}: ${JSON.stringify(d.get('phone'))}`);
}
if (duplicates.length) {
  console.log(`\nNumbers shared by more than one student (${duplicates.length}), not indexed. Decide which record to keep:`);
  for (const [key, docs] of duplicates) console.log(`  ${key}: ${docs.map(name).join(', ')}`);
}
if (conflicts.length) {
  console.log(`\nNumbers already claimed in phoneIndex by something else (${conflicts.length}), left as they are:`);
  for (const c of conflicts) console.log(`  ${c.key}: ${name(c.student)} vs ${JSON.stringify(c.existing)}`);
}

if (!apply) {
  console.log('\nDry run: nothing was changed. Run again with --apply to write.');
  process.exit(0);
}

for (let i = 0; i < writes.length; i += 400) {
  const batch = db.batch();
  for (const w of writes.slice(i, i + 400)) batch.set(w.ref, w.data, { merge: true });
  await batch.commit();
  console.log(`Wrote ${Math.min(i + 400, writes.length)} of ${writes.length}`);
}
console.log('\nDone.');
