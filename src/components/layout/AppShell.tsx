// The signed-in app frame. Desktop: a floating glass sidebar with the role switch at the top.
// Phones: a slim header that scrolls away and a floating glass tab bar at the bottom.
// The active item in both is marked by a pill that slides between items.
import { Suspense, useEffect, useId, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, MoreHorizontal } from 'lucide-react';
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
    <span className={cn('min-w-[20px] rounded-full bg-accent-500 px-1.5 py-0.5 text-center text-caption font-bold leading-none text-ink tabular-nums', className)}>
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

/** Admin / Teacher segmented switch for admins who also teach */
function RoleSwitch({ mode, className }: { mode: Mode; className?: string }) {
  const navigate = useNavigate();
  const id = useId();
  const options: { value: Mode; label: string; to: string }[] = [
    { value: 'admin', label: 'Admin', to: '/admin' },
    { value: 'teacher', label: 'Teacher', to: '/teacher' },
  ];
  return (
    <div role="group" aria-label="Switch role" className={cn('grid grid-cols-2 rounded-full bg-ink/[.06] p-1 shadow-inset', className)}>
      {options.map(o => {
        const active = o.value === mode;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => !active && navigate(o.to)}
            className={cn(
              'relative min-h-[38px] rounded-full text-small font-semibold',
              'focus-visible:outline-none focus-visible:shadow-focus',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span layoutId={id} transition={spring} aria-hidden="true"
                className="absolute inset-0 rounded-full border border-white/80 bg-white shadow-raised" />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const menuPanel = 'glass-strong z-50 min-w-[230px] rounded-md p-1.5 text-ink data-[state=open]:animate-fade-in motion-reduce:animate-none';
const menuItem = 'flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 rounded-control px-3 text-small font-semibold outline-none data-[highlighted]:bg-ink/[.06]';

/** Avatar button with the signed-in person, their role and sign out (phones) */
function AccountMenu() {
  const { name } = useRole();
  const signOut = useSignOut();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:shadow-focus"
        aria-label={`Account: ${name}`}
      >
        <Avatar name={name} size="md" className="shadow-raised" />
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

const isActivePath = (pathname: string, i: NavItem) => (i.end ? pathname === i.to : pathname.startsWith(i.to));

function Sidebar({ items, badges, canSwitch, mode }: { items: NavItem[]; badges: Badges; canSwitch: boolean; mode: Mode }) {
  const { pathname } = useLocation();
  const signOut = useSignOut();
  const indicator = useId();
  // Admin pages that sit under a "Manage" heading
  const manage = ['/admin/archive', '/admin/settings', '/register'];
  const main = items.filter(i => !manage.includes(i.to));
  const rest = items.filter(i => manage.includes(i.to));

  const link = (item: NavItem) => {
    const active = isActivePath(pathname, item);
    return (
      <li key={item.to}>
        <NavLink
          to={item.to} end={item.end}
          className={cn(
            'relative flex min-h-[44px] items-center gap-3 rounded-[14px] px-3 text-small font-semibold',
            'focus-visible:outline-none focus-visible:shadow-focus',
            active ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {active && (
            <motion.span layoutId={indicator} transition={spring} aria-hidden="true"
              className="absolute inset-0 rounded-[14px] border border-white/90 bg-white shadow-raised" />
          )}
          <item.icon className={cn('relative h-[18px] w-[18px]', active ? 'text-accent-600' : 'text-muted')} aria-hidden="true" />
          <span className="relative flex-1 truncate">{item.label === 'Drop requests' ? 'Requests' : item.label}</span>
          <BadgeCount count={item.badge && badges[item.badge]} className="relative" />
        </NavLink>
      </li>
    );
  };

  return (
    <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-[256px] flex-col rounded-frame p-4 lg:flex print:hidden">
      <NavLink to="/" aria-label="The Gathering Place, home" className="mb-5 self-start rounded-md px-1 pt-1 focus-visible:outline-none focus-visible:shadow-focus">
        <Logo height={40} />
      </NavLink>
      {canSwitch && <RoleSwitch mode={mode} className="mb-4" />}
      <nav aria-label="Main" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <ul className="grid gap-1">{main.map(link)}</ul>
        {rest.length > 0 && (
          <>
            <p className="mb-1.5 mt-5 px-3 font-mono text-label uppercase text-muted">Manage</p>
            <ul className="grid gap-1">{rest.map(link)}</ul>
          </>
        )}
      </nav>
      <div className="mt-4 grid gap-2 rounded-md border border-white/70 bg-white/55 p-3">
        <RoleLine />
        <button type="button" onClick={signOut}
          className="flex min-h-[40px] items-center gap-2 rounded-control px-2 text-small font-semibold text-muted transition-transform hover:bg-ink/[.05] hover:text-ink active:scale-[.98] focus-visible:outline-none focus-visible:shadow-focus">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}

function PhoneHeader() {
  return (
    <header className="flex items-center justify-between px-4 pb-1 pt-[calc(env(safe-area-inset-top)+14px)] sm:px-6 lg:hidden print:hidden">
      <NavLink to="/" aria-label="The Gathering Place, home" className="rounded-md focus-visible:outline-none focus-visible:shadow-focus">
        <Logo height={34} />
      </NavLink>
      <AccountMenu />
    </header>
  );
}

function BottomBar({ items, badges, canSwitch, mode }: { items: NavItem[]; badges: Badges; canSwitch: boolean; mode: Mode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const signOut = useSignOut();
  const indicator = useId();
  useEffect(() => setMoreOpen(false), [pathname]);

  const primary = mode === 'admin' ? items.filter(i => ADMIN_PRIMARY.includes(i.to)) : items.slice(0, 3);
  const rest = items.filter(i => !primary.includes(i));
  const moreActive = rest.some(i => isActivePath(pathname, i));
  const moreBadge = rest.reduce((n, i) => n + ((i.badge && badges[i.badge]) || 0), 0);

  const tab = (active: boolean, icon: ReactNode, label: string, badge?: number) => (
    <>
      <span className="relative grid h-9 w-14 place-items-center">
        {active && (
          <motion.span layoutId={indicator} transition={spring} aria-hidden="true"
            className="absolute inset-0 rounded-full bg-brand-brown shadow-[0_6px_14px_-6px_rgba(90,56,37,.7)]" />
        )}
        <span className={cn('relative', active ? 'text-white' : 'text-muted')}>{icon}</span>
        <BadgeCount count={badge} className="absolute -right-1 -top-1" />
      </span>
      <span className={cn('text-[0.6875rem] font-semibold', active ? 'text-ink' : 'text-muted')}>{label}</span>
    </>
  );
  const tabClass = 'flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] transition-transform active:scale-95 focus-visible:outline-none focus-visible:shadow-focus';

  return (
    <>
      <nav aria-label="Main"
        className="glass-strong fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-30 rounded-[28px] px-1.5 py-1 lg:hidden print:hidden">
        <ul className="flex">
          {primary.map(item => (
            <li key={item.to} className="flex flex-1">
              <NavLink to={item.to} end={item.end} className={tabClass}>
                {({ isActive }) => tab(isActive, <item.icon className="h-5 w-5" aria-hidden="true" />, shortLabel(item.label), item.badge && badges[item.badge])}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1">
            <button type="button" className={tabClass} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
              {tab(moreActive, <MoreHorizontal className="h-5 w-5" aria-hidden="true" />, 'More', moreBadge)}
            </button>
          </li>
        </ul>
      </nav>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <div className="grid gap-4">
          <RoleLine />
          {canSwitch && <RoleSwitch mode={mode} />}
          <ul className="grid gap-1.5">
            {rest.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to} end={item.end}
                  className={({ isActive }) => cn(
                    'flex min-h-[52px] items-center gap-3 rounded-md border px-4 text-body font-semibold',
                    'transition-transform active:scale-[.98] focus-visible:outline-none focus-visible:shadow-focus',
                    isActive ? 'border-brand-brown bg-brand-brown text-white' : 'border-white/80 bg-white/70 shadow-raised',
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
                className="flex min-h-[52px] w-full items-center gap-3 rounded-md border border-white/80 bg-white/70 px-4 text-body font-semibold shadow-raised transition-transform active:scale-[.98] focus-visible:outline-none focus-visible:shadow-focus"
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
  if (label === 'My class' || label.endsWith(' class')) return 'Class';
  if (label === 'Invite students') return 'Invite';
  if (label === 'Add student') return 'Add';
  return label;
}

export default function AppShell({ children }: { children?: ReactNode }) {
  const { items, isAdmin, canSwitch, mode } = useNavItems();
  const badges = useBadges(isAdmin);
  return (
    <div className="flex min-h-dvh flex-col font-body text-ink">
      <a href="#main" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar items={items} badges={badges} canSwitch={canSwitch} mode={mode} />
      <PhoneHeader />
      <main id="main" tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-4 focus:outline-none sm:px-6 lg:pb-12 lg:pl-[304px] lg:pr-8 lg:pt-10 xl:max-w-[1360px] xl:pr-12">
        {children ?? (
          <Suspense fallback={<LoadingList rows={4} />}>
            <PageTransition><Outlet /></PageTransition>
          </Suspense>
        )}
      </main>
      <BottomBar items={items} badges={badges} canSwitch={canSwitch} mode={mode} />
    </div>
  );
}
