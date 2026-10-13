// src/firebase/staff.ts — admins add and remove teacher and admin accounts from the app.
// Without Cloud Functions, a new account is created on a second, throwaway Firebase app so
// the admin stays signed in; the new person then sets their own password from an email.

import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db, firebaseConfig } from './config';
import type { Role } from '../types/firestore';

export interface StaffInput {
  name: string;
  email: string;
  role: Role;
  assignedClass: string | null;
}

export class StaffError extends Error {
  constructor(public code: 'email_in_use' | 'invalid_email' | 'failed', message: string) { super(message); }
}

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** Creates the sign-in account and profile, then emails a link to set a password */
export async function createStaff(input: StaffInput, adminUid: string): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const secondary = initializeApp(firebaseConfig, `staff-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, randomPassword());
    uid = cred.user.uid;
    await signOut(secondaryAuth);
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : '';
    if (code === 'auth/email-already-in-use') {
      throw new StaffError('email_in_use', 'This email already has a sign-in account. If they used to be staff, delete that account under Authentication in the Firebase console, then add them again.');
    }
    if (code === 'auth/invalid-email') throw new StaffError('invalid_email', 'Check the email address.');
    throw new StaffError('failed', 'Couldn’t create the account. Check your connection and try again.');
  } finally {
    deleteApp(secondary).catch(() => {});
  }

  await setDoc(doc(db, 'users', uid), {
    name: input.name.trim().replace(/\s+/g, ' '),
    email,
    role: input.role,
    assignedClass: input.assignedClass || null,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
  });
  await sendPasswordResetEmail(auth, email);
  return uid;
}

export async function updateStaff(uid: string, patch: Partial<Pick<StaffInput, 'name' | 'role' | 'assignedClass'>>) {
  await updateDoc(doc(db, 'users', uid), patch);
}

/** Sends a fresh "set your password" email */
export async function resendInvite(email: string) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Takes away access by deleting the profile. The sign-in account stays (the app can't
 * delete it without a server), but it opens nothing: every rule needs a profile.
 */
export async function removeStaff(uid: string) {
  await deleteDoc(doc(db, 'users', uid));
}
