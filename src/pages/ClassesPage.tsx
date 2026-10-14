// src/pages/ClassesPage.tsx — add, edit, retire and remove classes, and set each one's
// semester, sessions per week and teacher.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Archive, CalendarDays, Check, GraduationCap, Pencil, Plus, RotateCcw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button, Dialog, EmptyState, ErrorState, Field, Input, LoadingList, Select, buttonVariants,
} from '../components/ui';
import {
  ClassError, addClass, assignTeacher, classUsage, countStudentsByClass, deleteClass, setClassStatus, updateClass,
} from '../firebase/classes';
import { saveClassConfig, subscribeToAllClassConfigs } from '../firebase/classConfig';
import { semesterLength } from '../firebase/attendance';
import { subscribeToUsers } from '../firebase/users';
import { cn } from '../lib/cn';
import { nextColor, removePlan, type ClassEntry, type RemovePlan } from '../lib/classCatalog';
import useAuthStore from '../store/authStore';
import useClassStore from '../store/classStore';
import { CLASS_COLOR_KEYS, getClassColor, type ClassColorKey } from '../theme/classes';
import { classPalette } from '../theme/tokens.js';
import { formatDateShort, getSemesterStatus } from '../utils/dateUtils';
import type { ClassConfig, UserProfile } from '../types/firestore';

type Configs = Record<string, ClassConfig>;

// Older profiles may lack a name
const nameOf = (u: UserProfile) => u.name || u.email || 'Unnamed staff member';

export default function ClassesPage() {
  const uid = useAuthStore(s => s.user?.uid) as string;
  const classes = useClassStore(s => s.classes);
  const loaded = useClassStore(s => s.loaded);
  const catalogError = useClassStore(s => s.error);
  const [configs, setConfigs] = useState<Configs | null>(null);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<ClassEntry | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => subscribeToAllClassConfigs(setConfigs), []);
  useEffect(() => subscribeToUsers(setUsers), []);

  const active = useMemo(() => classes.filter(c => c.status === 'active'), [classes]);
  const retired = useMemo(() => classes.filter(c => c.status === 'retired'), [classes]);
  const activeIds = active.map(c => c.id).join(',');

  const refreshCounts = useCallback(() => {
    if (!activeIds) return;
    countStudentsByClass(activeIds.split(',')).then(setCounts).catch(() => {});
  }, [activeIds]);
  useEffect(refreshCounts, [refreshCounts]);

  const teachersOf = (id: string) => (users ?? []).filter(u => u.assignedClass === id && (u.role === 'teacher' || u.role === 'admin'));

  if (catalogError) return <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />;

  return (
    <>
      <PageHeader
        title="Classes"
        description="Each class has its own colour, semester and teacher. Students can only sign up for active classes."
        actions={<Button onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" /> Add class</Button>}
      />

      {!loaded || !configs || !users ? (
        <LoadingList rows={4} label="Loading classes" />
      ) : active.length === 0 ? (
        <EmptyState title="No active classes" description="Add a class so students can sign up."
          action={<Button onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" /> Add class</Button>} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map(c => (
            <li key={c.id}>
              <ClassCard entry={c} config={configs[c.id]} students={counts[c.id]} teachers={teachersOf(c.id)} onEdit={() => setEditing(c)} />
            </li>
          ))}
        </ul>
      )}

      {retired.length > 0 && (
        <section className="mt-10" aria-labelledby="retired-heading">
          <h2 id="retired-heading" className="font-heading text-h3">Retired classes</h2>
          <p className="mb-3 text-small text-muted">Their past attendance and archives are kept. Nobody can sign up for them.</p>
          <ul className="grid gap-2">
            {retired.map(c => <RetiredRow key={c.id} entry={c} uid={uid} />)}
          </ul>
        </section>
      )}

      <AddDialog open={adding} classes={classes} uid={uid} onClose={() => setAdding(false)}
        onAdded={entry => { setAdding(false); setEditing(entry); }} />
      <EditDialog entry={editing} config={editing ? configs?.[editing.id] : undefined} users={users ?? []} uid={uid}
        onClose={() => setEditing(null)} onChanged={refreshCounts} />
    </>
  );
}

