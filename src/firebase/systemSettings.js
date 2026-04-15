// src/firebase/systemSettings.js
// System-wide settings: registration control, active semester tracking

import {
  doc, setDoc, onSnapshot, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const SETTINGS_COL = 'systemSettings';
const REG_DOC      = 'registration';
const SEMESTER_DOC = 'activeSemester';

// ─────────────────────────────────────────────
// REGISTRATION CONTROL
// ─────────────────────────────────────────────

/**
 * Get current registration status (one-time)
 */
export async function getRegistrationStatus() {
  const snap = await getDoc(doc(db, SETTINGS_COL, REG_DOC));
  if (!snap.exists()) return { isOpen: true, message: '' };
  return snap.data();
}

/**
 * Real-time listener for registration status
 */
export function subscribeToRegistrationStatus(callback) {
  return onSnapshot(doc(db, SETTINGS_COL, REG_DOC), snap => {
    if (!snap.exists()) callback({ isOpen: true, message: '' });
    else callback(snap.data());
  });
}

/**
 * Set registration open or closed (admin only)
 * @param {boolean} isOpen
 * @param {string}  message  - shown to users when closed
 * @param {string}  adminUid
 */
export async function setRegistrationStatus(isOpen, message, adminUid) {
  await setDoc(doc(db, SETTINGS_COL, REG_DOC), {
    isOpen,
    message:    message || '',
    updatedBy:  adminUid,
    updatedAt:  serverTimestamp(),
    // track pause / open times for audit
    ...(isOpen
      ? { openedAt: serverTimestamp() }
      : { pausedAt: serverTimestamp() }),
  }, { merge: true });
}

// ─────────────────────────────────────────────
// ACTIVE SEMESTER TRACKING
// ─────────────────────────────────────────────

/**
 * Get current active semester info (one-time)
 */
export async function getActiveSemester() {
  const snap = await getDoc(doc(db, SETTINGS_COL, SEMESTER_DOC));
  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * Real-time listener for active semester
 */
export function subscribeToActiveSemester(callback) {
  return onSnapshot(doc(db, SETTINGS_COL, SEMESTER_DOC), snap => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/**
 * Record that a new semester has been started
 * @param {number} semesterNumber
 * @param {string} label
 * @param {string} adminUid
 */
export async function recordNewSemester(semesterNumber, label, adminUid) {
  await setDoc(doc(db, SETTINGS_COL, SEMESTER_DOC), {
    semesterNumber,
    label,
    startedAt:  serverTimestamp(),
    startedBy:  adminUid,
  });
}
