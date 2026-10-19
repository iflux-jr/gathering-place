// The signed-in app frame. Desktop: a white sidebar with grouped sections, the semester and the
// signed-in person at the bottom. Phones: a slim header and a tab bar along the bottom.
import { Suspense, useEffect, useId, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, LogOut, MoreHorizontal } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import toast from 'react-hot-toast';
import { Logo } from '../brand/Logo';
import { Avatar, Dialog, LoadingList, RoleBadge } from '../ui';
import { PageTransition } from '../motion';
import { motion, spring } from '../motion/config';
import { cn } from '../../lib/cn';
import useAuthStore from '../../store/authStore';
import { logoutUser } from '../../firebase/users';
import { subscribeToPendingDropRequests } from '../../firebase/dropRequests';
import { subscribeToPendingRegistrationCount } from '../../firebase/registrations';
import { useClassLabel } from '../../store/classStore';
import { ROLE_KEY } from '../../lib/homePath';
import { semesterRange, useProgrammeSemester } from '../../lib/useSemester';
import { ADMIN_NAV, ADMIN_PRIMARY, INVITE_ITEM, REGISTER_ITEM, TEACHER_NAV, type NavItem } from './navigation';

type Badges = Partial<Record<NonNullable<NavItem['badge']>, number>>;
type Mode = 'admin' | 'teacher';

const TEACHER_PATHS = ['/teacher', '/invite'];

function useNavItems() {
  const profile = useAuthStore(s => s.profile);
  const { pathname } = useLocation();
  const isAdmin = profile?.role === 'admin';
  const teaches = !!profile?.assignedClass;
  const classLabel = useClassLabel(profile?.assignedClass ?? '');
  const canSwitch = isAdmin && teaches;
  const mode: Mode = !isAdmin || (canSwitch && TEACHER_PATHS.some(p => pathname.startsWith(p))) ? 'teacher' : 'admin';

  useEffect(() => {
    if (!canSwitch) return;
    try { localStorage.setItem(ROLE_KEY, mode); } catch { /* storage unavailable: nothing to remember */ }
  }, [canSwitch, mode]);

  const items: NavItem[] = mode === 'admin'
    ? [...ADMIN_NAV, REGISTER_ITEM]
    : [...TEACHER_NAV.map(i => (canSwitch ? { ...i, label: `${classLabel} class` } : i)), INVITE_ITEM];
  return { items, isAdmin, canSwitch, mode };
}

function useBadges(isAdmin: boolean): Badges {
  const [pendingDrops, setPendingDrops] = useState(0);
  const [pendingRegistrations, setPendingRegistrations] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    // Listen to pending items only, so reads stay proportional to what is waiting
    const offDrops = subscribeToPendingDropRequests((reqs: unknown[]) => setPendingDrops(reqs.length));
    const offRegs = subscribeToPendingRegistrationCount(setPendingRegistrations);
    return () => { offDrops(); offRegs(); };
  }, [isAdmin]);
  return { pendingDrops, pendingRegistrations };
}

function BadgeCount({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn('grid h-[18px] min-w-[20px] place-items-center rounded-full bg-accent-500 px-1.5 text-[0.6875rem] font-bold leading-none text-ink tabular-nums', className)}>
      {count}<span className="sr-only"> waiting</span>
    </span>
  );
}

function useSignOut() {
  const navigate = useNavigate();
  return async () => {
    try {
      await logoutUser();
      toast.success('Signed out');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Couldn’t sign out. Check your connection and try again.');
    }
  };
}

function useRole() {
  const profile = useAuthStore(s => s.profile);
  const role = profile?.role === 'admin' ? (profile?.assignedClass ? 'admin-teacher' : 'admin') : 'teacher';
  return { name: profile?.name || 'Signed in', role } as const;
}

function RoleLine() {
  const { name, role } = useRole();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size="md" className="rounded-[7px] bg-primary text-white" tone="#5A3825" />
      <div className="min-w-0">
        <p className="truncate text-body font-semibold">{name}</p>
        <RoleBadge role={role} className="mt-0.5" />
      </div>
    </div>
  );
}

