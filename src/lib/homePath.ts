interface ProfileLike { role?: string; assignedClass?: string | null }

/** Older builds remembered which side an admin who also teaches last used; no longer read */
export const ROLE_KEY = 'gp.role';

/** Where a signed-in person lands: teachers on their class, admins on the admin overview. */
export function homePathFor(profile: ProfileLike | null | undefined): string {
  return profile?.role === 'admin' ? '/admin' : '/teacher';
}
