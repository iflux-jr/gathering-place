// Security rules tests — run with `npm run test:rules` (starts the Firestore emulator).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, writeBatch, serverTimestamp, deleteDoc,
} from 'firebase/firestore';

let env;

const ADMIN   = 'admin-uid';
const TEACHER = 'teacher-uid';       // teaches computer
const OTHER   = 'other-teacher-uid'; // teaches baking

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-gathering-place',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', ADMIN),   { role: 'admin',   assignedClass: null });
    await setDoc(doc(db, 'users', TEACHER), { role: 'teacher', assignedClass: 'computer' });
    await setDoc(doc(db, 'users', OTHER),   { role: 'teacher', assignedClass: 'baking' });
    await setDoc(doc(db, 'classConfig', 'computer'), {
      sessionsPerWeek: 2,
      semester: { startDate: '2025-01-06', endDate: '2025-03-30', label: 'Jan–Mar 2025' },
      holidays: [],
    });
    await setDoc(doc(db, 'students', 'stu-1'), { name: 'Amara', phone: '08012345678', classes: ['computer'] });
    await setDoc(doc(db, 'students', 'stu-2'), { name: 'Chioma', phone: '08078901234', classes: ['baking'] });
  });
});

const as = uid => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const holiday = { key: 'W3_S1', semesterWeek: 3, sessionNumber: 1, markedBy: TEACHER, markedAt: '2025-01-20T09:00:00Z' };

describe('classConfig holidays', () => {
  it('lets a teacher add a holiday to their own class', async () => {
    await assertSucceeds(updateDoc(doc(as(TEACHER), 'classConfig', 'computer'), {
      holidays: [holiday], updatedAt: new Date(),
    }));
  });

  it('lets a teacher save a holiday with setDoc merge, as the app does', async () => {
    await assertSucceeds(setDoc(doc(as(TEACHER), 'classConfig', 'computer'), {
      holidays: [holiday], updatedAt: new Date(),
    }, { merge: true }));
  });

  it("refuses a teacher changing another class's holidays", async () => {
    await assertFails(updateDoc(doc(as(OTHER), 'classConfig', 'computer'), { holidays: [holiday] }));
  });

  it('refuses a teacher changing semester settings', async () => {
    await assertFails(updateDoc(doc(as(TEACHER), 'classConfig', 'computer'), { sessionsPerWeek: 5 }));
  });

  it('refuses a teacher creating a class config', async () => {
    await assertFails(setDoc(doc(as(TEACHER), 'classConfig', 'computer-2'), { holidays: [holiday] }));
  });

  it('lets an admin change any class config', async () => {
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'classConfig', 'computer'), { sessionsPerWeek: 3 }));
  });

  it('refuses signed-out users', async () => {
    await assertFails(getDoc(doc(anon(), 'classConfig', 'computer')));
  });
});

describe('students', () => {
  it("lets a teacher list their own class's students", async () => {
    await assertSucceeds(getDocs(query(collection(as(TEACHER), 'students'),
      where('classes', 'array-contains', 'computer'))));
  });

  it('refuses a teacher reading another class', async () => {
    await assertFails(getDoc(doc(as(TEACHER), 'students', 'stu-2')));
  });

  it('refuses signed-out users', async () => {
    await assertFails(getDoc(doc(anon(), 'students', 'stu-1')));
  });
});

describe('attendance', () => {
  const record = (markedBy, className = 'computer') => ({
    studentId: 'stu-1', studentName: 'Amara', className, semesterWeek: 3, sessionNumber: 1,
    present: true, isHoliday: false, markedBy, date: '2025-01-20T09:00:00Z',
  });

  it('lets a teacher mark their own class', async () => {
    await assertSucceeds(setDoc(doc(as(TEACHER), 'attendance', 'stu-1_computer_W3_S1'), record(TEACHER)));
  });

  it('refuses a teacher marking another class', async () => {
    await assertFails(setDoc(doc(as(TEACHER), 'attendance', 'stu-2_baking_W3_S1'), record(TEACHER, 'baking')));
  });

  it('refuses marking on behalf of someone else', async () => {
    await assertFails(setDoc(doc(as(TEACHER), 'attendance', 'stu-1_computer_W3_S1'), record(OTHER)));
  });
});

describe('students', () => {
  it('refuses a teacher adding a student, now that students register themselves', async () => {
    await assertFails(setDoc(doc(as(TEACHER), 'students', 'stu-new'), { name: 'New', phone: '08011111111', classes: ['computer'] }));
  });

  it('lets an admin add a student directly', async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), 'students', 'stu-new'), { name: 'New', phone: '08011111111', classes: ['computer'] }));
  });
});

// The public sign-up form writes these three documents in one batch
function joinBatch(db, ref = 'ABCD2345', overrides = {}, opts = {}) {
  const reg = {
    name: 'Ngozi Eze', phone: '0803 123 4567', phoneKey: '2348031234567', gender: 'Female',
    classes: ['computer', 'baking'], ward: 'Ikeja Ward', email: '', consent: true,
    status: 'pending', createdAt: serverTimestamp(), ...overrides,
  };
  const batch = writeBatch(db);
  batch.set(doc(db, 'registrations', ref), reg);
  if (!opts.skipStatus) {
    batch.set(doc(db, 'registrationStatus', ref), { status: 'pending', classes: reg.classes, createdAt: serverTimestamp() });
  }
  if (!opts.skipPhone) {
    batch.set(doc(db, 'phoneIndex', opts.phoneKey ?? reg.phoneKey), { kind: 'pending', registrationId: ref, createdAt: serverTimestamp() });
  }
  return batch.commit();
}

