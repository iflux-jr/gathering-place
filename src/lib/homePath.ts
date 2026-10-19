interface ProfileLike { role?: string; assignedClass?: string | null }

/** Remembers which side an admin who also teaches last used ('admin' or 'teacher') */
export const ROLE_KEY = 'gp.role';

/**
 * Where a signed-in person lands: teachers on their class, admins on the admin overview.
 * An admin who also teaches lands where they were last (Admin or Teacher).
 */
export function homePathFor(profile: ProfileLike | null | undefined): string {
  if (!profile) return '/teacher';
  if (profile.role !== 'admin') return '/teacher';
  if (profile.assignedClass) {
    try { if (localStorage.getItem(ROLE_KEY) === 'teacher') return '/teacher'; } catch { /* no storage */ }
  }
  return '/admin';
}
