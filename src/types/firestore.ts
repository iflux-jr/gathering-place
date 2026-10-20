// src/types/firestore.ts
// Shapes of the Firestore documents the app reads and writes.
// See docs/data-model.md for the meaning of each field.

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
  /** Digits-only international number; see src/lib/phone.ts. Missing on records made before self-registration */
  phoneKey?: string;
  ward?: string;
  email?: string;
  /** Reference code of the self-registration this student came from */
  registrationId?: string;
  /** The admin who added this student directly, skipping review */
  addedBy?: string;
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

export type RegistrationState = 'pending' | 'accepted' | 'declined';

/** registrations/{refCode}: a self-registration, private to admins */
export interface Registration {
  id: string;
  name: string;
  phone: string;
  phoneKey: string;
  gender?: string | null;
  classes: string[];
  ward?: string;
  email?: string;
  consent: true;
  status: RegistrationState;
  createdAt: DateLike;
  reviewedBy?: string;
  reviewedAt?: DateLike;
  studentId?: string;
  declineReason?: string;
  /** Whether the decline reason is shown on the public status page */
  shareReason?: boolean;
}

/** registrationStatus/{refCode}: what the student sees on the status page */
export interface RegistrationStatusDoc {
  status: RegistrationState;
  classes: string[];
  createdAt: DateLike;
  reviewedAt?: DateLike;
  note?: string;
}

/** phoneIndex/{phoneKey}: who holds a phone number, a pending registration or an active student */
export type PhoneIndexEntry =
  | { kind: 'pending'; registrationId: string; createdAt?: DateLike }
  | { kind: 'student'; studentId: string; updatedAt?: DateLike };
