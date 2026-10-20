// The signed-in app frame. Desktop: a white sidebar with grouped sections and the semester at
// the bottom; search, notifications and the person's name sit at the top of each page (TopBar).
// Phones: a slim header with the same tools and a tab bar along the bottom.
import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, LogOut, MoreHorizontal } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Avatar, Dialog, LoadingList, RoleBadge, buttonVariants } from '../ui';
import { PageTransition } from '../motion';
import { cn } from '../../lib/cn';
import useAuthStore from '../../store/authStore';
import { subscribeToPendingDropRequests } from '../../firebase/dropRequests';
import { subscribeToPendingRegistrationCount } from '../../firebase/registrations';
import { subscribeToAllStudents, subscribeToStudentsByClass } from '../../firebase/students';
import { useClassLabel } from '../../store/classStore';
import { semesterRange, useProgrammeSemester } from '../../lib/useSemester';
import { ADMIN_NAV, ADMIN_PRIMARY, INVITE_ITEM, NAV_GROUPS, PROFILE_ITEM, REGISTER_ITEM, TEACHER_NAV, type NavItem } from './navigation';
import { ShellContext, type Badges, type ShellState } from './shell';
import { AccountButton, NotificationsButton, SearchButton, SearchPalette } from './TopBar';
import { useSignOut, useWho } from './account';
import type { Student } from '../../types/firestore';

/** Admins see the admin sections; anyone with a class also gets it, named after the class */
function useNavItems() {
  const profile = useAuthStore(s => s.profile);
  const isAdmin = profile?.role === 'admin';
  const classId = profile?.assignedClass ?? null;
  const classLabel = useClassLabel(classId ?? '');
  const mine = classId ? [...TEACHER_NAV.map(i => ({ ...i, label: classLabel || i.label })), INVITE_ITEM] : [];
  const items: NavItem[] = isAdmin ? [...ADMIN_NAV, REGISTER_ITEM, ...mine] : (classId ? mine : [...TEACHER_NAV, INVITE_ITEM]);
  return { items, isAdmin, classId };
}

function useBadges(isAdmin: boolean, students: Student[] | null): Badges {
  const [pendingDrops, setPendingDrops] = useState(0);
  const [pendingRegistrations, setPendingRegistrations] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    // Listen to pending items only, so reads stay proportional to what is waiting
    const offDrops = subscribeToPendingDropRequests((reqs: unknown[]) => setPendingDrops(reqs.length));
    const offRegs = subscribeToPendingRegistrationCount(setPendingRegistrations);
    return () => { offDrops(); offRegs(); };
  }, [isAdmin]);
  return { pendingDrops, pendingRegistrations, students: isAdmin ? students?.length : undefined };
}

/** Students for search and the sidebar count: everyone for admins, their own class for teachers */
function useStudents(isAdmin: boolean, classId: string | null) {
  const [students, setStudents] = useState<Student[] | null>(null);
  useEffect(() => {
    setStudents(null);
    const fail = () => setStudents([]);
    if (isAdmin) return subscribeToAllStudents(null, setStudents, fail);
    if (classId) return subscribeToStudentsByClass(classId, setStudents, fail);
    setStudents([]);
    return undefined;
  }, [isAdmin, classId]);
  return students;
}

function BadgeCount({ count, neutral, className }: { count?: number; neutral?: boolean; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn(
      'grid h-[18px] min-w-[20px] place-items-center rounded-full px-1.5 text-[0.6875rem] font-bold leading-none tabular-nums',
      neutral ? 'bg-canvas text-muted' : 'bg-accent-500 text-ink',
      className,
    )}>
      {count}<span className="sr-only">{neutral ? ' in total' : ' waiting'}</span>
    </span>
  );
}

function RoleLine() {
  const { name, role } = useWho();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size="md" className="rounded-[7px] text-white" tone="#5A3825" />
      <div className="min-w-0">
        <p className="truncate text-body font-semibold">{name}</p>
        <RoleBadge role={role} className="mt-0.5" />
      </div>
    </div>
  );
}

const isActivePath = (pathname: string, i: NavItem) => (i.end ? pathname === i.to : pathname.startsWith(i.to));