/** Admin / Teacher segmented switch for admins who also teach */
function RoleSwitch({ mode, className }: { mode: Mode; className?: string }) {
  const navigate = useNavigate();
  const id = useId();
  const options: { value: Mode; label: string; to: string }[] = [
    { value: 'admin', label: 'Admin', to: '/admin' },
    { value: 'teacher', label: 'Teacher', to: '/teacher' },
  ];
  return (
    <div role="group" aria-label="Switch role" className={cn('grid grid-cols-2 gap-1 rounded-[10px] border border-line bg-white p-1', className)}>
      {options.map(o => {
        const active = o.value === mode;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => !active && navigate(o.to)}
            className={cn(
              'relative min-h-[40px] rounded-[7px] text-small font-semibold sm:min-h-[30px]',
              'focus-visible:outline-none focus-visible:shadow-focus',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span layoutId={id} transition={spring} aria-hidden="true" className="absolute inset-0 rounded-[7px] bg-subtle" />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const menuPanel = 'glass-strong z-50 min-w-[230px] rounded-[10px] p-1 text-ink data-[state=open]:animate-fade-in motion-reduce:animate-none';
const menuItem = 'flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 rounded-[7px] px-3 text-body font-medium outline-none data-[highlighted]:bg-subtle sm:min-h-[36px]';

/** Avatar button with the signed-in person, their role and sign out (phones) */
function AccountMenu() {
  const { name } = useRole();
  const signOut = useSignOut();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="grid h-11 w-11 place-items-center rounded-[10px] focus-visible:outline-none focus-visible:shadow-focus"
        aria-label={`Account: ${name}`}
      >
        <Avatar name={name} size="md" className="rounded-[8px] text-white" tone="#5A3825" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuPanel}>
          <div className="px-3 py-2.5"><RoleLine /></div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={menuItem} onSelect={signOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
    <NavLink to="/admin/classes" className="block rounded-card border border-[#E8DCCD] bg-cream p-3 transition-colors hover:border-[#DCC9B4] focus-visible:outline-none focus-visible:shadow-focus">
      <p className="flex items-center gap-2 text-body font-semibold">
        <CalendarDays className="h-4 w-4 text-accent-600" aria-hidden="true" />
        {status === 'active' ? `Week ${week} of ${weeks}` : status === 'ended' ? 'Semester ended' : 'Starts soon'}
      </p>
      <p className="mt-0.5 text-caption text-[#5E4A3D]">{label} · {semesterRange(semester.semester)}</p>
      <div className="mt-2.5 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(weeks, 1)}, minmax(0, 1fr))` }}
        role="img" aria-label={`Week ${current} of ${weeks}`}>
        {Array.from({ length: weeks }, (_, i) => (
          <span key={i} className={cn('h-[5px] rounded-full', i < current - 1 ? 'bg-primary' : i === current - 1 ? 'bg-accent-500' : 'bg-[#E3D3C1]')} />
        ))}
      </div>
    </NavLink>
  );
}

function Sidebar({ items, badges, canSwitch, mode }: { items: NavItem[]; badges: Badges; canSwitch: boolean; mode: Mode }) {
  const { pathname } = useLocation();
  const signOut = useSignOut();
  const groups = mode === 'admin'
    ? (['General', 'Records', 'Manage'] as const).map(g => ({ title: g, items: items.filter(i => i.group === g) }))
    : [{ title: 'Teaching', items }];

  const link = (item: NavItem) => {
    const active = isActivePath(pathname, item);
    return (
      <li key={item.to}>
        <NavLink
          to={item.to} end={item.end}
          className={cn(
            'flex h-[34px] items-center gap-2.5 rounded-[7px] px-2 text-body',
            'focus-visible:outline-none focus-visible:shadow-focus',
            active ? 'bg-subtle font-semibold text-ink' : 'text-ink-2 hover:bg-canvas',
          )}
        >
          <item.icon className={cn('h-4 w-4 flex-none', active ? 'text-accent-600' : 'text-muted')} strokeWidth={1.8} aria-hidden="true" />
          <span className="flex-1 truncate">{item.label}</span>
          <BadgeCount count={item.badge && badges[item.badge]} />
        </NavLink>
      </li>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-white px-3 pb-3 pt-5 lg:flex print:hidden">
      <NavLink to="/" aria-label="The Gathering Place, home" className="mb-5 self-start rounded-md px-2 focus-visible:outline-none focus-visible:shadow-focus">
        <Logo height={30} />
      </NavLink>
      {canSwitch && <RoleSwitch mode={mode} className="mb-4" />}
      <nav aria-label="Main" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {groups.map(g => g.items.length > 0 && (
          <div key={g.title} className="mb-4">
            <p className="mb-1 px-2 text-label font-semibold uppercase text-faint">{g.title}</p>
            <ul className="grid gap-px">{g.items.map(link)}</ul>
          </div>
        ))}
      </nav>
      <div className="grid gap-2">
        {mode === 'admin' && <SemesterCard />}
        <div className="flex items-center gap-2 rounded-card border border-line p-2">
          <div className="min-w-0 flex-1"><RoleLine /></div>
          <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out"
            className="grid h-8 w-8 flex-none place-items-center rounded-[7px] text-muted hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:shadow-focus">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function PhoneHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line bg-white px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)] lg:hidden print:hidden">
      <NavLink to="/" aria-label="The Gathering Place, home" className="rounded-md focus-visible:outline-none focus-visible:shadow-focus">
        <Logo height={28} />
      </NavLink>
      <AccountMenu />
    </header>
  );
}

function BottomBar({ items, badges, canSwitch, mode }: { items: NavItem[]; badges: Badges; canSwitch: boolean; mode: Mode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const signOut = useSignOut();
  useEffect(() => setMoreOpen(false), [pathname]);

  const primary = mode === 'admin' ? items.filter(i => ADMIN_PRIMARY.includes(i.to)) : items.slice(0, 3);
  const rest = items.filter(i => !primary.includes(i));
  const moreActive = rest.some(i => isActivePath(pathname, i));
  const moreBadge = rest.reduce((n, i) => n + ((i.badge && badges[i.badge]) || 0), 0);

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
                {({ isActive }) => tab(isActive, <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />, shortLabel(item.label), item.badge && badges[item.badge])}
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
          {canSwitch && <RoleSwitch mode={mode} />}
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
                  <BadgeCount count={item.badge && badges[item.badge]} />
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button" onClick={signOut}
                className="flex min-h-[48px] w-full items-center gap-3 bg-white px-3 text-body font-medium focus-visible:outline-none focus-visible:shadow-focus"
              >
                <LogOut className="h-[18px] w-[18px] text-muted" aria-hidden="true" /> Sign out
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
  if (label === 'My class' || label.endsWith(' class')) return 'Class';
  if (label === 'Invite students') return 'Invite';
  if (label === 'Add student') return 'Add';
  if (label === 'Classes & semesters') return 'Classes';
  return label;
}

export default function AppShell({ children }: { children?: ReactNode }) {
  const { items, isAdmin, canSwitch, mode } = useNavItems();
  const badges = useBadges(isAdmin);
  return (
    <div className="flex min-h-dvh flex-col font-body text-ink">
      <a href="#main" className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar items={items} badges={badges} canSwitch={canSwitch} mode={mode} />
      <PhoneHeader />
      <main id="main" tabIndex={-1}
        className="w-full flex-1 px-4 pb-28 pt-4 focus:outline-none sm:px-6 lg:pb-8 lg:pl-[256px] lg:pr-6 lg:pt-5">
        <div className="mx-auto w-full max-w-[1280px]">
          {children ?? (
            <Suspense fallback={<LoadingList rows={4} />}>
              <PageTransition><Outlet /></PageTransition>
            </Suspense>
          )}
        </div>
      </main>
      <BottomBar items={items} badges={badges} canSwitch={canSwitch} mode={mode} />
    </div>
  );
}
