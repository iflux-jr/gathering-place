// src/utils/exportUtils.js
// CSV export using PapaParse

import Papa from 'papaparse';

/**
 * Download data as a CSV file
 * @param {Array<Object>} data
 * @param {string} filename
 */
export function exportToCSV(data, filename = 'export.csv') {
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

/**
 * Format students for CSV export
 */
export function formatStudentsForExport(students) {
  return students.map(s => ({
    'Full Name':    s.name,
    'Phone':        s.phone,
    'Gender':       s.gender || 'Not specified',
    'Classes':      (s.classes || []).join(', '),
    'Registered':   s.createdAt?.toDate?.()?.toLocaleDateString() || '—',
  }));
}

/**
 * Format attendance for CSV export
 */
export function formatAttendanceForExport(records) {
  return records.map(r => ({
    'Student Name': r.studentName,
    'Class':        r.className,
    'Week':         `Week ${r.weekNumber}, ${r.year}`,
    'Date':         new Date(r.date).toLocaleDateString(),
    'Present':      r.present ? 'Yes' : 'No',
    'Marked By':    r.markedBy || '—',
  }));
}
