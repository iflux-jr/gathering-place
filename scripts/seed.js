// scripts/seed.js
// Run this ONCE to populate fake students for testing
// Usage: node scripts/seed.js (requires firebase-admin + service account)
//
// OR you can paste this into browser console after logging in as admin
// using the Firebase client SDK (adjust imports as needed)

const FAKE_STUDENTS = [
  { name: 'Amara Okafor',       phone: '08012345678', gender: 'Female', classes: ['computer', 'resin-art'] },
  { name: 'Chukwuemeka Adeyemi',phone: '08023456789', gender: 'Male',   classes: ['barbing'] },
  { name: 'Fatima Sule',        phone: '08034567890', gender: 'Female', classes: ['make-up', 'wig-making'] },
  { name: 'Olumide Fashola',    phone: '08045678901', gender: 'Male',   classes: ['baking', 'computer'] },
  { name: 'Ngozi Eze',          phone: '08056789012', gender: 'Female', classes: ['wig-making'] },
  { name: 'Babatunde Lawal',    phone: '08067890123', gender: 'Male',   classes: ['barbing', 'resin-art'] },
  { name: 'Chioma Nwosu',       phone: '08078901234', gender: 'Female', classes: ['baking'] },
  { name: 'Emeka Obiora',       phone: '08089012345', gender: 'Male',   classes: ['computer'] },
  { name: 'Aisha Mohammed',     phone: '08090123456', gender: 'Female', classes: ['make-up'] },
  { name: 'Tunde Bankole',      phone: '08001234567', gender: 'Male',   classes: ['resin-art', 'baking'] },
];

// ── Browser console version ──
// Paste this block into the browser console while logged in as admin:

/*
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './src/firebase/config';

async function seedStudents() {
  for (const student of FAKE_STUDENTS) {
    const ref = await addDoc(collection(db, 'students'), {
      ...student,
      createdAt: serverTimestamp(),
    });
    console.log(`✅ Added: ${student.name} (${ref.id})`);
  }
  console.log('🎉 Seeding complete!');
}

seedStudents();
*/

// ── Firebase Admin SDK version ──
// Requires: npm install firebase-admin
// Requires: serviceAccountKey.json in project root

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Download from Firebase console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seed() {
  console.log('🌱 Seeding students…');
  for (const student of FAKE_STUDENTS) {
    const ref = await db.collection('students').add({
      ...student,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ ${student.name} → ${ref.id}`);
  }

  console.log('\n🌱 Seeding admin user profile…');
  // Replace with your actual admin UID from Firebase Authentication
  const ADMIN_UID = 'REPLACE_WITH_YOUR_ADMIN_UID';
  await db.collection('users').doc(ADMIN_UID).set({
    id:            ADMIN_UID,
    name:          'System Admin',
    email:         'admin@gatheringplace.com',
    role:          'admin',
    assignedClass: null,
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ Admin user profile created');

  console.log('\n🌱 Seeding teacher user profiles…');
  // Replace with actual teacher UIDs
  const TEACHERS = [
    { uid: 'TEACHER_UID_1', name: 'Mrs. Blessing Obi',    email: 'blessing@gatheringplace.com', assignedClass: 'computer' },
    { uid: 'TEACHER_UID_2', name: 'Mr. Kayode Adeniyi',   email: 'kayode@gatheringplace.com',   assignedClass: 'barbing' },
    { uid: 'TEACHER_UID_3', name: 'Mrs. Funke Adeyemi',   email: 'funke@gatheringplace.com',    assignedClass: 'make-up' },
  ];

  for (const t of TEACHERS) {
    await db.collection('users').doc(t.uid).set({
      id:            t.uid,
      name:          t.name,
      email:         t.email,
      role:          'teacher',
      assignedClass: t.assignedClass,
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Teacher: ${t.name} → ${t.assignedClass}`);
  }

  console.log('\n🎉 Seeding complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
