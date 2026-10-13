interface ProfileLike { role?: string; assignedClass?: string | null }

/** Where a signed-in person lands: admins (including admin-teachers) on the admin home, teachers on their class */
export function homePathFor(profile: ProfileLike | null | undefined): string {
  if (!profile) return '/teacher';
  return profile.role === 'admin' ? '/admin' : '/teacher';
}
