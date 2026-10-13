import { describe, expect, it } from 'vitest';
import { formatAttendanceForExport, formatStudentsForExport } from '../../src/utils/exportUtils';
import type { AttendanceRecord } from '../../src/types/firestore';

const base: AttendanceRecord = {
  studentId: 's1', studentName: 'Amara Okafor', className: 'computer',
  semesterWeek: 3, sessionNumber: 2, date: '2025-01-22T10:00:00.000Z',
  present: true, isHoliday: false, markedBy: 'uid-1',
};

describe('formatAttendanceForExport', () => {
  it('uses the semester week and session, not the removed weekNumber field', () => {
    const [row] = formatAttendanceForExport([base]);
    expect(row.Week).toBe('Week 3');
    expect(row.Session).toBe(2);
    expect(row.Class).toBe('Computer');
  });

  it('labels absences and holidays distinctly', () => {
    const rows = formatAttendanceForExport([
      { ...base, present: false },
      { ...base, present: null, isHoliday: true },
    ]);
    expect(rows.map(r => r.Status)).toEqual(['Absent', 'Holiday']);
  });

  it('shows the marker name when known', () => {
    expect(formatAttendanceForExport([base], { 'uid-1': 'Tolu' })[0]['Marked By']).toBe('Tolu');
    expect(formatAttendanceForExport([base])[0]['Marked By']).toBe('uid-1');
  });
});

describe('formatStudentsForExport', () => {
  it('exports class names and a dash for a missing date', () => {
    const [row] = formatStudentsForExport([
      { id: 'a', name: 'Ngozi Eze', phone: '08056789012', gender: null, classes: ['wig-making', 'baking'] },
    ]);
    expect(row.Classes).toBe('Wig Making, Baking');
    expect(row.Gender).toBe('Not specified');
    expect(row.Registered).toBe('—');
  });
});
