// src/firebase/attendance.js
// Updated attendance system: semester weeks, multi-session, holidays

import {
  collection, getDocs, doc,
  query, where, orderBy, setDoc, onSnapshot,
  serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getWeekNumber, getSemesterWeek } from '../utils/dateUtils';

const COL = 'attendance';

/**
 * Deterministic doc ID: studentId_classId_W{semWk}_S{session}
 * Falls back to ISO week if no semester configured
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
 */
export async function submitSessionAttendance(
  records, className, markedBy, sessionNumber, semester, isHoliday = false
) {
  const now        = new Date();
  const semWeek    = semester ? (getSemesterWeek(now, semester) || 1) : getWeekNumber(now);
  const isoWeek    = getWeekNumber(now);
  const year       = now.getFullYear();
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

  await batch.commit();
  return { semWeek, sessionNumber };
}

/**
 * Mark a single session as holiday (no student records needed — writes a sentinel doc)
 */
export async function markSessionHoliday(className, semWeek, sessionNumber, markedBy) {
  const holidayDocId = `HOLIDAY_${className.replace(/\s+/g,'_')}_W${semWeek}_S${sessionNumber}`;
  await setDoc(doc(db, COL, holidayDocId), {
    isHolidaySentinel: true,
    className,
    semesterWeek:  semWeek,
    sessionNumber,
    markedBy,
    markedAt:      serverTimestamp(),
  }, { merge: true });
}

/**
 * Get submitted sessions for a class in a given semester week
 * Returns: Set of session numbers already submitted
 */
export async function getSubmittedSessions(className, semWeek) {
  const q = query(
    collection(db, COL),
    where('className',    '==', className),
    where('semesterWeek', '==', semWeek),
  );
  const snap = await getDocs(q);
  const sessions = new Set();
  snap.docs.forEach(d => {
    const data = d.data();
    if (!data.isHolidaySentinel) sessions.add(data.sessionNumber);
  });
  return sessions;
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
export function subscribeToWeekAttendance(className, semWeek, callback) {
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
  });
}

/**
 * Real-time: all attendance records (admin)
 */
export function subscribeToAllAttendance(callback) {
  const q = query(collection(db, COL), orderBy('year', 'desc'), orderBy('semesterWeek', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs
      .filter(d => !d.data().isHolidaySentinel)
      .map(d => ({ id: d.id, ...d.data() }))
    );
  });
}

/**
 * Real-time: attendance for a student (history panel)
 */
export function subscribeToStudentAttendance(studentId, callback) {
  const q = query(collection(db, COL), where('studentId', '==', studentId));
  return onSnapshot(q, snap => {
    callback(snap.docs
      .filter(d => !d.data().isHolidaySentinel)
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.semesterWeek - a.semesterWeek) || (b.sessionNumber - a.sessionNumber))
    );
  });
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

/**
 * Weekly summary grouped by class (admin overview)
 */
export async function getWeeklySummary(semWeek, className = null) {
  let q;
  if (className) {
    q = query(collection(db, COL),
      where('semesterWeek', '==', semWeek),
      where('className', '==', className));
  } else {
    q = query(collection(db, COL), where('semesterWeek', '==', semWeek));
  }
  const snap    = await getDocs(q);
  const records = snap.docs.map(d => d.data()).filter(r => !r.isHolidaySentinel && !r.isHoliday);
  const summary = {};
  for (const r of records) {
    if (!summary[r.className]) summary[r.className] = { total: 0, present: 0, absent: 0 };
    summary[r.className].total++;
    if (r.present)       summary[r.className].present++;
    else if (!r.isHoliday) summary[r.className].absent++;
  }
  return summary;
}

// ── Backward-compat alias used by old AdminDashboard code ──
export { subscribeToAllAttendance as subscribeToClassAttendance };
export async function submitClassAttendance(records, className, markedBy) {
  return submitSessionAttendance(records, className, markedBy, 1, null, false);
}
