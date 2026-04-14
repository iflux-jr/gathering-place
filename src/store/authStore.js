// src/store/authStore.js
// Zustand store for authentication state

import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserProfile } from '../firebase/users';

const useAuthStore = create((set, get) => ({
  // State
  user:        null,   // Firebase Auth user
  profile:     null,   // Firestore user profile { name, role, assignedClass }
  loading:     true,   // initial auth check in progress
  initialized: false,

  // Actions
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  /**
   * Initialize auth listener — call once at app root
   */
  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          set({ user: firebaseUser, profile, loading: false, initialized: true });
        } catch (err) {
          console.error('Failed to load user profile:', err);
          set({ user: firebaseUser, profile: null, loading: false, initialized: true });
        }
      } else {
        set({ user: null, profile: null, loading: false, initialized: true });
      }
    });
    return unsubscribe;
  },

  // Computed helpers
  isAdmin:        () => get().profile?.role === 'admin',
  isTeacher:      () => get().profile?.role === 'teacher',

  // True when user is admin AND has a class assigned (dual-role)
  isAdminTeacher: () =>
    get().profile?.role === 'admin' && !!get().profile?.assignedClass,

  // Can access teacher dashboard — either a teacher OR an admin with a class
  canTeach: () =>
    get().profile?.role === 'teacher' ||
    (get().profile?.role === 'admin' && !!get().profile?.assignedClass),

  isAuthenticated: () => !!get().user,
  assignedClass:   () => get().profile?.assignedClass || null,
}));

export default useAuthStore;
