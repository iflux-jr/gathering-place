// src/firebase/attendance.js
// Updated attendance system: semester weeks, multi-session, holidays

import {
  collection, doc, getDocs, query, where, onSnapshot, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { countMarks, summaryId } from '../lib/summaries';
import {
  getWeekNumber, getSemesterWeek, getSemesterStatus, parseLocalDate, semesterWeekStart,
} from '../utils/dateUtils';

const COL = 'attendance';

/**
 * Deterministic doc ID: studentId_classId_W{semWk}_S{session}
 */
function buildId(studentId, classId, semWeek, sessionNumber) {
  const safe = classId.replace(/\s+/g, '_');
  return `${studentId}_${safe}_W${semWeek}_S${sessionNumber}`;
}

/**
 * Submit a full session's attendance as a batch
 * @param {Array}  records         - [{ studentId, studentName, present }]
 * @param {string} className
 * @param {string} markedBy        - teacher UID
 * @param {number} sessionNumber   - 1 or 2 (etc.)
 * @param {Object} semester        - { startDate, endDate } from classConfig
 * @param {boolean} isHoliday      - mark the whole session as holiday
 * @param {number} [semesterWeek]  - week being marked; defaults to the current week.
 *                                   Earlier weeks can be caught up; future weeks can't.
 * @returns {Promise<{ semWeek: number, sessionNumber: number, queued: boolean }>}
 *   queued is true when the device is offline: the marks are saved on the device and
 *   Firestore sends them once it reconnects.
 */
export async function submitSessionAttendance(
  records, className, markedBy, sessionNumber, semester, isHoliday = false, semesterWeek = undefined
) {
  const now        = new Date();
  const thisWeek   = getSemesterWeek(now, semester);
  const lastWeek   = thisWeek ?? (getSemesterStatus(semester, now) === 'ended' ? semesterLength(semester) : null);
  const semWeek    = semesterWeek ?? thisWeek;
  if (!semWeek || !lastWeek || semWeek < 1 || semWeek > lastWeek) {
    // Never file attendance outside the semester or for a week that hasn't happened yet
    throw new Error('Attendance can only be recorded for this week or an earlier week of the semester.');
  }
  const weekStart  = semesterWeekStart(semWeek, semester) ?? now;
  const isoWeek    = getWeekNumber(weekStart);
  const year       = weekStart.getFullYear();
  const batch      = writeBatch(db);

  for (const rec of records) {
    const docId  = buildId(rec.studentId, className, semWeek, sessionNumber);
    const docRef = doc(db, COL, docId);
    batch.set(docRef, {
      studentId:     rec.studentId,
      studentName:   rec.studentName,
      className,
      semesterWeek:  semWeek,
      sessionNumber,
      isoWeek,
      year,
      date:          now.toISOString(),
      present:       isHoliday ? null : rec.present,
      isHoliday:     isHoliday,
      markedBy,
      submittedAt:   serverTimestamp(),
      updatedAt:     serverTimestamp(),
    }, { merge: true });
  }

  // The session's totals, for the admin home (see src/lib/summaries.ts)
  if (!isHoliday) {
    batch.set(doc(db, 'attendanceSummary', summaryId(className, semWeek, sessionNumber)), {
      classId: className,
      semesterWeek: semWeek,
      sessionNumber,
      ...countMarks(records.map(r => r.present)),
      markedBy,
      updatedAt: serverTimestamp(),
    });
  }

  // Offline, commit() only resolves once the server has the writes. They are already
  // safe in the device's cache, so say so rather than keep the teacher on a spinner.
  const committed = batch.commit();
  const first = await Promise.race([
    committed.then(() => 'sent'),
    new Promise(resolve => setTimeout(() => resolve('slow'), OFFLINE_WAIT_MS)),
  ]);
  if (first === 'slow' && !navigator.onLine) {
    committed.catch(err => console.error('Queued attendance was rejected when it synced', err));
    return { semWeek, sessionNumber, queued: true };
  }
  await committed;
  return { semWeek, sessionNumber, queued: false };
}

const OFFLINE_WAIT_MS = 4000;

/** Weeks in a semester, counted from its dates */
export function semesterLength(semester) {
  if (!semester?.startDate || !semester?.endDate) return 0;
  return getSemesterWeek(parseLocalDate(semester.endDate), semester) ?? 0;
}

/**
 * One-time fetch of a class's attendance this semester, for per-student rates on the roster
 */
export async function getClassAttendance(className) {
  const snap = await getDocs(query(collection(db, COL), where('className', '==', className)));
  return snap.docs
    .filter(d => !d.data().isHolidaySentinel)
    .map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Real-time: attendance for a class in current semester week
 */
export function subscribeToSessionAttendance(className, semWeek, sessionNumber, callback) {
  const q = query(
    collection(db, COL),
    where('className',    '==', className),
    where('semesterWeek', '==', semWeek),
    where('sessionNumber','==', sessionNumber),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Real-time: all attendance for a class in a semester week (all sessions)
 */
export function subscribeToWeekAttendance(className, semWeek, callback, onError) {
  const q = query(
    collection(db, COL),
    where('className',    '==', className),
    where('semesterWeek', '==', semWeek),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs
      .filter(d => !d.data().isHolidaySentinel)
      .map(d => ({ id: d.id, ...d.data() }))
    );
  }, onError);
}

/**
 * One-time: a student's attendance this semester. Admins read every class; a teacher passes
 * their class, since the rules only let them read that class's records.
 * @param {string} studentId
 * @param {string|null} [className]
 */
export async function getStudentAttendance(studentId, className = null) {
  const filters = [where('studentId', '==', studentId)];
  if (className) filters.push(where('className', '==', className));
  const snap = await getDocs(query(collection(db, COL), ...filters));
  return snap.docs
    .filter(d => !d.data().isHolidaySentinel)
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.semesterWeek - a.semesterWeek) || (b.sessionNumber - a.sessionNumber));
}

/**
 * Attendance % — excludes holiday sessions from denominator
 * @param {Array} records
 * @returns {number} 0-100
 */
export function calcAttendancePercentage(records) {
  const countable = records.filter(r => !r.isHoliday && r.present !== null);
  if (!countable.length) return 0;
  const present = countable.filter(r => r.present === true).length;
  return Math.round((present / countable.length) * 100);
}

