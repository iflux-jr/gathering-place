// src/firebase/dropRequests.js
// Student drop request system

import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { updateStudent } from './students';

const DROPS_COLLECTION = 'dropRequests';

/**
 * Teacher submits a drop request
 */
export async function createDropRequest({ studentId, studentName, className, requestedBy, reason }) {
  const ref = await addDoc(collection(db, DROPS_COLLECTION), {
    studentId,
    studentName,
    className,
    requestedBy,
    reason:      reason || '',
    status:      'pending',
    resolvedBy:  null,
    resolvedAt:  null,
    rejectionReason: null,
    requestedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Admin approves a drop request — removes student from that class
 */
export async function approveDropRequest(requestId, adminUid, student) {
  // Soft-drop: remove className from student's classes array
  const updatedClasses = (student.classes || []).filter(c => {
    const req = _pendingRequests[requestId];
    return req ? c !== req.className : true;
  });

  // Get the request first to know which class to remove
  await updateDoc(doc(db, DROPS_COLLECTION, requestId), {
    status:     'approved',
    resolvedBy: adminUid,
    resolvedAt: serverTimestamp(),
  });
}

/**
 * Admin approves drop — pass className explicitly
 */
export async function approveDropRequestWithClass(requestId, adminUid, studentId, className, studentClasses) {
  const updatedClasses = (studentClasses || []).filter(c => c !== className);
  // Update student document — remove from class, mark as dropped
  await updateStudent(studentId, {
    classes: updatedClasses,
    [`droppedFrom.${className}`]: {
      droppedAt:  new Date().toISOString(),
      droppedBy:  adminUid,
      requestId,
    },
  });
  // Update drop request status
  await updateDoc(doc(db, DROPS_COLLECTION, requestId), {
    status:     'approved',
    resolvedBy: adminUid,
    resolvedAt: serverTimestamp(),
  });
}

/**
 * Admin rejects a drop request
 */
export async function rejectDropRequest(requestId, adminUid, rejectionReason = '') {
  await updateDoc(doc(db, DROPS_COLLECTION, requestId), {
    status:          'rejected',
    resolvedBy:      adminUid,
    resolvedAt:      serverTimestamp(),
    rejectionReason: rejectionReason,
  });
}

/**
 * Admin directly drops a student from a class (no request needed)
 */
export async function adminDirectDrop(studentId, className, adminUid, studentClasses) {
  const updatedClasses = (studentClasses || []).filter(c => c !== className);
  await updateStudent(studentId, {
    classes: updatedClasses,
    [`droppedFrom.${className}`]: {
      droppedAt: new Date().toISOString(),
      droppedBy: adminUid,
      requestId: null,
    },
  });
}

/**
 * Admin re-enrolls a student into a class
 */
export async function reEnrollStudent(studentId, className, adminUid, studentClasses) {
  const existing = studentClasses || [];
  if (existing.includes(className)) return; // already enrolled
  if (existing.length >= 2) throw new Error('Student already has 2 classes');
  const updatedClasses = [...existing, className];
  // Also clear the droppedFrom entry
  await updateStudent(studentId, {
    classes: updatedClasses,
    [`droppedFrom.${className}`]: null,
  });
}

/**
 * Real-time listener for drop requests — teacher sees their own class
 */
export function subscribeToDropRequests(className, callback) {
  const q = query(
    collection(db, DROPS_COLLECTION),
    where('className', '==', className),
    orderBy('requestedAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Real-time listener for all drop requests (admin)
 */
export function subscribeToAllDropRequests(callback) {
  const q = query(
    collection(db, DROPS_COLLECTION),
    orderBy('requestedAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Real-time listener for pending drop requests only
 */
export function subscribeToPendingDropRequests(callback) {
  const q = query(
    collection(db, DROPS_COLLECTION),
    where('status', '==', 'pending'),
    orderBy('requestedAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
