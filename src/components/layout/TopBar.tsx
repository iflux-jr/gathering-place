// The tools at the top right of every signed-in page: search, notifications and the
// person's name, which opens Profile and Log out.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Inbox, LogOut, Search, UserMinus, UserRound } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Avatar, RoleBadge } from '../ui';
import { cn } from '../../lib/cn';
import { useShell } from './shell';
import { useSignOut, useWho } from './account';
import type { NavItem } from './navigation';
import { studentPath } from '../../lib/studentPath';

const menuPanel = 'z-50 min-w-[240px] rounded-[10px] border border-line bg-white p-1 text-ink shadow-lg data-[state=open]:animate-fade-in motion-reduce:animate-none';
const menuItem = 'flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 rounded-[7px] px-3 text-body font-medium outline-none data-[highlighted]:bg-subtle sm:min-h-[36px]';
const iconBtn = 'relative grid h-11 w-11 flex-none place-items-center rounded-[10px] border border-line bg-white text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:shadow-focus lg:h-10 lg:w-10';

/** Search box on desktop, a search icon on phones; both open the search palette */
export function SearchButton({ compact }: { compact?: boolean }) {
  const shell = useShell();
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  if (!shell) return null;
  if (compact) {
    return (
      <button type="button" className={iconBtn} aria-label="Search" onClick={shell.openSearch}>
        <Search className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    );
  }
  return (
    <button type="button" onClick={shell.openSearch}
      className="flex h-10 w-[240px] items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-left text-body text-faint hover:border-line-strong focus-visible:outline-none focus-visible:shadow-focus xl:w-[300px] 2xl:w-[340px]">
      <Search className="h-4 w-4 text-muted" aria-hidden="true" />
      <span className="flex-1">Search</span>
      <kbd className="rounded-[5px] border border-line bg-canvas px-1.5 py-px font-body text-caption text-muted">{mac ? '⌘K' : 'Ctrl K'}</kbd>
    </button>
  );
}

