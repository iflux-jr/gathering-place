// src/firebase/students.js
// All Firestore operations for student management

import {
  collection, addDoc, getDocs, getDoc, doc,
  query, where, orderBy, limit, startAfter,
  serverTimestamp, updateDoc, deleteDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from './config';

const STUDENTS_COLLECTION = 'students';
const PAGE_SIZE = 20;

/**
 * Register a new student
 * @param {Object} studentData - { name, phone, gender, classes }
 * @returns {Promise<string>} - The new document ID
 */
export async function registerStudent(studentData) {
  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
    ...studentData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all students (admin only)
 * @param {string|null} classFilter - Optional class name to filter by
 * @returns {Promise<Array>}
 */
export async function getAllStudents(classFilter = null) {
  let q;
  if (classFilter) {
    q = query(
      collection(db, STUDENTS_COLLECTION),
      where('classes', 'array-contains', classFilter),
      orderBy('name')
    );
  } else {
    q = query(collection(db, STUDENTS_COLLECTION), orderBy('name'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get students for a specific class (teacher use)
 * @param {string} className
 * @param {DocumentSnapshot|null} lastDoc - For pagination
 * @returns {Promise<{ students: Array, lastDoc: DocumentSnapshot|null }>}
 */
export async function getStudentsByClass(className, lastDoc = null) {
  let q = query(
    collection(db, STUDENTS_COLLECTION),
    where('classes', 'array-contains', className),
    orderBy('name'),
    limit(PAGE_SIZE)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snapshot = await getDocs(q);
  const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  return { students, lastDoc: nextLastDoc, hasMore: snapshot.docs.length === PAGE_SIZE };
}

/**
 * Real-time listener for students in a class
 * @param {string} className
 * @param {Function} callback
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToStudentsByClass(className, callback) {
  const q = query(
    collection(db, STUDENTS_COLLECTION),
    where('classes', 'array-contains', className),
    orderBy('name')
  );
  return onSnapshot(q, snapshot => {
    const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(students);
  });
}

/**
 * Real-time listener for all students (admin)
 * @param {string|null} classFilter
 * @param {Function} callback
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToAllStudents(classFilter, callback) {
  let q;
  if (classFilter) {
    q = query(
      collection(db, STUDENTS_COLLECTION),
      where('classes', 'array-contains', classFilter),
      orderBy('name')
    );
  } else {
    q = query(collection(db, STUDENTS_COLLECTION), orderBy('name'));
  }
  return onSnapshot(q, snapshot => {
    const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(students);
  });
}

/**
 * Get a single student by ID
 * @param {string} studentId
 * @returns {Promise<Object|null>}
 */
export async function getStudentById(studentId) {
  const docSnap = await getDoc(doc(db, STUDENTS_COLLECTION, studentId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Update a student record
 * @param {string} studentId
 * @param {Object} updates
 */
export async function updateStudent(studentId, updates) {
  await updateDoc(doc(db, STUDENTS_COLLECTION, studentId), updates);
}

/**
 * Delete a student record (admin only)
 * @param {string} studentId
 */
export async function deleteStudent(studentId) {
  await deleteDoc(doc(db, STUDENTS_COLLECTION, studentId));
}

/**
 * Check if phone number already exists
 * @param {string} phone
 * @returns {Promise<boolean>}
 */
export async function phoneExists(phone) {
  const q = query(collection(db, STUDENTS_COLLECTION), where('phone', '==', phone));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Check if phone number exists ONLY in active students collection.
 * Used during registration — archived students with same phone CAN re-register.
 * @param {string} phone
 * @returns {Promise<boolean>}
 */
export async function phoneExistsActive(phone) {
  const q = query(collection(db, STUDENTS_COLLECTION), where('phone', '==', phone));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Register a student, optionally carrying forward archive metadata
 * @param {Object} studentData
 * @param {Object|null} fromArchive  — { archiveKey, semesterLabel } if re-registering
 */
export async function registerStudentWithHistory(studentData, fromArchive = null) {
  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
    ...studentData,
    createdAt:   serverTimestamp(),
    ...(fromArchive ? {
      reRegistered:     true,
      previousArchive:  fromArchive.archiveKey,
      previousSemester: fromArchive.semesterLabel,
    } : {}),
  });
  return docRef.id;
}
