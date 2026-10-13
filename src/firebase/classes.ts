// src/firebase/classes.ts
// The admin's list of classes (systemSettings/classes), and the checks that decide whether
// a class can be removed outright or only retired.

import {
  collection, doc, getCountFromServer, getDocs, limit, onSnapshot, query, runTransaction,
  serverTimestamp, where, writeBatch, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import {
  classIdFor, parseCatalog, serializeCatalog, type ClassEntry, type ClassUsage,
} from '../lib/classCatalog';
import type { ClassColorKey } from '../theme/classes';

const CATALOG = doc(db, 'systemSettings', 'classes');

export function subscribeToClassCatalog(cb: (classes: ClassEntry[]) => void, onError?: (e: Error) => void): Unsubscribe {
  // A missing document means nobody has edited the list yet: the defaults apply
  return onSnapshot(CATALOG, snap => cb(parseCatalog(snap.exists() ? snap.data() : null)), onError);
}

/** Read, change and write the list in one transaction, so two admins can't overwrite each other */
async function editCatalog(uid: string, change: (classes: ClassEntry[]) => ClassEntry[]) {
  return runTransaction(db, async tx => {
    const snap = await tx.get(CATALOG);
    const next = change(parseCatalog(snap.exists() ? snap.data() : null));
    tx.set(CATALOG, { ...serializeCatalog(next), updatedAt: serverTimestamp(), updatedBy: uid });
    return next;
  });
}

export async function addClass(label: string, colorKey: ClassColorKey, uid: string): Promise<string> {
  const name = label.trim().replace(/\s+/g, ' ');
  let id = '';
  await editCatalog(uid, classes => {
    if (classes.some(c => c.label.toLowerCase() === name.toLowerCase())) {
      throw new ClassError('duplicate', `There’s already a class called ${name}.`);
    }
    id = classIdFor(name, classes.map(c => c.id));
    return [...classes, { id, label: name, colorKey, status: 'active', order: classes.length }];
  });
  return id;
}

export async function updateClass(id: string, patch: Partial<Pick<ClassEntry, 'label' | 'colorKey'>>, uid: string) {
  const label = patch.label?.trim().replace(/\s+/g, ' ');
  await editCatalog(uid, classes => {
    if (label && classes.some(c => c.id !== id && c.label.toLowerCase() === label.toLowerCase())) {
      throw new ClassError('duplicate', `There’s already a class called ${label}.`);
    }
    return classes.map(c => (c.id === id ? { ...c, ...patch, ...(label ? { label } : {}) } : c));
  });
}

export async function setClassStatus(id: string, status: ClassEntry['status'], uid: string) {
  await editCatalog(uid, classes => classes.map(c => (c.id === id ? { ...c, status } : c)));
}

/** Removes a class that was never used. Callers check classUsage() first. */
export async function deleteClass(id: string, uid: string) {
  await runTransaction(db, async tx => {
    const snap = await tx.get(CATALOG);
    const next = parseCatalog(snap.exists() ? snap.data() : null).filter(c => c.id !== id);
    tx.set(CATALOG, { ...serializeCatalog(next), updatedAt: serverTimestamp(), updatedBy: uid });
    tx.delete(doc(db, 'classConfig', id));
  });
}

export class ClassError extends Error {
  constructor(public code: 'duplicate', message: string) { super(message); }
}

export async function classUsage(id: string): Promise<ClassUsage> {
  const [students, teachers, attendance, archives, pending] = await Promise.all([
    getCountFromServer(query(collection(db, 'students'), where('classes', 'array-contains', id))),
    getDocs(query(collection(db, 'users'), where('assignedClass', '==', id))),
    getDocs(query(collection(db, 'attendance'), where('className', '==', id), limit(1))),
    getDocs(query(collection(db, 'archiveIndex'), where('classId', '==', id), limit(1))),
    // Few at a time, so filtering here avoids another composite index
    getDocs(query(collection(db, 'registrations'), where('status', '==', 'pending'))),
  ]);
  return {
    students: students.data().count,
    teachers: teachers.docs.map(d => ({ id: d.id, name: (d.data().name as string) || (d.data().email as string) || 'A teacher' })),
    pendingSignups: pending.docs.filter(d => (d.data().classes as string[] | undefined)?.includes(id)).length,
    hasHistory: !attendance.empty || !archives.empty,
  };
}

/** Active students per class, counted on the server (one read per class rather than per student) */
export async function countStudentsByClass(ids: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(ids.map(id =>
    getCountFromServer(query(collection(db, 'students'), where('classes', 'array-contains', id))),
  ));
  return Object.fromEntries(ids.map((id, i) => [id, counts[i].data().count]));
}

/** Gives a class to one person and takes it from anyone who had it. Each person teaches one class. */
export async function assignTeacher(classId: string, uid: string | null, currentUids: string[]) {
  const batch = writeBatch(db);
  for (const old of currentUids) if (old !== uid) batch.update(doc(db, 'users', old), { assignedClass: null });
  if (uid) batch.update(doc(db, 'users', uid), { assignedClass: classId });
  await batch.commit();
}