describe('public registration', () => {
  it('lets a signed-out visitor submit a complete registration', async () => {
    await assertSucceeds(joinBatch(anon()));
  });

  it('lets them read their status with the code, but not list statuses', async () => {
    await joinBatch(anon());
    await assertSucceeds(getDoc(doc(anon(), 'registrationStatus', 'ABCD2345')));
    await assertFails(getDocs(collection(anon(), 'registrationStatus')));
  });

  it('keeps registrations and the phone index private', async () => {
    await joinBatch(anon());
    await assertFails(getDoc(doc(anon(), 'registrations', 'ABCD2345')));
    await assertFails(getDoc(doc(anon(), 'phoneIndex', '2348031234567')));
    await assertFails(getDoc(doc(as(TEACHER), 'registrations', 'ABCD2345')));
  });

  it('refuses a second registration with the same number', async () => {
    await joinBatch(anon());
    await assertFails(joinBatch(anon(), 'WXYZ6789'));
  });

  it('refuses a number that already belongs to a student', async () => {
    await env.withSecurityRulesDisabled(ctx =>
      setDoc(doc(ctx.firestore(), 'phoneIndex', '2348031234567'), { kind: 'student', studentId: 'stu-1' }));
    await assertFails(joinBatch(anon()));
  });

  it('refuses a registration without its status or phone claim', async () => {
    await assertFails(joinBatch(anon(), 'ABCD2345', {}, { skipStatus: true }));
    await assertFails(joinBatch(anon(), 'ABCD2345', {}, { skipPhone: true }));
  });

  it('refuses a phone claim under a different number', async () => {
    await assertFails(joinBatch(anon(), 'ABCD2345', {}, { phoneKey: '2348099999999' }));
  });

  it('refuses re-claiming a number with an older registration', async () => {
    await joinBatch(anon());
    // an admin declined it and freed the number
    await env.withSecurityRulesDisabled(ctx => deleteDoc(doc(ctx.firestore(), 'phoneIndex', '2348031234567')));
    await assertFails(setDoc(doc(anon(), 'phoneIndex', '2348031234567'),
      { kind: 'pending', registrationId: 'ABCD2345', createdAt: serverTimestamp() }));
  });

  it.each([
    ['no consent', { consent: false }],
    ['three classes', { classes: ['computer', 'baking', 'barbing'] }],
    ['no classes', { classes: [] }],
    ['the same class twice', { classes: ['computer', 'computer'] }],
    ['an unknown class', { classes: ['juggling'] }],
    ['an already accepted status', { status: 'accepted' }],
    ['a made-up gender', { gender: 'Robot' }],
    ['a bad email', { email: 'not-an-email' }],
    ['an extra field', { studentId: 'stu-1' }],
    ['a one-letter name', { name: 'A' }],
    ['a client-chosen time', { createdAt: new Date('2020-01-01') }],
  ])('refuses %s', async (_label, overrides) => {
    await assertFails(joinBatch(anon(), 'ABCD2345', overrides));
  });

  it('refuses a malformed reference code', async () => {
    await assertFails(joinBatch(anon(), 'abcd-1234'));
  });

  it('accepts an optional email when it looks right', async () => {
    await assertSucceeds(joinBatch(anon(), 'ABCD2345', { email: 'ngozi@example.com' }));
  });

  it('follows the active class list once an admin manages classes', async () => {
    await env.withSecurityRulesDisabled(ctx =>
      setDoc(doc(ctx.firestore(), 'systemSettings', 'classes'), { activeIds: ['computer', 'pottery'] }));
    await assertFails(joinBatch(anon(), 'ABCD2345', { classes: ['baking'] }));
    await assertSucceeds(joinBatch(anon(), 'WXYZ6789', { classes: ['pottery'], phoneKey: '2348022222222' }));
  });

  it('refuses everything while sign-ups are paused', async () => {
    await env.withSecurityRulesDisabled(ctx =>
      setDoc(doc(ctx.firestore(), 'systemSettings', 'registration'), { isOpen: false, message: 'Back in January' }));
    await assertSucceeds(getDoc(doc(anon(), 'systemSettings', 'registration')));
    await assertFails(joinBatch(anon()));
  });

  it('keeps other settings private to signed-in staff', async () => {
    await env.withSecurityRulesDisabled(ctx =>
      setDoc(doc(ctx.firestore(), 'systemSettings', 'activeSemester'), { label: 'x' }));
    await assertFails(getDoc(doc(anon(), 'systemSettings', 'activeSemester')));
  });

  it('refuses signed-out edits after submitting', async () => {
    await joinBatch(anon());
    await assertFails(updateDoc(doc(anon(), 'registrations', 'ABCD2345'), { name: 'Changed' }));
    await assertFails(updateDoc(doc(anon(), 'registrationStatus', 'ABCD2345'), { status: 'accepted' }));
  });

  it('lets an admin review the queue', async () => {
    await joinBatch(anon());
    await assertSucceeds(getDocs(query(collection(as(ADMIN), 'registrations'), where('status', '==', 'pending'))));
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'registrations', 'ABCD2345'), { status: 'accepted' }));
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'registrationStatus', 'ABCD2345'), { status: 'accepted' }));
  });
});
