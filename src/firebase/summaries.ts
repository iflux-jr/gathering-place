// src/firebase/summaries.ts — per-session attendance totals for the admin home
import { collection, doc, getDocs, onSnapshot, serverTimestamp, writeBatch, type Unsubscribe } from 'firebase/firestore';
import { db } from './config';
import { summarise, summaryId, type SessionSummary } from '../lib/summaries';

const COL = 'attendanceSummary';

export function subscribeToSummaries(cb: (rows: SessionSummary[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, COL), snap => cb(snap.docs.map(d => d.data() as SessionSummary)), onError);
}

/**
 * Rebuilds every total from the attendance records. Reads all of this semester's records
 * once, so it's for after the update that introduces totals, or if numbers ever look off.
 * Returns how many sessions were written.
 */
export async function rebuildSummaries(): Promise<number> {
  const [records, existing] = await Promise.all([getDocs(collection(db, 'attendance')), getDocs(collection(db, COL))]);
  const fresh = summarise(records.docs.map(d => d.data() as Parameters<typeof summarise>[0][number]));
  const keep = new Set(fresh.map(s => summaryId(s.classId, s.semesterWeek, s.sessionNumber)));
  const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [
    ...fresh.map(s => (b: ReturnType<typeof writeBatch>) =>
      b.set(doc(db, COL, summaryId(s.classId, s.semesterWeek, s.sessionNumber)), { ...s, updatedAt: serverTimestamp() })),
    ...existing.docs.filter(d => !keep.has(d.id)).map(d => (b: ReturnType<typeof writeBatch>) => b.delete(d.ref)),
  ];
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach(op => op(batch));
    await batch.commit();
  }
  return fresh.length;
}