/** Where the semester stands, under the admin nav */
function SemesterCard() {
  const { semester } = useProgrammeSemester();
  if (!semester) return null;
  const { week, weeks, status, label } = semester;
  const current = status === 'ended' ? weeks : week ?? 0;
  return (
    <div className="rounded-card border border-[#E8DCCD] bg-cream p-3">
      <p className="flex items-center gap-2 text-body font-semibold">
        <CalendarDays className="h-4 w-4 text-accent-600" aria-hidden="true" />
        {status === 'active' ? `Week ${week} of ${weeks}` : status === 'ended' ? 'Semester ended' : 'Starts soon'}
      </p>
      <p className="mt-0.5 text-caption text-[#5E4A3D]">{label} {status === 'ended' ? 'ran' : 'runs'} {semesterRange(semester.semester)}.</p>
      <div className="mt-2.5 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(weeks, 1)}, minmax(0, 1fr))` }}
        role="img" aria-label={`Week ${current} of ${weeks}`}>
        {Array.from({ length: weeks }, (_, i) => (
          <span key={i} className={cn('h-[5px] rounded-full', i < current - 1 ? 'bg-primary' : i === current - 1 ? 'bg-accent-500' : 'bg-[#E3D3C1]')} />
        ))}
      </div>
      <NavLink to="/admin/classes" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'mt-3 w-full')}>
        Manage semester
      </NavLink>
    </div>
  );
}