function ClassCard({ entry, config, students, teachers, onEdit }: {
  entry: ClassEntry; config?: ClassConfig; students?: number; teachers: UserProfile[]; onEdit: () => void;
}) {
  const color = getClassColor(entry.id, entry.colorKey);
  const semester = config?.semester;
  const status = getSemesterStatus(semester);
  const sessions = config?.sessionsPerWeek ?? 1;
  return (
    <article className="flex h-full flex-col rounded-card border border-line bg-surface p-2 shadow-sm">
      <div className="grid flex-1 content-start gap-4 rounded-[14px] p-4" style={{ backgroundColor: color.surface }}>
        <h2 className="font-heading text-h2">{entry.label}</h2>
        <dl className="grid gap-2 text-small">
          <Row icon={<GraduationCap size={16} />} term="Teacher">
            {teachers.length ? teachers.map(nameOf).join(', ') : <span className="font-semibold">No teacher yet</span>}
          </Row>
          <Row icon={<CalendarDays size={16} />} term="Semester">
            {semester?.startDate && semester.endDate ? (
              <>
                {semester.label ? `${semester.label}, ` : ''}{formatDateShort(semester.startDate)} to {formatDateShort(semester.endDate)}
                {status === 'ended' && <span className="font-semibold"> (ended)</span>}
                <br />{sessions} {sessions === 1 ? 'session' : 'sessions'} a week
              </>
            ) : <span className="font-semibold">Not set up</span>}
          </Row>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-3">
        <p className="flex items-center gap-2 text-small">
          <Users size={16} aria-hidden="true" />
          <span className="font-semibold">{students === undefined ? '…' : `${students} ${students === 1 ? 'student' : 'students'}`}</span>
        </p>
        <Button size="sm" onClick={onEdit} aria-label={`Edit ${entry.label}`}>
          <Pencil size={14} aria-hidden="true" /> Edit
        </Button>
      </div>
    </article>
  );
}

function Row({ icon, term, children }: { icon: ReactNode; term: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex-none" aria-hidden="true">{icon}</span>
      <div><dt className="sr-only">{term}</dt><dd>{children}</dd></div>
    </div>
  );
}

function RetiredRow({ entry, uid }: { entry: ClassEntry; uid: string }) {
  const [busy, setBusy] = useState(false);
  async function restore() {
    setBusy(true);
    try {
      await setClassStatus(entry.id, 'active', uid);
      toast.success(`${entry.label} is active again`);
    } catch {
      toast.error('Couldn’t restore. Check your connection and try again.');
      setBusy(false);
    }
  }
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface py-2 pl-4 pr-2">
      <span className="flex items-center gap-2.5 font-semibold">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getClassColor(entry.id, entry.colorKey).strong }} aria-hidden="true" />
        {entry.label}
      </span>
      <Button size="sm" variant="ghost" loading={busy} onClick={restore}><RotateCcw size={14} aria-hidden="true" /> Restore</Button>
    </li>
  );
}

