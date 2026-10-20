// Shared state for the signed-in frame: live counts, the student list for search, and the
// search palette. AppShell provides it; the top bar and sidebar read it.
import { createContext, useContext } from 'react';
import type { Student } from '../../types/firestore';
import type { NavItem } from './navigation';

export type Badges = Partial<Record<NonNullable<NavItem['badge']>, number>>;

export interface ShellState {
  isAdmin: boolean;
  badges: Badges;
  /** Students the person can see (all for admins, their class for teachers); null while loading */
  students: Student[] | null;
  /** Everything the person can open, for search */
  pages: NavItem[];
  openSearch: () => void;
}

export const ShellContext = createContext<ShellState | null>(null);

/** Null outside the signed-in frame (public pages), so callers can skip shell-only UI */
export const useShell = () => useContext(ShellContext);
