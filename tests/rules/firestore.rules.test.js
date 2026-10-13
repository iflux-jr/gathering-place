// Security rules tests — run with `npm run test:rules` (starts the Firestore emulator).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

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
