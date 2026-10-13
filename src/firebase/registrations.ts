// src/firebase/registrations.ts
// Student self-registration: the public form, the status page, and the admin review queue.
// See firestore.rules ("Public self-registration") for what each party may write.

import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, where, writeBatch, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { getArchiveIndex, getArchivedStudents } from './archive';
import { CLASSES, MAX_CLASSES_PER_STUDENT } from '../utils/constants';
import { formatPhone, legacyPhoneVariants, phoneKey } from '../lib/phone';
import { newRefCode } from '../lib/refCode';
import type {
  PhoneIndexEntry, Registration, RegistrationState, RegistrationStatusDoc, Student,
} from '../types/firestore';

const REGISTRATIONS = 'registrations';
const STATUS = 'registrationStatus';
const PHONE_INDEX = 'phoneIndex';

export interface ClassOption { id: string; label: string }

/** Classes people can sign up for: the admin's active list once it exists, otherwise the original eight */
export async function getJoinableClasses(): Promise<ClassOption[]> {
  const snap = await getDoc(doc(db, 'systemSettings', 'classes'));
  const ids: string[] | undefined = snap.exists() ? snap.data().activeIds : undefined;
  if (!ids) return CLASSES.map(({ id, label }) => ({ id, label }));
  const labels: Record<string, string> = Object.fromEntries(CLASSES.map(c => [c.id, c.label]));
  return ids.map(id => ({ id, label: labels[id] ?? id }));
}

// ── Public ────────────────────────────────────────────────────────────────

export interface JoinInput {
  name: string;
  phone: string;
  gender: string | null;
  classes: string[];
  ward: string;
  email: string;
}

/**
 * Sends a registration for review and returns its reference code. The batch is refused
 * when sign-ups are paused or the number already has a registration or a student.
 */
export async function submitRegistration(input: JoinInput): Promise<string> {
  const key = phoneKey(input.phone);
  if (!key) throw new Error('invalid-phone');
  const ref = newRefCode();
  const classes = [...input.classes];

  const batch = writeBatch(db);
  batch.set(doc(db, REGISTRATIONS, ref), {
    name:      input.name.trim().replace(/\s+/g, ' '),
    phone:     input.phone.trim(),
    phoneKey:  key,
    gender:    input.gender || null,
    classes,
    ward:      input.ward.trim(),
    email:     input.email.trim(),
    consent:   true,
    status:    'pending',
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, STATUS, ref), { status: 'pending', classes, createdAt: serverTimestamp() });
  batch.set(doc(db, PHONE_INDEX, key), { kind: 'pending', registrationId: ref, createdAt: serverTimestamp() });
  await batch.commit();
  return ref;
}

export async function getRegistrationStatus(ref: string): Promise<RegistrationStatusDoc | null> {
  const snap = await getDoc(doc(db, STATUS, ref));
  return snap.exists() ? (snap.data() as RegistrationStatusDoc) : null;
}

// ── Admin: queue ─────────────────────────────────────────────────────────

export function subscribeToRegistrations(
  status: RegistrationState,
  callback: (rows: Registration[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  // Pending is oldest first so nobody waits longest; reviewed lists show the latest 100
  const q = status === 'pending'
    ? query(collection(db, REGISTRATIONS), where('status', '==', 'pending'), orderBy('createdAt', 'asc'))
    : query(collection(db, REGISTRATIONS), where('status', '==', status), orderBy('reviewedAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Registration)),
    onError,
  );
}

export function subscribeToPendingRegistrationCount(callback: (n: number) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, REGISTRATIONS), where('status', '==', 'pending')),
    snap => callback(snap.size),
    () => callback(0),
  );
}

// ── Admin: checks shared by accepting and adding directly ──────────────────

export type RegistrationErrorCode = 'invalid_phone' | 'duplicate' | 'not_pending' | 'too_many_classes' | 'inactive_class';

export class RegistrationError extends Error {
  constructor(public code: RegistrationErrorCode, message: string) {
    super(message);
    this.name = 'RegistrationError';
  }
}

export type PhoneConflict =
  | { kind: 'student'; studentId: string; name?: string }
  | { kind: 'pending'; registrationId: string };

