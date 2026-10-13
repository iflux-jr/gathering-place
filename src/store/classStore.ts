// The class list, kept live for the whole app. Until it loads (or when signed out and the
// document doesn't exist yet) everything sees the original eight.
import { useMemo } from 'react';
import { create } from 'zustand';
import { DEFAULT_CATALOG, type ClassEntry } from '../lib/classCatalog';
import { getClassColor, type ClassColor } from '../theme/classes';

interface ClassState {
  classes: ClassEntry[];
  loaded: boolean;
  error: boolean;
}

// Filled by App's subscription; this file stays free of Firebase so plain helpers can use it
const useClassStore = create<ClassState>(() => ({
  classes: DEFAULT_CATALOG,
  loaded: false,
  error: false,
}));

export default useClassStore;

const find = (classes: ClassEntry[], id: string) => classes.find(c => c.id === id);

/** For code outside React (exports, toasts) */
export function classLabel(id: string): string {
  return find(useClassStore.getState().classes, id)?.label ?? id;
}
export function classColor(id: string): ClassColor {
  return getClassColor(id, find(useClassStore.getState().classes, id)?.colorKey);
}

export function useActiveClasses(): ClassEntry[] {
  const classes = useClassStore(s => s.classes);
  return useMemo(() => classes.filter(c => c.status === 'active'), [classes]);
}
export function useClassLabel(id: string): string {
  return useClassStore(s => find(s.classes, id)?.label ?? id);
}
export function useClassColor(id: string): ClassColor {
  const key = useClassStore(s => find(s.classes, id)?.colorKey);
  return getClassColor(id, key);
}
/** A lookup function that re-renders the caller when the list changes */
export function useClassLookup() {
  const classes = useClassStore(s => s.classes);
  return useMemo(() => ({
    label: (id: string) => find(classes, id)?.label ?? id,
    color: (id: string) => getClassColor(id, find(classes, id)?.colorKey),
  }), [classes]);
}
