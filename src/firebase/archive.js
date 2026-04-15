// src/firebase/archive.js
// Per-class semester archiving: copy students + attendance → archives, then clear active

import {
  collection, getDocs, doc, setDoc, deleteDoc,
  writeBatch, query, where, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from './config';

const BATCH_SIZE = 400; // stay safely under Firestore's 500-op limit

/**
 * Build the archive key for a class + semester
 * e.g. "computer_Sem1_2025"
 */
export function buildArchiveKey(classId, semesterLabel) {
  const safe = semesterLabel.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  return `${classId}_${safe}`;
}

/**
 * Archive a single class's semester data then clear active records.
 *
 * Steps:
 *  1. Fetch all active students enrolled in classId
 *  2. Fetch all attendance records for classId
 *  3. Copy students  → studentArchives/{archiveKey}/students/{id}
 *  4. Copy attendance → attendanceArchives/{archiveKey}/{id}
 *  5. Remove classId from each student's classes[] (soft-drop from class)
 *     If classes[] becomes empty, delete the student document entirely
 *  6. Delete attendance records for classId
 *  7. Cancel pending drop requests for classId
 *
 * @param {string} classId
 * @param {string} semesterLabel   e.g. "Jan–Mar 2025"
 * @param {number} semesterNumber
 * @param {string} adminUid
 * @param {Function} onProgress    optional (message: string) => void
 */
export async function archiveClassSemester(
  classId, semesterLabel, semesterNumber, adminUid, onProgress = () => {}
) {
  const archiveKey = buildArchiveKey(classId, semesterLabel);
  const archivedAt = new Date().toISOString();
  const meta = { semesterLabel, semesterNumber, classId, archivedAt, archivedBy: adminUid };

  // ── 1. Fetch active students in this class ──────────────────────────
  onProgress('Fetching students…');
  const studentsSnap = await getDocs(
    query(collection(db, 'students'), where('classes', 'array-contains', classId))
  );
  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // ── 2. Fetch attendance for this class ──────────────────────────────
  onProgress('Fetching attendance records…');
  const attSnap = await getDocs(
    query(collection(db, 'attendance'), where('className', '==', classId))
  );
  const attRecords = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // ── 3 & 4. Archive in batches ───────────────────────────────────────
  onProgress('Archiving students…');
  await batchWrite(students, (batch, student) => {
    const archRef = doc(db, 'studentArchives', archiveKey, 'students', student.id);
    batch.set(archRef, { ...student, ...meta });
  });

  onProgress('Archiving attendance records…');
  await batchWrite(attRecords, (batch, rec) => {
    const archRef = doc(db, 'attendanceArchives', archiveKey, 'records', rec.id);
    batch.set(archRef, { ...rec, ...meta });
  });

  // Write archive metadata doc
  await setDoc(doc(db, 'archiveIndex', archiveKey), {
    ...meta,
    studentCount:    students.length,
    attendanceCount: attRecords.length,
  });

  // ── 5. Remove classId from student.classes[] (or delete if no classes left) ──
  onProgress('Updating student records…');
  await batchWrite(students, (batch, student) => {
    const remaining = (student.classes || []).filter(c => c !== classId);
    const studentRef = doc(db, 'students', student.id);
    if (remaining.length === 0) {
      // Student has no other classes — remove from active collection
      batch.delete(studentRef);
    } else {
      batch.update(studentRef, { classes: remaining });
    }
  });

  // ── 6. Delete attendance records for this class ─────────────────────
  onProgress('Clearing attendance records…');
  await batchWrite(attRecords, (batch, rec) => {
    batch.delete(doc(db, 'attendance', rec.id));
  });

  // ── 7. Cancel pending drop requests for this class ──────────────────
  onProgress('Cancelling pending drop requests…');
  const dropSnap = await getDocs(
    query(collection(db, 'dropRequests'),
      where('className', '==', classId),
      where('status', '==', 'pending'))
  );
  await batchWrite(dropSnap.docs.map(d => d.id), (batch, id) => {
    batch.update(doc(db, 'dropRequests', id), {
      status:     'cancelled',
      resolvedBy: adminUid,
      cancelledReason: 'Semester archived',
    });
  });

  onProgress('Done!');
  return { archiveKey, studentCount: students.length, attendanceCount: attRecords.length };
}

/**
 * Fetch all archive index entries (for admin archive browser)
 */
export async function getArchiveIndex() {
  const snap = await getDocs(collection(db, 'archiveIndex'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.semesterNumber - a.semesterNumber);
}

/**
 * Fetch archived students for a specific archive key
 */
export async function getArchivedStudents(archiveKey, classFilter = null) {
  let q = collection(db, 'studentArchives', archiveKey, 'students');
  const snap = await getDocs(q);
  let students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (classFilter) students = students.filter(s => (s.classes||[]).includes(classFilter));
  return students.sort((a,b) => a.name.localeCompare(b.name));
}

/**
 * Fetch archived attendance for a specific archive key
 */
export async function getArchivedAttendance(archiveKey, classFilter = null) {
  const snap = await getDocs(collection(db, 'attendanceArchives', archiveKey, 'records'));
  let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (classFilter) records = records.filter(r => r.className === classFilter);
  return records;
}

/**
 * Check if a phone number exists in any archive (for re-registration flow)
 * Returns { found: bool, archiveKey, semesterLabel, student }
 */
export async function findArchivedStudentByPhone(phone) {
  const indexes = await getArchiveIndex();
  for (const idx of indexes) {
    const students = await getArchivedStudents(idx.id);
    const match = students.find(s => s.phone === phone);
    if (match) {
      return { found: true, archiveKey: idx.id, semesterLabel: idx.semesterLabel, student: match };
    }
  }
  return { found: false };
}

// ── Internal helper: run a callback in batches of BATCH_SIZE ───────────
async function batchWrite(items, applyFn) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(item => applyFn(batch, item));
    await batch.commit();
  }
}