/**
 * Who already holds this number. Checks the phone index, then student records made before
 * the index existed, which stored the number as typed.
 */
export async function findPhoneConflict(key: string, ignoreRegistrationId?: string): Promise<PhoneConflict | null> {
  const idx = await getDoc(doc(db, PHONE_INDEX, key));
  if (idx.exists()) {
    const entry = idx.data() as PhoneIndexEntry;
    if (entry.kind === 'student') return { kind: 'student', studentId: entry.studentId };
    if (entry.registrationId !== ignoreRegistrationId) return { kind: 'pending', registrationId: entry.registrationId };
  }
  const students = collection(db, 'students');
  const [byKey, byPhone] = await Promise.all([
    getDocs(query(students, where('phoneKey', '==', key), limit(1))),
    getDocs(query(students, where('phone', 'in', legacyPhoneVariants(key)), limit(1))),
  ]);
  const hit = byKey.docs[0] ?? byPhone.docs[0];
  return hit ? { kind: 'student', studentId: hit.id, name: hit.data().name } : null;
}

export function conflictMessage(c: PhoneConflict): string {
  return c.kind === 'student'
    ? `${c.name ?? 'A current student'} already uses this number.`
    : 'Someone has already registered with this number and is waiting for review.';
}

export interface ArchiveMatch { archiveKey: string; semesterLabel: string; student: Student }

/**
 * Loads every archived student once and returns a lookup by phone number, so a bulk review
 * reads the archives once rather than once per person.
 */
export async function loadArchiveLookup(): Promise<(key: string) => ArchiveMatch | null> {
  const found = new Map<string, ArchiveMatch>();
  const indexes = (await getArchiveIndex()) as { id: string; semesterLabel: string }[]; // newest semester first
  for (const idx of indexes) {
    const students = (await getArchivedStudents(idx.id)) as Student[];
    for (const s of students) {
      const k = s.phoneKey ?? phoneKey(s.phone);
      if (k && !found.has(k)) found.set(k, { archiveKey: idx.id, semesterLabel: idx.semesterLabel, student: s });
    }
  }
  return key => found.get(key) ?? null;
}

function checkClasses(classes: string[], active: ClassOption[]) {
  if (classes.length < 1 || classes.length > MAX_CLASSES_PER_STUDENT) {
    throw new RegistrationError('too_many_classes', `Pick 1 or ${MAX_CLASSES_PER_STUDENT} classes.`);
  }
  const activeIds = new Set(active.map(c => c.id));
  const gone = classes.filter(c => !activeIds.has(c));
  if (gone.length) throw new RegistrationError('inactive_class', `${gone.join(', ')} is no longer running.`);
}

function archiveFields(match: ArchiveMatch | null) {
  return match
    ? { reRegistered: true, previousArchive: match.archiveKey, previousSemester: match.semesterLabel }
    : {};
}

// ── Admin: decisions ─────────────────────────────────────────────────────

export interface AcceptContext {
  adminUid: string;
  activeClasses: ClassOption[];
  archiveLookup?: (key: string) => ArchiveMatch | null;
}

/** Turns a pending registration into a student. Returns the new student's id. */
export async function acceptRegistration(reg: Registration, ctx: AcceptContext): Promise<string> {
  checkClasses(reg.classes, ctx.activeClasses);
  const conflict = await findPhoneConflict(reg.phoneKey, reg.id);
  if (conflict) throw new RegistrationError('duplicate', conflictMessage(conflict));

  const studentRef = doc(collection(db, 'students'));
  const regRef = doc(db, REGISTRATIONS, reg.id);
  const idxRef = doc(db, PHONE_INDEX, reg.phoneKey);
  const match = ctx.archiveLookup?.(reg.phoneKey) ?? null;

  await runTransaction(db, async tx => {
    const [regSnap, idxSnap] = await Promise.all([tx.get(regRef), tx.get(idxRef)]);
    if (!regSnap.exists() || regSnap.data().status !== 'pending') {
      throw new RegistrationError('not_pending', 'Someone has already reviewed this registration.');
    }
    if (idxSnap.exists()) {
      const entry = idxSnap.data() as PhoneIndexEntry;
      if (entry.kind === 'student' || entry.registrationId !== reg.id) {
        throw new RegistrationError('duplicate', conflictMessage(entry.kind === 'student'
          ? { kind: 'student', studentId: entry.studentId }
          : { kind: 'pending', registrationId: entry.registrationId }));
      }
    }
    tx.set(studentRef, {
      name:           reg.name,
      phone:          formatPhone(reg.phoneKey),
      phoneKey:       reg.phoneKey,
      gender:         reg.gender ?? null,
      classes:        reg.classes,
      ward:           reg.ward ?? '',
      email:          reg.email ?? '',
      registrationId: reg.id,
      createdAt:      serverTimestamp(),
      ...archiveFields(match),
    });
    tx.set(idxRef, { kind: 'student', studentId: studentRef.id, updatedAt: serverTimestamp() });
    tx.update(regRef, {
      status: 'accepted', studentId: studentRef.id, reviewedBy: ctx.adminUid, reviewedAt: serverTimestamp(),
    });
    tx.update(doc(db, STATUS, reg.id), { status: 'accepted', reviewedAt: serverTimestamp() });
  });
  return studentRef.id;
}

