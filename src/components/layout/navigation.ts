// Navigation for each role. Routes live in App; this decides what each person sees.
import {
  Archive, CalendarCheck, ClipboardList, Home, Inbox, LayoutGrid, QrCode, Settings, UserMinus,
  UserPlus, Users, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Sidebar group heading on desktop */
  group?: 'General' | 'Records' | 'Manage';
  /** Key used to attach a live count badge, see AppShell */
  badge?: 'pendingDrops' | 'pendingRegistrations';
  /** Match only the exact path (for index routes like /admin) */
  end?: boolean;
}

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin',            label: 'Overview',   icon: Home, end: true, group: 'General' },
  { to: '/admin/registrations', label: 'Sign-ups', icon: Inbox, badge: 'pendingRegistrations', group: 'General' },
  { to: '/admin/requests',   label: 'Drop requests', icon: UserMinus, badge: 'pendingDrops', group: 'General' },
  { to: '/admin/attendance', label: 'Attendance', icon: ClipboardList, group: 'General' },
  { to: '/admin/students',   label: 'Students',   icon: Users, group: 'Records' },
  { to: '/admin/classes',    label: 'Classes & semesters', icon: LayoutGrid, group: 'Records' },
  { to: '/admin/archive',    label: 'Archive',    icon: Archive, group: 'Records' },
  { to: '/admin/settings',   label: 'Settings',   icon: Settings, group: 'Manage' },
];

/** Shown in the phone bottom bar; the rest go under "More" */
export const ADMIN_PRIMARY = ['/admin', '/admin/registrations', '/admin/students', '/admin/attendance'];

export const TEACHER_NAV: NavItem[] = [
  { to: '/teacher', label: 'My class', icon: CalendarCheck, end: true },
];

/** Admins add students directly, skipping review */
export const REGISTER_ITEM: NavItem = { to: '/register', label: 'Add student', icon: UserPlus, group: 'Manage' };

/** Teachers share the sign-up link and QR code instead of adding students themselves */
export const INVITE_ITEM: NavItem = { to: '/invite', label: 'Invite students', icon: QrCode };
