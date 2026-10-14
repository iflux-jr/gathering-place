// The signed-in app frame: a dark top bar with the main pages on desktop, and the same
// bar plus a bottom tab bar on phones, around a light grey canvas.
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, MoreHorizontal } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
    <span className={cn('rounded-full bg-accent-500 px-1.5 py-0.5 text-caption font-semibold leading-none text-ink tabular-nums', className)}>
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
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-small font-semibold">{name}</p>
        <RoleBadge role={role} className="mt-0.5" />
      </div>
    </div>
  );
}

const menuPanel = 'z-50 min-w-[220px] rounded-md border border-line bg-surface p-1.5 text-ink shadow-md data-[state=open]:animate-fade-in motion-reduce:animate-none';
const menuItem = 'flex min-h-[40px] cursor-pointer select-none items-center gap-2.5 rounded-control px-3 text-small font-medium outline-none data-[highlighted]:bg-subtle';

/** Avatar button with the signed-in person, their role and sign out */
function AccountMenu() {
  const { name } = useRole();
  const signOut = useSignOut();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex min-h-touch items-center gap-2 rounded-full py-1 pl-1 pr-2 text-white hover:bg-ink-3 focus-visible:outline-none focus-visible:shadow-focus"
        aria-label={`Account: ${name}`}
      >
        <Avatar name={name} size="sm" />
        <span className="hidden max-w-[12ch] truncate text-small font-medium xl:block">{name}</span>
        <ChevronDown className="h-4 w-4 text-onDark-muted" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className={menuPanel}>
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

/** Pages that sit under "More" in the desktop bar, to keep it to one line */
const DESKTOP_MORE = ['/admin/archive', '/admin/settings', '/register', '/invite'];

function TopBar({ items, badges }: { items: NavItem[]; badges: Badges }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminNav = items.some(i => i.to === '/admin');
  const more = isAdminNav ? items.filter(i => DESKTOP_MORE.includes(i.to)) : [];
  const main = items.filter(i => !more.includes(i));
  const isActive = (i: NavItem) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to));
  const moreActive = more.some(isActive);

  const linkClass = (active: boolean) => cn(
    'relative flex h-16 items-center gap-2 whitespace-nowrap px-2.5 text-small font-medium transition-colors xl:px-3',
    'focus-visible:outline-none focus-visible:shadow-focus',
    "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:content-[''] xl:after:inset-x-3",
    active ? 'text-white after:bg-white' : 'text-onDark-muted hover:text-white after:bg-transparent',
  );

  return (
    <header className="sticky top-0 z-30 bg-ink pt-[env(safe-area-inset-top)] text-white print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:h-16 lg:gap-6 lg:px-8">
        <NavLink to="/" aria-label="The Gathering Place, home" className="flex-none rounded-md focus-visible:outline-none focus-visible:shadow-focus">
          <Logo on="dark" height={26} />
        </NavLink>
        <nav aria-label="Main" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center">
            {main.map(item => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive: a }) => linkClass(a)}>
                  {item.label === 'Drop requests' ? 'Requests' : item.label}
                  <BadgeCount count={item.badge && badges[item.badge]} />
                </NavLink>
              </li>
            ))}
            {more.length > 0 && (
              <li>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger className={linkClass(moreActive)}>
                    More <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="start" sideOffset={4} className={menuPanel}>
                      {more.map(item => (
                        <DropdownMenu.Item key={item.to} className={cn(menuItem, isActive(item) && 'bg-subtle')} onSelect={() => navigate(item.to)}>
                          <item.icon className="h-4 w-4 text-muted" aria-hidden="true" /> {item.label}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </li>
            )}
          </ul>
        </nav>
        <div className="ml-auto flex-none"><AccountMenu /></div>
      </div>
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
    'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-semibold',
    'focus-visible:outline-none focus-visible:shadow-focus',
    active ? 'text-ink' : 'text-muted',
  );
  const pill = (active: boolean) => cn('grid h-8 w-14 place-items-center rounded-full transition-colors', active && 'bg-ink');

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1.5 backdrop-blur lg:hidden print:hidden">
        <ul className="flex">
          {primary.map(item => (
            <li key={item.to} className="flex flex-1">
              <NavLink to={item.to} end={item.end} className={({ isActive }) => tabClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <span className={pill(isActive)}>
                      <item.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-muted')} aria-hidden="true" />
                    </span>
                    <span>{shortLabel(item.label)}</span>
                    <BadgeCount count={item.badge && badges[item.badge]} className="absolute right-[18%] top-0" />
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1">
            <button type="button" className={tabClass(moreActive)} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
              <span className={pill(moreActive)}>
                <MoreHorizontal className={cn('h-5 w-5', moreActive ? 'text-white' : 'text-muted')} aria-hidden="true" />
              </span>
              <span>More</span>
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
                    'flex min-h-[52px] items-center gap-3 rounded-md border px-4 text-body font-medium',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    isActive ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/40',
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
                className="flex min-h-[52px] w-full items-center gap-3 rounded-md border border-line px-4 text-body font-medium hover:border-ink/40 focus-visible:outline-none focus-visible:shadow-focus"
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
    <div className="flex min-h-dvh flex-col bg-canvas font-body text-ink">
      <a href="#main" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <TopBar items={items} badges={badges} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 focus:outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
        {children ?? (
          <Suspense fallback={<LoadingList rows={4} />}>
            <Outlet />
          </Suspense>
        )}
      </main>
      <BottomBar items={items} badges={badges} />
    </div>
  );
}
