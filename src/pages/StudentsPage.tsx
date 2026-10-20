// src/pages/StudentsPage.tsx — every active student, with search, class filter, export and
// a link to each student's profile.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Download, Search, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Avatar, Button, ClassChip, EmptyState, ErrorState, FilterChip, Input, LoadingList, StatusPill, buttonVariants,
} from '../components/ui';
import { subscribeToAllStudents } from '../firebase/students';
import { studentPath } from '../lib/studentPath';
import { useActiveClasses } from '../store/classStore';
import type { Student } from '../types/firestore';

export default function StudentsPage() {
  const classes = useActiveClasses();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState(false);
  // Search in the top bar links here with ?q=name
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  useEffect(() => { const q = params.get('q'); if (q !== null) setSearch(q); }, [params]);
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => subscribeToAllStudents(null, (s: Student[]) => setStudents(s), () => setError(true)), []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return (students ?? []).filter(s =>
      (!classFilter || s.classes?.includes(classFilter))
      && (!q || s.name.toLowerCase().includes(q) || (digits.length >= 3 && (s.phone ?? '').replace(/\D/g, '').includes(digits))));
  }, [students, search, classFilter]);

  async function exportShown() {
    const { exportToCSV, formatStudentsForExport } = await import('../utils/exportUtils');
    exportToCSV(formatStudentsForExport(shown), `students-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${shown.length} ${shown.length === 1 ? 'student' : 'students'}`);
  }

  return (
    <>
      <PageHeader
        title="Students"
        description={students ? `${students.length} active ${students.length === 1 ? 'student' : 'students'}` : undefined}
        actions={<>
          <Button variant="outline" onClick={exportShown} disabled={!shown.length}><Download size={16} aria-hidden="true" /> Export CSV</Button>
          <Link to="/register" className={buttonVariants()}><UserPlus size={16} aria-hidden="true" /> Add student</Link>
        </>}
      />

      <div className="mb-5 grid gap-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input type="search" aria-label="Search by name or phone" placeholder="Search by name or phone" className="pl-10"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by class">
          <FilterChip selected={!classFilter} onClick={() => setClassFilter('')}>All classes</FilterChip>
          {classes.map(c => (
            <FilterChip key={c.id} selected={classFilter === c.id} onClick={() => setClassFilter(classFilter === c.id ? '' : c.id)}>{c.label}</FilterChip>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />
      ) : !students ? (
        <LoadingList rows={6} label="Loading students" />
      ) : shown.length === 0 ? (
        <EmptyState title={students.length ? 'No one matches' : 'No students yet'}
          description={students.length ? 'Try another name, number or class.' : 'Accepted sign-ups and students you add appear here.'} />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">{shown.length} shown</p>
          {shown.length !== students.length && (
            <p className="mb-3 text-small text-muted" aria-hidden="true">Showing {shown.length} of {students.length}</p>
          )}
          {/* Two columns on wider screens, filled left then right so the A to Z order reads across */}
          <ul className="glass grid gap-px overflow-hidden rounded-card bg-line/70 md:grid-cols-2">
            {shown.map(s => (
              <li key={s.id} className="bg-white">
                <Link to={studentPath(s.id)}
                  className="flex h-full items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_#A35300] sm:px-5">
                  <Avatar name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 truncate font-semibold">{s.name}</span>
                      {(s.classes ?? []).length
                        ? s.classes.map(c => <ClassChip key={c} classId={c} size="sm" />)
                        : <StatusPill status="unmarked" size="sm">No class</StatusPill>}
                    </span>
                    <span className="block text-small text-muted">{s.phone}</span>
                  </span>
                  <ChevronRight size={16} className="flex-none text-faint" aria-hidden="true" />
                </Link>
              </li>
            ))}
            {shown.length % 2 === 1 && <li aria-hidden="true" className="hidden bg-white md:block" />}
          </ul>
        </>
      )}

    </>
  );
}