/**
 * Declines a registration. The record stays for reference; the number is freed so the person
 * can register again. The reason shows on their status page only when `share` is set.
 */
export async function declineRegistration(reg: Registration, adminUid: string, reason: string, share: boolean) {
  const regRef = doc(db, REGISTRATIONS, reg.id);
  const idxRef = doc(db, PHONE_INDEX, reg.phoneKey);
  const note = reason.trim();
  await runTransaction(db, async tx => {
    const [regSnap, idxSnap] = await Promise.all([tx.get(regRef), tx.get(idxRef)]);
    if (!regSnap.exists() || regSnap.data().status !== 'pending') {
      throw new RegistrationError('not_pending', 'Someone has already reviewed this registration.');
    }
    tx.update(regRef, {
      status: 'declined', declineReason: note, shareReason: share && !!note,
      reviewedBy: adminUid, reviewedAt: serverTimestamp(),
    });
    tx.update(doc(db, STATUS, reg.id), {
      status: 'declined', reviewedAt: serverTimestamp(), ...(share && note ? { note } : {}),
    });
    const entry = idxSnap.exists() ? (idxSnap.data() as PhoneIndexEntry) : null;
    if (entry?.kind === 'pending' && entry.registrationId === reg.id) tx.delete(idxRef);
  });
}

// ── Admin: direct registration (skips review) ─────────────────────────────

export interface DirectInput {
  name: string;
  phone: string;
  gender: string | null;
  classes: string[];
  ward?: string;
  email?: string;
}

export async function addStudentDirect(
  input: DirectInput, ctx: { adminUid: string; activeClasses: ClassOption[] }, fromArchive: ArchiveMatch | null,
): Promise<string> {
  const key = phoneKey(input.phone);
  if (!key) throw new RegistrationError('invalid_phone', 'Enter a valid phone number.');
  checkClasses(input.classes, ctx.activeClasses);
  const conflict = await findPhoneConflict(key);
  if (conflict) throw new RegistrationError('duplicate', conflictMessage(conflict));

  const studentRef = doc(collection(db, 'students'));
  const idxRef = doc(db, PHONE_INDEX, key);
  await runTransaction(db, async tx => {
    const idxSnap = await tx.get(idxRef);
    if (idxSnap.exists()) {
      const entry = idxSnap.data() as PhoneIndexEntry;
      throw new RegistrationError('duplicate', conflictMessage(entry.kind === 'student'
        ? { kind: 'student', studentId: entry.studentId }
        : { kind: 'pending', registrationId: entry.registrationId }));
    }
    tx.set(studentRef, {
      name:      input.name.trim().replace(/\s+/g, ' '),
      phone:     formatPhone(key),
      phoneKey:  key,
      gender:    input.gender || null,
      classes:   input.classes,
      ward:      input.ward?.trim() ?? '',
      email:     input.email?.trim() ?? '',
      createdAt: serverTimestamp(),
      addedBy:   ctx.adminUid,
      ...archiveFields(fromArchive),
    });
    tx.set(idxRef, { kind: 'student', studentId: studentRef.id, updatedAt: serverTimestamp() });
  });
  return studentRef.id;
}