function Sidebar({ items, badges, isAdmin }: { items: NavItem[]; badges: Badges; isAdmin: boolean }) {
  const { pathname } = useLocation();
  const groups = NAV_GROUPS.map(g => ({ title: g, items: items.filter(i => i.group === g) }));

  const link = (item: NavItem) => {
    const active = isActivePath(pathname, item);
    return (
      <li key={item.to}>
        <NavLink
          to={item.to} end={item.end}
          className={cn(
            'flex h-[36px] items-center gap-2.5 rounded-[8px] px-2.5 text-body',
            'focus-visible:outline-none focus-visible:shadow-focus',
            active ? 'bg-subtle font-semibold text-ink' : 'text-ink-2 hover:bg-canvas',
          )}
        >
          <item.icon className={cn('h-4 w-4 flex-none', active ? 'text-accent-600' : 'text-muted')} strokeWidth={1.8} aria-hidden="true" />
          <span className="flex-1 truncate">{item.label}</span>
          <BadgeCount count={item.badge && badges[item.badge]} neutral={item.badge === 'students'} />
        </NavLink>
      </li>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-line bg-white px-3 pb-3 pt-5 lg:flex print:hidden">
      <NavLink to="/" aria-label="The Gathering Place, home" className="mb-6 flex items-center gap-2.5 self-start rounded-md px-1.5 focus-visible:outline-none focus-visible:shadow-focus">
        <Logo variant="favicon" height={34} />
        <span className="font-heading text-[1.0625rem] font-bold text-primary">Gathering Place</span>
      </NavLink>
      <nav aria-label="Main" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {groups.map(g => g.items.length > 0 && (
          <div key={g.title} className="mb-5">
            <p className="mb-1.5 px-2.5 text-label font-semibold uppercase tracking-[0.04em] text-faint">{g.title}</p>
            <ul className="grid gap-0.5">{g.items.map(link)}</ul>
          </div>
        ))}
      </nav>
      {isAdmin && <SemesterCard />}
    </aside>
  );
}

function PhoneHeader() {
  return (
    <header className="flex items-center gap-1.5 border-b border-line bg-white px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)] lg:hidden print:hidden">
      <NavLink to="/" aria-label="The Gathering Place, home" className="mr-auto rounded-md focus-visible:outline-none focus-visible:shadow-focus">
        <Logo height={28} />
      </NavLink>
      <SearchButton compact />
      <NotificationsButton />
      <AccountButton compact />
    </header>
  );
}

function BottomBar({ items, badges, isAdmin }: { items: NavItem[]; badges: Badges; isAdmin: boolean }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const signOut = useSignOut();
  useEffect(() => setMoreOpen(false), [pathname]);

  const primary = isAdmin ? items.filter(i => ADMIN_PRIMARY.includes(i.to)) : items.slice(0, 3);
  const rest = items.filter(i => !primary.includes(i));
  const moreActive = rest.some(i => isActivePath(pathname, i));
  const moreBadge = rest.reduce((n, i) => n + ((i.badge && i.badge !== 'students' && badges[i.badge]) || 0), 0);

  const tab = (active: boolean, icon: ReactNode, label: string, badge?: number) => (
    <>
      <span className={cn('relative grid h-7 w-12 place-items-center rounded-full', active ? 'bg-subtle text-accent-600' : 'text-muted')}>
        {icon}
        <BadgeCount count={badge} className="absolute -right-1.5 -top-1" />
      </span>
      <span className={cn('text-[0.6875rem]', active ? 'font-semibold text-ink' : 'font-medium text-muted')}>{label}</span>
    </>
  );
  const tabClass = 'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] focus-visible:outline-none focus-visible:shadow-focus';

  return (
    <>
      <nav aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden print:hidden">
        <ul className="flex">
          {primary.map(item => (
            <li key={item.to} className="flex flex-1">
              <NavLink to={item.to} end={item.end} className={tabClass}>
                {({ isActive }) => tab(isActive, <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />, shortLabel(item.label), item.badge !== 'students' ? item.badge && badges[item.badge] : undefined)}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1">
            <button type="button" className={tabClass} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
              {tab(moreActive, <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />, 'More', moreBadge)}
            </button>
          </li>
        </ul>
      </nav>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <div className="grid gap-3">
          <RoleLine />
          <ul className="grid divide-y divide-line overflow-hidden rounded-card border border-line">
            {rest.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to} end={item.end}
                  className={({ isActive }) => cn(
                    'flex min-h-[48px] items-center gap-3 px-3 text-body font-medium',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    isActive ? 'bg-subtle font-semibold' : 'bg-white',
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] text-muted" strokeWidth={1.8} aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  <BadgeCount count={item.badge && badges[item.badge]} neutral={item.badge === 'students'} />
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to={PROFILE_ITEM.to}
                className={({ isActive }) => cn('flex min-h-[48px] items-center gap-3 px-3 text-body font-medium focus-visible:outline-none focus-visible:shadow-focus', isActive ? 'bg-subtle font-semibold' : 'bg-white')}>
                <PROFILE_ITEM.icon className="h-[18px] w-[18px] text-muted" strokeWidth={1.8} aria-hidden="true" />
                <span className="flex-1">{PROFILE_ITEM.label}</span>
              </NavLink>
            </li>
            <li>
              <button
                type="button" onClick={signOut}
                className="flex min-h-[48px] w-full items-center gap-3 bg-white px-3 text-body font-medium focus-visible:outline-none focus-visible:shadow-focus"
              >
                <LogOut className="h-[18px] w-[18px] text-muted" aria-hidden="true" /> Log out
              </button>
            </li>
          </ul>
        </div>
      </Dialog>
    </>
  );
}

/** Bottom-bar labels must fit ~70px */
function shortLabel(label: string): string {
  if (label === 'Drop requests') return 'Requests';
  if (label === 'My class') return 'Class';
  if (label === 'Invite students') return 'Invite';
  if (label === 'Add student') return 'Add';
  if (label === 'Classes & semesters') return 'Classes';
  if (label === 'Registrations') return 'Sign-ups';
  return label;
}

export default function AppShell({ children }: { children?: ReactNode }) {
  const { items, isAdmin, classId } = useNavItems();
  const students = useStudents(isAdmin, classId);
  const badges = useBadges(isAdmin, students);
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const shell = useMemo<ShellState>(() => ({
    isAdmin, badges, students, pages: [...items, PROFILE_ITEM], openSearch,
  }), [isAdmin, badges, students, items, openSearch]);

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex min-h-dvh flex-col font-body text-ink">
        <a href="#main" className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <Sidebar items={items} badges={badges} isAdmin={isAdmin} />
        <PhoneHeader />
        <main id="main" tabIndex={-1}
          className="w-full flex-1 px-4 pb-28 pt-4 focus:outline-none sm:px-6 lg:pb-8 lg:pl-[272px] lg:pr-8 lg:pt-6">
          <div className="mx-auto w-full max-w-[1320px]">
            {children ?? (
              <Suspense fallback={<LoadingList rows={4} />}>
                <PageTransition><Outlet /></PageTransition>
              </Suspense>
            )}
          </div>
        </main>
        <BottomBar items={items} badges={badges} isAdmin={isAdmin} />
        <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ShellContext.Provider>
  );
}
