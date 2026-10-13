// src/types/firestore.ts
// Shapes of the Firestore documents the app reads and writes.
// See README "Database Schema" for the meaning of each field.

import type { Timestamp } from 'firebase/firestore';

/** Firestore Timestamp, ISO string, or null depending on how a field was written */
export type DateLike = Timestamp | string | Date | null | undefined;

export type Role = 'admin' | 'teacher';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignedClass: string | null;
  createdAt?: DateLike;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  classes: string[];
  createdAt?: DateLike;
  reRegistered?: boolean;
  previousArchive?: string;
  previousSemester?: string;
  droppedFrom?: Record<string, { droppedAt: string; droppedBy: string; requestId: string | null } | null>;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  className: string;
  semesterWeek: number;
  sessionNumber: number;
  isoWeek?: number;
  year?: number;
  date: string;
  present: boolean | null;
  isHoliday: boolean;
  markedBy: string;
  submittedAt?: DateLike;
  updatedAt?: DateLike;
}

export interface Semester {
  startDate: string;
  endDate: string;
  label?: string;
  totalWeeks?: number;
}

export interface Holiday {
  key: string;
  semesterWeek: number;
  sessionNumber: number;
  markedBy: string;
  markedAt: string;
}

export interface ClassConfig {
  id?: string;
  sessionsPerWeek?: number;
  semester?: Semester;
  holidays?: Holiday[];
  updatedAt?: DateLike;
  updatedBy?: string;
}

export type DropStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface DropRequest {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  requestedBy: string;
  reason: string;
  status: DropStatus;
  resolvedBy: string | null;
  resolvedAt: DateLike;
  rejectionReason: string | null;
  requestedAt: DateLike;
}