function ColourPicker({ value, onChange, taken }: { value: ClassColorKey; onChange: (k: ClassColorKey) => void; taken: Set<string> }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-body text-small font-semibold text-ink">Colour</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
        {CLASS_COLOR_KEYS.map(k => {
          const selected = k === value;
          const { surface, label } = classPalette[k];
          return (
            <button key={k} type="button" role="radio" aria-checked={selected}
              aria-label={`${label}${taken.has(k) && !selected ? ', used by another class' : ''}`}
              onClick={() => onChange(k)}
              className={cn(
                'relative grid h-11 w-11 place-items-center rounded-full border-1.5 transition-shadow',
                'focus-visible:outline-none focus-visible:shadow-focus',
                selected ? 'border-ink shadow-sm' : 'border-line-strong',
              )}
              style={{ backgroundColor: surface }}
            >
              {selected && <Check size={18} strokeWidth={3} aria-hidden="true" />}
              {!selected && taken.has(k) && <span className="h-1.5 w-1.5 rounded-full bg-ink/40" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className="text-caption text-muted">A dot means another class already uses that colour.</p>
    </fieldset>
  );
}

function AddDialog({ open, classes, uid, onClose, onAdded }: {
  open: boolean; classes: ClassEntry[]; uid: string; onClose: () => void; onAdded: (c: ClassEntry) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<ClassColorKey>('sky');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setName(''); setError(''); setColor(nextColor(classes)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const taken = new Set(classes.filter(c => c.status === 'active').map(c => c.colorKey));

  async function save() {
    const label = name.trim();
    if (label.length < 2) { setError('Give the class a name.'); return; }
    setBusy(true);
    try {
      const id = await addClass(label, color, uid);
      toast.success(`${label} added. Now set its semester and teacher.`);
      onAdded({ id, label, colorKey: color, status: 'active', order: classes.length });
    } catch (err) {
      if (err instanceof ClassError) setError(err.message);
      else toast.error('Couldn’t add. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }} title="Add a class"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={busy} onClick={save}>Add class</Button>
      </>}
    >
      <form className="grid gap-5" onSubmit={e => { e.preventDefault(); save(); }}>
        <Field label="Name" required error={error}>
          <Input value={name} maxLength={40} autoFocus placeholder="For example, Photography"
            onChange={e => { setName(e.target.value); setError(''); }} />
        </Field>
        <ColourPicker value={color} onChange={setColor} taken={taken} />
      </form>
    </Dialog>
  );
}

function EditDialog({ entry, config, users, uid, onClose, onChanged }: {
  entry: ClassEntry | null; config?: ClassConfig; users: UserProfile[]; uid: string; onClose: () => void; onChanged: () => void;
}) {
  const classes = useClassStore(s => s.classes);
  const [form, setForm] = useState({ name: '', color: 'sky' as ClassColorKey, sessions: '1', label: '', start: '', end: '', teacher: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const current = entry ? users.filter(u => u.assignedClass === entry.id) : [];

  useEffect(() => {
    if (!entry) return;
    setErrors({});
    setForm({
      name: entry.label,
      color: entry.colorKey,
      sessions: String(config?.sessionsPerWeek ?? 1),
      label: config?.semester?.label ?? '',
      start: config?.semester?.startDate ?? '',
      end: config?.semester?.endDate ?? '',
      teacher: users.find(u => u.assignedClass === entry.id)?.id ?? '',
    });
    // Only when a different class opens, so live updates don't wipe what's being typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  if (!entry) return <Dialog open={false} onOpenChange={() => {}} title="" />;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: '' }));
  };
  const taken = new Set(classes.filter(c => c.status === 'active' && c.id !== entry.id).map(c => c.colorKey));
  // Teachers, and admins who also teach; each person has one class
  const staff = users.filter(u => u.role === 'teacher' || u.role === 'admin')
    .sort((a, b) => (a.role === b.role ? nameOf(a).localeCompare(nameOf(b)) : a.role === 'teacher' ? -1 : 1));

  async function save() {
    if (!entry) return;
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Give the class a name.';
    if (form.start || form.end) {
      if (!form.start) e.start = 'Add a start date.';
      if (!form.end) e.end = 'Add an end date.';
      if (form.start && form.end && form.end <= form.start) e.end = 'The end date must be after the start date.';
    }
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    setBusy(true);
    try {
      if (form.name.trim() !== entry.label || form.color !== entry.colorKey) {
        await updateClass(entry.id, { label: form.name, colorKey: form.color }, uid);
      }
      const semester = form.start && form.end
        ? { startDate: form.start, endDate: form.end, label: form.label.trim() || `Semester ${form.start.slice(0, 4)}` }
        : null;
      await saveClassConfig(entry.id, {
        sessionsPerWeek: Number(form.sessions),
        ...(semester ? { semester: { ...semester, totalWeeks: semesterLength(semester) } } : {}),
        updatedBy: uid,
      });
      const currentIds = current.map(u => u.id);
      if ((form.teacher || null) !== (currentIds[0] ?? null) || currentIds.length > 1) {
        await assignTeacher(entry.id, form.teacher || null, currentIds);
      }
      toast.success(`${form.name.trim()} saved`);
      onClose();
    } catch (err) {
      if (err instanceof ClassError) setErrors({ name: err.message });
      else toast.error('Couldn’t save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const movingFrom = (() => {
    const t = users.find(u => u.id === form.teacher);
    return t?.assignedClass && t.assignedClass !== entry.id ? classes.find(c => c.id === t.assignedClass)?.label ?? t.assignedClass : null;
  })();

  return (
    <>
      <Dialog open={!removing} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={`Edit ${entry.label}`}
        footer={<>
          <Button variant="ghost" className="mr-auto text-bad-fg" onClick={() => setRemoving(true)}>Remove class</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={save}>Save</Button>
        </>}
      >
        <form className="grid gap-5" onSubmit={e => { e.preventDefault(); save(); }}>
          <Field label="Name" required error={errors.name}>
            <Input value={form.name} maxLength={40} onChange={set('name')} />
          </Field>
          <ColourPicker value={form.color} onChange={k => setForm(f => ({ ...f, color: k }))} taken={taken} />
          <Field label="Teacher" optional hint={movingFrom ? `They’ll stop teaching ${movingFrom}. Each teacher has one class.` : 'Each teacher has one class.'}>
            <Select value={form.teacher} onChange={set('teacher')}>
              <option value="">No teacher</option>
              {staff.map(u => (
                <option key={u.id} value={u.id}>
                  {nameOf(u)}{u.role === 'admin' ? ' (admin)' : ''}
                  {u.assignedClass && u.assignedClass !== entry.id ? `, teaches ${classes.find(c => c.id === u.assignedClass)?.label ?? u.assignedClass}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset className="grid gap-4 rounded-card border border-line p-4">
            <legend className="px-1 font-body text-small font-semibold">This semester</legend>
            <Field label="Name" optional hint="For example, Jan to Mar 2026">
              <Input value={form.label} maxLength={40} onChange={set('label')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" error={errors.start}><Input type="date" value={form.start} onChange={set('start')} /></Field>
              <Field label="Ends" error={errors.end}><Input type="date" value={form.end} onChange={set('end')} /></Field>
            </div>
            <Field label="Sessions a week">
              <Select value={form.sessions} onChange={set('sessions')}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
          </fieldset>
        </form>
      </Dialog>
      <RemoveDialog entry={removing ? entry : null} uid={uid}
        onCancel={() => setRemoving(false)}
        onDone={() => { setRemoving(false); onClose(); onChanged(); }} />
    </>
  );
}

function RemoveDialog({ entry, uid, onCancel, onDone }: { entry: ClassEntry | null; uid: string; onCancel: () => void; onDone: () => void }) {
  const [plan, setPlan] = useState<RemovePlan | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setPlan(null);
    setError(false);
    classUsage(entry.id).then(u => setPlan(removePlan(u))).catch(() => setError(true));
  }, [entry]);

  async function confirm() {
    if (!entry || !plan || plan.kind === 'blocked') return;
    setBusy(true);
    try {
      if (plan.kind === 'retire') await setClassStatus(entry.id, 'retired', uid);
      else await deleteClass(entry.id, uid);
      toast.success(plan.kind === 'retire' ? `${entry.label} retired` : `${entry.label} removed`);
      onDone();
    } catch {
      toast.error('Couldn’t remove. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const name = entry?.label ?? '';
  const title = !plan ? `Remove ${name}?` : plan.kind === 'blocked' ? `${name} can’t be removed yet` : plan.kind === 'retire' ? `Retire ${name}?` : `Remove ${name}?`;
  return (
    <Dialog open={!!entry} onOpenChange={o => { if (!o) onCancel(); }} title={title}
      description={plan?.kind === 'retire'
        ? 'It has past attendance or archives, so it will be retired rather than deleted. Nobody can sign up for it, and you can restore it later.'
        : plan?.kind === 'delete'
          ? 'Nobody has used this class yet, so it will be deleted.'
          : undefined}
      footer={plan?.kind === 'blocked' ? (
        <>
          <Button variant="ghost" onClick={onCancel}>Back</Button>
          <Link to="/admin/archive" className={buttonVariants({ variant: 'dark' })}><Archive size={16} aria-hidden="true" /> Go to Archive</Link>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={!plan} onClick={confirm}>
            {plan?.kind === 'retire' ? 'Retire class' : 'Remove class'}
          </Button>
        </>
      )}
    >
      {error ? (
        <p className="text-small text-bad-fg">Couldn’t check this class. Check your connection and try again.</p>
      ) : !plan ? (
        <LoadingList rows={2} label="Checking who uses this class" />
      ) : plan.kind === 'blocked' ? (
        <ul className="grid list-disc gap-2 pl-5 text-small">
          {plan.reasons.map(r => <li key={r}>{r}</li>)}
        </ul>
      ) : null}
    </Dialog>
  );
}
