// src/firebase/classConfig.js
// Class configuration: semester dates, sessions per week, holidays

import {
  doc, getDoc, setDoc, onSnapshot,
  collection, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const CONFIG_COLLECTION = 'classConfig';

/**
 * Get config for one class
 */
export async function getClassConfig(classId) {
  const snap = await getDoc(doc(db, CONFIG_COLLECTION, classId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Save/update config for a class (admin only)
 * @param {string} classId
 * @param {Object} config - { sessionsPerWeek, semester: { startDate, endDate, label }, updatedBy }
 */
export async function saveClassConfig(classId, config) {
  await setDoc(
    doc(db, CONFIG_COLLECTION, classId),
    { ...config, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Real-time listener for one class config
 */
export function subscribeToClassConfig(classId, callback) {
  return onSnapshot(doc(db, CONFIG_COLLECTION, classId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Real-time listener for ALL class configs (admin dashboard)
 */
export function subscribeToAllClassConfigs(callback) {
  return onSnapshot(collection(db, CONFIG_COLLECTION), snap => {
    const configs = {};
    snap.docs.forEach(d => { configs[d.id] = { id: d.id, ...d.data() }; });
    callback(configs);
  });
}

/**
 * Get all configs (one-time fetch)
 */
export async function getAllClassConfigs() {
  const snap = await getDocs(collection(db, CONFIG_COLLECTION));
  const configs = {};
  snap.docs.forEach(d => { configs[d.id] = { id: d.id, ...d.data() }; });
  return configs;
}

/**
 * Add or remove a holiday for a specific class + semester week + session
 */
export async function setHoliday(classId, semesterWeek, sessionNumber, isHoliday, markedBy) {
  const config = await getClassConfig(classId) || {};
  const holidays = config.holidays || [];
  const key = `W${semesterWeek}_S${sessionNumber}`;

  let updated;
  if (isHoliday) {
    const exists = holidays.find(h => h.key === key);
    if (!exists) {
      updated = [...holidays, { key, semesterWeek, sessionNumber, markedBy, markedAt: new Date().toISOString() }];
    } else {
      updated = holidays;
    }
  } else {
    updated = holidays.filter(h => h.key !== key);
  }

  await setDoc(
    doc(db, CONFIG_COLLECTION, classId),
    { holidays: updated, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Check if a specific session is a holiday
 */
export function isHolidaySession(config, semesterWeek, sessionNumber) {
  if (!config?.holidays) return false;
  const key = `W${semesterWeek}_S${sessionNumber}`;
  return config.holidays.some(h => h.key === key);
}
