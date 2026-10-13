// Navigation for each role. Routes live in App; this decides what each person sees.
import {
  Archive, CalendarCheck, ClipboardList, Home, Inbox, LayoutGrid, QrCode, Settings, UserMinus,
  UserPlus, Users, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Key used to attach a live count badge, see AppShell */
  badge?: 'pendingDrops' | 'pendingRegistrations';
  /** Match only the exact path (for index routes like /admin) */
  end?: boolean;
}

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin',            label: 'Home',       icon: Home, end: true },
  { to: '/admin/registrations', label: 'Sign-ups', icon: Inbox, badge: 'pendingRegistrations' },
  { to: '/admin/students',   label: 'Students',   icon: Users },
  { to: '/admin/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/admin/classes',    label: 'Classes',    icon: LayoutGrid },
  { to: '/admin/requests',   label: 'Drop requests', icon: UserMinus, badge: 'pendingDrops' },
  { to: '/admin/archive',    label: 'Archive',    icon: Archive },
  { to: '/admin/settings',   label: 'Settings',   icon: Settings },
];

/** Shown in the phone bottom bar; the rest go under "More" */
export const ADMIN_PRIMARY = ['/admin', '/admin/registrations', '/admin/students', '/admin/requests'];

export const TEACHER_NAV: NavItem[] = [
  { to: '/teacher', label: 'Mark attendance', icon: CalendarCheck, end: true },
];

/** Admins add students directly, skipping review */
export const REGISTER_ITEM: NavItem = { to: '/register', label: 'Add student', icon: UserPlus };

/** Teachers share the sign-up link and QR code instead of adding students themselves */
export const INVITE_ITEM: NavItem = { to: '/invite', label: 'Invite students', icon: QrCode };
