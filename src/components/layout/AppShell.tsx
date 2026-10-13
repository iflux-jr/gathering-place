// The signed-in app frame, after the references: a dark icon sidebar on desktop and
// a bottom tab bar on phones, around a warm canvas.
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo } from '../brand/Logo';
import { Avatar, Dialog, LoadingList, RoleBadge } from '../ui';
import { cn } from '../../lib/cn';
import useAuthStore from '../../store/authStore';
import { logoutUser } from '../../firebase/users';
import { subscribeToPendingDropRequests } from '../../firebase/dropRequests';
import { subscribeToPendingRegistrationCount } from '../../firebase/registrations';
import { useClassLabel } from '../../store/classStore';
import { ADMIN_NAV, ADMIN_PRIMARY, INVITE_ITEM, REGISTER_ITEM, TEACHER_NAV, type NavItem } from './navigation';

type Badges = Partial<Record<NonNullable<NavItem['badge']>, number>>;

function useNavItems() {
  const profile = useAuthStore(s => s.profile);
  const isAdmin = profile?.role === 'admin';
  const teaches = !!profile?.assignedClass;
  const classLabel = useClassLabel(profile?.assignedClass ?? '');

  const items: NavItem[] = [];
  if (isAdmin) items.push(...ADMIN_NAV);
  if (teaches || !isAdmin) {
    items.push(...TEACHER_NAV.map(i => (isAdmin && teaches ? { ...i, label: `${classLabel} class` } : i)));
  }
  // Admins add students directly; teachers share the sign-up link instead
  items.push(isAdmin ? REGISTER_ITEM : INVITE_ITEM);
  if (isAdmin && teaches) items.push(INVITE_ITEM);
  return { items, isAdmin, teaches };
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
    <span className={cn('rounded-full bg-flame-500 px-1.5 py-0.5 text-caption font-bold leading-none text-ink tabular-nums', className)}>
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

function RoleLine() {
  const profile = useAuthStore(s => s.profile);
  const role = profile?.role === 'admin' ? (profile?.assignedClass ? 'admin-teacher' : 'admin') : 'teacher';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={profile?.name || 'User'} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-small font-bold">{profile?.name || 'Signed in'}</p>
        <RoleBadge role={role} className="mt-0.5" />
      </div>
    </div>
  );
}

function Sidebar({ items, badges }: { items: NavItem[]; badges: Badges }) {
  const signOut = useSignOut();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 flex-none flex-col gap-6 bg-ink px-4 py-6 text-white lg:flex print:hidden">
      <NavLink to="/" className="rounded-md px-2 focus-visible:outline-none focus-visible:shadow-focus" aria-label="The Gathering Place, home">
        <Logo on="dark" height={30} />
      </NavLink>
      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <ul className="grid gap-1">
          {items.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex min-h-touch items-center gap-3 rounded-md px-3 text-small font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  isActive ? 'bg-lime text-ink' : 'text-[#D9D5CB] hover:bg-ink-2 hover:text-white',
                )}
              >
                <item.icon className="h-5 w-5 flex-none" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <BadgeCount count={item.badge && badges[item.badge]} />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="grid gap-3 rounded-card bg-ink-2 p-3">
        <RoleLine />
        <button
          type="button" onClick={signOut}
          className="flex min-h-touch items-center gap-2 rounded-md px-2 text-small font-semibold text-[#D9D5CB] hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:shadow-focus"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 rounded-b-frame bg-ink px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] text-white lg:hidden print:hidden">
      <NavLink to="/" aria-label="The Gathering Place, home" className="rounded-md focus-visible:outline-none focus-visible:shadow-focus">
        <Logo on="dark" height={28} />
      </NavLink>
    </header>
  );
}

function BottomBar({ items, badges }: { items: NavItem[]; badges: Badges }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const signOut = useSignOut();
  useEffect(() => setMoreOpen(false), [location.pathname]);

  const isAdminNav = items.some(i => i.to === '/admin');
  const primary = isAdminNav ? items.filter(i => ADMIN_PRIMARY.includes(i.to)) : items.slice(0, 3);
  const rest = items.filter(i => !primary.includes(i));
  const moreActive = rest.some(i => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));
  const moreBadge = rest.reduce((n, i) => n + ((i.badge && badges[i.badge]) || 0), 0);

  const tabClass = (active: boolean) => cn(
    'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-bold',
    'focus-visible:outline-none focus-visible:shadow-focus',
    active ? 'text-ink' : 'text-[#D9D5CB]',
  );
  const pill = (active: boolean) => cn('grid h-8 w-14 place-items-center rounded-full transition-colors', active && 'bg-lime');

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 rounded-t-frame bg-ink px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1.5 lg:hidden print:hidden">
        <ul className="flex">
          {primary.map(item => (
            <li key={item.to} className="flex flex-1">
              <NavLink to={item.to} end={item.end} className={({ isActive }) => tabClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <span className={pill(isActive)}>
                      <item.icon className={cn('h-5 w-5', isActive ? 'text-ink' : 'text-white')} aria-hidden="true" />
                    </span>
                    <span className={isActive ? 'text-white' : undefined}>{shortLabel(item.label)}</span>
                    <BadgeCount count={item.badge && badges[item.badge]} className="absolute right-[18%] top-0" />
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1">
            <button type="button" className={tabClass(moreActive)} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
              <span className={pill(moreActive)}>
                <MoreHorizontal className={cn('h-5 w-5', moreActive ? 'text-ink' : 'text-white')} aria-hidden="true" />
              </span>
              <span className={moreActive ? 'text-white' : undefined}>More</span>
              <BadgeCount count={moreBadge} className="absolute right-[18%] top-0" />
            </button>
          </li>
        </ul>
      </nav>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <div className="grid gap-4">
          <RoleLine />
          <ul className="grid gap-1.5">
            {rest.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to} end={item.end}
                  className={({ isActive }) => cn(
                    'flex min-h-[52px] items-center gap-3 rounded-md border-1.5 px-4 text-body font-semibold',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    isActive ? 'border-ink bg-lime' : 'border-line hover:border-ink',
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  <BadgeCount count={item.badge && badges[item.badge]} />
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button" onClick={signOut}
                className="flex min-h-[52px] w-full items-center gap-3 rounded-md border-1.5 border-line px-4 text-body font-semibold hover:border-ink focus-visible:outline-none focus-visible:shadow-focus"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" /> Sign out
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
  if (label === 'Mark attendance' || label.endsWith(' class')) return 'Attendance';
  if (label === 'Register student') return 'Register';
  return label;
}

export default function AppShell({ children }: { children?: ReactNode }) {
  const { items, isAdmin } = useNavItems();
  const badges = useBadges(isAdmin);
  return (
    <div className="flex min-h-dvh bg-canvas font-body text-ink">
      <a href="#main" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar items={items} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 focus:outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children ?? (
            <Suspense fallback={<LoadingList rows={4} />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
      <BottomBar items={items} badges={badges} />
    </div>
  );
}