/** Bell with a dot when something is waiting; opens a short list of what */
export function NotificationsButton() {
  const shell = useShell();
  if (!shell) return null;
  const regs = shell.badges.pendingRegistrations ?? 0;
  const drops = shell.badges.pendingDrops ?? 0;
  const items = shell.isAdmin ? [
    regs > 0 && { to: '/admin/registrations', icon: Inbox, title: `${regs} ${regs === 1 ? 'sign-up' : 'sign-ups'} to review`, sub: 'New people waiting to join a class' },
    drops > 0 && { to: '/admin/requests', icon: UserMinus, title: `${drops} drop ${drops === 1 ? 'request' : 'requests'}`, sub: 'Teachers asking to remove a student' },
  ].filter(Boolean) as { to: string; icon: typeof Inbox; title: string; sub: string }[] : [];
  const count = regs + drops;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={iconBtn} aria-label={count ? `Notifications, ${count} waiting` : 'Notifications'}>
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {shell.isAdmin && count > 0 && <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-white" />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={cn(menuPanel, 'w-[300px]')}>
          <p className="px-3 pb-1.5 pt-2 text-small font-semibold">Notifications</p>
          {items.length === 0 ? (
            <p className="px-3 pb-3 text-small text-muted">You’re all caught up.</p>
          ) : items.map(i => (
            <DropdownMenu.Item key={i.to} asChild className={cn(menuItem, 'items-start py-2')}>
              <Link to={i.to}>
                <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-[7px] bg-subtle text-accent-600"><i.icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                <span className="min-w-0">
                  <span className="block font-semibold">{i.title}</span>
                  <span className="block text-caption font-normal text-muted">{i.sub}</span>
                </span>
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The person's name; opens Profile and Log out */
export function AccountButton({ compact }: { compact?: boolean }) {
  const { name, first, email, role } = useWho();
  const signOut = useSignOut();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Account: ${name}`}
        className={cn(
          'flex flex-none items-center gap-2 rounded-[10px] border border-line bg-white focus-visible:outline-none focus-visible:shadow-focus',
          compact ? 'h-11 p-1' : 'h-10 py-1 pl-1 pr-2.5 hover:border-line-strong',
        )}
      >
        <Avatar name={name} size="md" className="rounded-[7px] text-white" tone="#5A3825" />
        {!compact && <span className="max-w-[140px] truncate text-body font-semibold">{first}</span>}
        {!compact && <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuPanel}>
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Avatar name={name} size="md" className="rounded-[7px] text-white" tone="#5A3825" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{name}</p>
              {email && <p className="truncate text-caption text-muted">{email}</p>}
              <RoleBadge role={role} className="mt-1" />
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild className={menuItem}>
            <Link to="/profile"><UserRound className="h-4 w-4 text-muted" aria-hidden="true" /> Profile</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} onSelect={signOut}>
            <LogOut className="h-4 w-4 text-muted" aria-hidden="true" /> Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Search, bell and name, right-aligned at the top of a page (desktop) */
export function TopBar({ className }: { className?: string }) {
  if (!useShell()) return null;
  return (
    <div className={cn('hidden flex-none items-center gap-2 lg:flex print:hidden', className)}>
      <SearchButton />
      <NotificationsButton />
      <AccountButton />
    </div>
  );
}

interface Hit { key: string; to: string; title: string; sub?: string; icon?: NavItem['icon'] }

/** Command-style search over pages and students. Opens from the search box or Ctrl/⌘ K. */
export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const shell = useShell();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => { if (open) { setQ(''); setActive(0); } }, [open]);

  const hits = useMemo<Hit[]>(() => {
    if (!shell) return [];
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const pages = shell.pages
      .filter(p => !term || p.label.toLowerCase().includes(term))
      .map(p => ({ key: `p-${p.to}`, to: p.to, title: p.label, sub: 'Page', icon: p.icon }));
    const people = term.length < 2 ? [] : (shell.students ?? [])
      .filter(s => s.name.toLowerCase().includes(term) || (digits.length >= 3 && (s.phone ?? '').replace(/\D/g, '').includes(digits)))
      .slice(0, 8)
      .map(s => ({
        key: `s-${s.id}`,
        to: studentPath(s.id),
        title: s.name,
        sub: s.phone ? `Student · ${s.phone}` : 'Student',
      }));
    return [...people, ...pages];
  }, [shell, q]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function go(h: Hit | undefined) {
    if (!h) return;
    onOpenChange(false);
    navigate(h.to);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content aria-describedby={undefined}
          className="fixed inset-x-3 top-[10dvh] z-50 mx-auto flex max-h-[70dvh] max-w-[560px] flex-col overflow-hidden rounded-[12px] border border-line bg-white shadow-lg focus:outline-none data-[state=open]:animate-fade-in">
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search className="h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, hits.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
                if (e.key === 'Enter') { e.preventDefault(); go(hits[active]); }
              }}
              placeholder={shell?.isAdmin ? 'Search students and pages' : 'Search your students and pages'}
              aria-label="Search"
              role="combobox"
              aria-expanded="true"
              aria-controls="search-results"
              aria-activedescendant={hits[active] ? `search-hit-${active}` : undefined}
              className="h-12 min-w-0 flex-1 bg-transparent text-input outline-none placeholder:text-faint sm:text-body"
            />
            <kbd className="rounded-[5px] border border-line bg-canvas px-1.5 py-px text-caption text-muted">Esc</kbd>
          </div>
          <ul id="search-results" role="listbox" ref={listRef} className="overflow-y-auto p-1.5">
            {hits.length === 0 && <li className="px-3 py-6 text-center text-small text-muted">Nothing matches “{q}”.</li>}
            {hits.map((h, i) => (
              <li key={h.key} id={`search-hit-${i}`} data-i={i} role="option" aria-selected={i === active}
                onMouseMove={() => setActive(i)} onClick={() => go(h)}
                className={cn('flex cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 py-2', i === active && 'bg-subtle')}>
                {h.icon
                  ? <span className="grid h-7 w-7 flex-none place-items-center rounded-[7px] border border-line bg-white text-muted"><h.icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  : <Avatar name={h.title} size="sm" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{h.title}</span>
                  {h.sub && <span className="block truncate text-caption text-muted">{h.sub}</span>}
                </span>
              </li>
            ))}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
