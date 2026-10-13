// Navigation for each role. Routes live in App; this decides what each person sees.
import {
  Archive, CalendarCheck, ClipboardList, Home, LayoutGrid, Settings, UserMinus,
  UserPlus, Users, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Key used to attach a live count badge, see AppShell */
  badge?: 'pendingDrops';
  /** Match only the exact path (for index routes like /admin) */
  end?: boolean;
}

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin',            label: 'Home',       icon: Home, end: true },
  { to: '/admin/students',   label: 'Students',   icon: Users },
  { to: '/admin/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/admin/classes',    label: 'Classes',    icon: LayoutGrid },
  { to: '/admin/requests',   label: 'Drop requests', icon: UserMinus, badge: 'pendingDrops' },
  { to: '/admin/archive',    label: 'Archive',    icon: Archive },
  { to: '/admin/settings',   label: 'Settings',   icon: Settings },
];

/** Shown in the phone bottom bar; the rest go under "More" */
export const ADMIN_PRIMARY = ['/admin', '/admin/students', '/admin/attendance', '/admin/requests'];

export const TEACHER_NAV: NavItem[] = [
  { to: '/teacher', label: 'Mark attendance', icon: CalendarCheck, end: true },
];

/** Registering students directly; teacher access to this is removed with self-registration */
export const REGISTER_ITEM: NavItem = { to: '/register', label: 'Register student', icon: UserPlus };
