// src/firebase/users.js
// User management (Firestore profiles linked to Firebase Auth)

import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from './config';

const USERS_COLLECTION = 'users';

/**
 * Sign in with email and password
 */
export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Create a new teacher/admin account (admin only)
 */
export async function createUserAccount({ email, password, name, role, assignedClass }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  await setDoc(doc(db, USERS_COLLECTION, uid), {
    id:            uid,
    name,
    email,
    role,          // 'admin' | 'teacher'
    assignedClass: assignedClass || null,
    createdAt:     serverTimestamp(),
  });

  return uid;
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid) {
  const docSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Update user profile
 */
export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), updates);
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Delete a user profile (admin only — does not delete Auth account)
 */
export async function deleteUserProfile(uid) {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}

/**
 * Real-time listener for all users (admin)
 */
export function subscribeToUsers(callback) {
  return onSnapshot(collection(db, USERS_COLLECTION), snapshot => {
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(users);
  });
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}
