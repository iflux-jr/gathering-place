// src/utils/exportUtils.ts
// CSV export using PapaParse

import Papa from 'papaparse';
import type { AttendanceRecord, DateLike, Student } from '../types/firestore';
import { classLabel as catalogLabel } from '../store/classStore';

/**
 * Download data as a CSV file
 */
export function exportToCSV(data: Record<string, unknown>[], filename = 'export.csv'): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return value.toDate();
}

function formatDay(value: DateLike): string {
  const d = toDate(value);
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-NG') : '—';
}

const classLabel = (id: string) => catalogLabel(id);

/**
 * Format students for CSV export
 */
export function formatStudentsForExport(students: Student[]) {
  return students.map(s => ({
    'Full Name':  s.name,
    'Phone':      s.phone,
    'Gender':     s.gender || 'Not specified',
    'Classes':    (s.classes || []).map(classLabel).join(', '),
    'Registered': formatDay(s.createdAt),
  }));
}

/**
 * Attendance status as a word, so holiday sessions are not exported as absences
 */
export function attendanceStatusLabel(r: Pick<AttendanceRecord, 'present' | 'isHoliday'>): string {
  if (r.isHoliday)        return 'Holiday';
  if (r.present === true)  return 'Present';
  if (r.present === false) return 'Absent';
  return 'Not marked';
}

/**
 * Format attendance for CSV export
 * @param userNames optional map of user UID → display name for the "Marked By" column
 */
export function formatAttendanceForExport(
  records: AttendanceRecord[],
  userNames: Record<string, string> = {},
) {
  return records.map(r => ({
    'Student Name': r.studentName,
    'Class':        classLabel(r.className),
    'Week':         r.semesterWeek ? `Week ${r.semesterWeek}` : '—',
    'Session':      r.sessionNumber ?? '—',
    'Date':         formatDay(r.date),
    'Status':       attendanceStatusLabel(r),
    'Marked By':    userNames[r.markedBy] || r.markedBy || '—',
  }));
}
