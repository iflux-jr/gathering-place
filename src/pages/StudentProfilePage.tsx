// src/pages/StudentProfilePage.tsx — one student: details, QR code, attendance this semester,
// drop requests and (for admins) past semesters. Admins see everyone; a teacher sees the
// students in their own class, as the Firestore rules allow.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, History, Pencil, Phone, QrCode, UserMinus, UserX } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { DropDialog } from '../components/teacher/RosterPanel';
import {
  Avatar, Button, ClassChip, Dialog, EmptyState, ErrorState, Field, FilterChip, Input, LoadingList, ProgressBar, Select,
  Skeleton, StatusPill, buttonVariants, type Status,
} from '../components/ui';
import { getStudentAttendance } from '../firebase/attendance';
import { getStudentArchiveHistory } from '../firebase/archive';
import { isHolidaySession, subscribeToAllClassConfigs } from '../firebase/classConfig';
import { adminDirectDrop, subscribeToStudentDropRequests } from '../firebase/dropRequests';
import { RegistrationError, getRegistration, updateStudentDetails } from '../firebase/registrations';
import { subscribeToStudent } from '../firebase/students';
import { subscribeToUsers } from '../firebase/users';
import { formatRefCode } from '../lib/refCode';
import useAuthStore from '../store/authStore';
import { useClassLookup } from '../store/classStore';
import { colors } from '../theme/tokens';
import { GENDERS } from '../utils/constants';
import { formatDateShort, formatTime } from '../utils/dateUtils';
import type { AttendanceRecord, ClassConfig, DropRequest, Registration, Student, UserProfile } from '../types/firestore';

type Mark = 'present' | 'absent' | 'holiday' | 'unmarked';

interface PastSemester {
  archiveKey: string; classId: string; semesterLabel: string; semesterNumber: number; present: number; counted: number;
}

export default function StudentProfilePage() {
  const { id = '' } = useParams();
  const profile = useAuthStore(s => s.profile) as UserProfile | null;
  const uid = useAuthStore(s => s.user?.uid) as string;
  const isAdmin = profile?.role === 'admin';
  const myClass = profile?.assignedClass ?? null;

  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setStudent(undefined); setDenied(false); setFailed(false);
    return subscribeToStudent(id, (s: Student | null) => setStudent(s), (err: { code?: string }) => {
      if (err?.code === 'permission-denied') setDenied(true); else setFailed(true);
    });
  }, [id]);

  if (denied || (student && !isAdmin && !(myClass && student.classes?.includes(myClass)))) {
    return (
      <>
        <BackLink isAdmin={isAdmin} />
        <EmptyState icon={<UserX size={32} />} title="This student isn’t in your class"
          description="You can open the profiles of students on your register. Ask the admin about anyone else." />
      </>
    );
  }
  if (failed) return <ErrorState description="Check your connection and try again." onRetry={() => window.location.reload()} />;
  if (student === undefined) return <LoadingList rows={5} label="Loading student" />;
  if (student === null) {
    return (
      <>
        <BackLink isAdmin={isAdmin} />
        <EmptyState icon={<UserX size={32} />} title="Student not found"
          description="They may have been removed, or their class was archived at the end of a semester."
          action={isAdmin ? <Link to="/admin/archive" className={buttonVariants({ variant: 'outline' })}>Open the archive</Link> : undefined} />
      </>
    );
  }
  return <Profile student={student} uid={uid} isAdmin={isAdmin} myClass={myClass} />;
}

function BackLink({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Link to={isAdmin ? '/admin/students' : '/teacher'}
      className="mb-2 inline-flex items-center gap-1.5 rounded-[6px] text-small font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:shadow-focus">
      <ArrowLeft size={15} aria-hidden="true" /> {isAdmin ? 'Students' : 'My class'}
    </Link>
  );
}

function Profile({ student, uid, isAdmin, myClass }: { student: Student; uid: string; isAdmin: boolean; myClass: string | null }) {
  const lookup = useClassLookup();
  // A teacher only reads their own class's records; admins read everything
  const scope = isAdmin ? null : myClass;
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [recError, setRecError] = useState(false);
  const [configs, setConfigs] = useState<Record<string, ClassConfig>>({});
  const [drops, setDrops] = useState<DropRequest[] | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [past, setPast] = useState<PastSemester[] | null>(null);
  const [pastError, setPastError] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [editing, setEditing] = useState(false);
  const [dropping, setDropping] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const classKey = (student.classes ?? []).join(',');
  useEffect(() => {
    setRecords(null); setRecError(false);
    getStudentAttendance(student.id, scope).then(r => setRecords(r as AttendanceRecord[])).catch(() => setRecError(true));
    // Re-read when their classes change (a drop), so the counts match
  }, [student.id, scope, classKey]);
  useEffect(() => subscribeToAllClassConfigs(setConfigs), []);
  useEffect(() => subscribeToStudentDropRequests(student.id, scope, (d: DropRequest[]) => setDrops(d), () => setDrops([])), [student.id, scope]);
  useEffect(() => (isAdmin ? subscribeToUsers((u: UserProfile[]) => setUsers(u)) : undefined), [isAdmin]);
  useEffect(() => {
    if (!isAdmin || !student.registrationId) return;
    getRegistration(student.registrationId).then(setRegistration).catch(() => setRegistration(null));
  }, [isAdmin, student.registrationId]);
  useEffect(() => {
    if (!isAdmin) return;
    setPast(null); setPastError(false);
    getStudentArchiveHistory(student).then(r => setPast(r as PastSemester[])).catch(() => setPastError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, student.id, student.phoneKey]);

  const nameOf = (u?: string | null) => (u && u === uid ? 'you' : users.find(x => x.id === u)?.name);
  const markOf = (r: AttendanceRecord): Mark =>
    r.isHoliday || isHolidaySession(configs[r.className], r.semesterWeek, r.sessionNumber) ? 'holiday'
      : r.present === true ? 'present' : r.present === false ? 'absent' : 'unmarked';

  // Their current classes first, then any they've left this semester that still have records
  const shownClasses = useMemo(() => {
    const mine = (student.classes ?? []).filter(c => !scope || c === scope);
    const left = [...new Set((records ?? []).map(r => r.className))].filter(c => !mine.includes(c));
    return [...mine, ...left];
  }, [student.classes, records, scope]);

  const statsFor = (cls: string) => {
    const rs = (records ?? []).filter(r => r.className === cls);
    const by = { present: 0, absent: 0, holiday: 0, unmarked: 0 };
    for (const r of rs) by[markOf(r)]++;
    const counted = by.present + by.absent;
    return { ...by, counted, pct: counted ? Math.round((by.present / counted) * 100) : null };
  };

  const history = (records ?? []).filter(r => !classFilter || r.className === classFilter);
  // Teachers' requests, plus drops an admin made directly, which are kept on the student
  const dropHistory = useMemo(() => {
    const asked = (drops ?? []).map(d => ({
      key: d.id, classId: d.className, status: d.status as Status, label: undefined as string | undefined, when: d.requestedAt,
      text: <>Asked by {nameOf(d.requestedBy) ?? 'their teacher'}{d.reason && <> · “{d.reason}”</>}</>,
      note: d.status === 'rejected' ? d.rejectionReason : null,
    }));
    const direct = Object.entries(student.droppedFrom ?? {})
      .filter(([c, v]) => v && !v.requestId && (!scope || c === scope))
      .map(([c, v]) => ({
        key: `direct-${c}`, classId: c, status: 'approved' as Status, label: 'Dropped', when: v!.droppedAt,
        text: <>Dropped by {nameOf(v!.droppedBy) ?? 'an admin'}</>, note: null,
      }));
    const ms = (v: unknown) => (v && typeof v === 'object' && 'toMillis' in v ? (v as { toMillis(): number }).toMillis() : typeof v === 'string' ? Date.parse(v) : 0);
    return [...asked, ...direct].sort((a, b) => ms(b.when) - ms(a.when));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drops, student.droppedFrom, scope, users]);

  const pendingDrop = (cls: string) => (drops ?? []).find(d => d.className === cls && d.status === 'pending');
  const multiSession = (cls: string) => (configs[cls]?.sessionsPerWeek ?? 1) > 1;

  async function exportCsv() {
    const { exportToCSV } = await import('../utils/exportUtils');
    const rows = [...(records ?? [])]
      .sort((a, b) => a.className.localeCompare(b.className) || a.semesterWeek - b.semesterWeek || a.sessionNumber - b.sessionNumber)
      .map(r => ({
        Student: student.name,
        Class: lookup.label(r.className),
        Week: r.semesterWeek,
        Session: r.sessionNumber,
        Date: r.date ?? '',
        Status: { present: 'Present', absent: 'Absent', holiday: 'No class', unmarked: 'Not marked' }[markOf(r)],
      }));
    const slug = student.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    exportToCSV(rows, `${slug || 'student'}-attendance-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${rows.length} ${rows.length === 1 ? 'session' : 'sessions'}`);
  }

  const joinedHow = student.registrationId ? 'Self-registered' : 'Added by an admin';
  const approver = registration?.reviewedBy ? nameOf(registration.reviewedBy) : undefined;
  const adder = nameOf(student.addedBy);

  return (
    <>
      <BackLink isAdmin={isAdmin} />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar name={student.name} size="lg" />
            <span className="min-w-0">{student.name}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-1.5 pt-1">
            {(student.classes ?? []).length
              ? student.classes.map(c => <ClassChip key={c} classId={c} size="sm" />)
              : <StatusPill status="unmarked" size="sm">No class</StatusPill>}
            {student.reRegistered && <StatusPill status="archived" size="sm">Returning</StatusPill>}
          </span>
        }
        actions={<>
          <Button variant="outline" onClick={exportCsv} disabled={!records?.length}><Download size={16} aria-hidden="true" /> Export CSV</Button>
          {isAdmin && <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /> Edit details</Button>}
        </>}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:gap-5">
        <div className="grid min-w-0 gap-4 lg:gap-5">
          {/* Attendance per class */}
          <section aria-labelledby="att-heading" className="glass rounded-card p-4">
            <h2 id="att-heading" className="text-h2 font-semibold">Attendance this semester</h2>
            <p className="text-small text-muted">Days with no class don’t count towards the rate.</p>
            {recError ? (
              <ErrorState className="py-6" description="Couldn’t load attendance. Check your connection and try again." onRetry={() => window.location.reload()} />
            ) : !records ? (
              <div className="mt-3 grid gap-2"><Skeleton className="h-24 w-full rounded-[9px]" /></div>
            ) : shownClasses.length === 0 ? (
              <p className="mt-3 text-small text-muted">Not in any class right now.</p>
            ) : (
              <ul className="mt-3 grid gap-2.5">
                {shownClasses.map(c => {
                  const st = statsFor(c);
                  const current = (student.classes ?? []).includes(c);
                  const pending = pendingDrop(c);
                  const canAsk = !isAdmin && c === myClass;
                  return (
                    <li key={c} className="grid gap-3 rounded-[9px] border border-line p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <ClassChip classId={c} />
                          {!current && <StatusPill status="cancelled" size="sm">Dropped</StatusPill>}
                          <span className="ml-auto font-heading text-[1.25rem] font-bold tabular-nums leading-none">{st.pct === null ? '—' : `${st.pct}%`}</span>
                        </div>
                        <ProgressBar value={st.pct ?? 0} label={`Attendance in ${lookup.label(c)}`} valueText={st.pct === null ? 'No sessions yet' : `${st.pct}%`} />
                        <p className="flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
                          <Count dot="bg-ok-solid" n={st.present} label="present" />
                          <Count dot="bg-bad-solid" n={st.absent} label="absent" />
                          <Count dot="bg-info-fg" n={st.holiday} label="no class" />
                          {st.unmarked > 0 && <Count dot="bg-line-strong" n={st.unmarked} label="not marked" />}
                        </p>
                      </div>
                      {current && (
                        <div className="sm:justify-self-end">
                          {pending ? (
                            <StatusPill status="pending" size="sm">Drop requested</StatusPill>
                          ) : isAdmin ? (
                            <Button size="sm" variant="ghost" onClick={() => setDropping(c)}><UserMinus size={14} aria-hidden="true" /> Drop</Button>
                          ) : canAsk ? (
                            <Button size="sm" variant="outline" onClick={() => setAsking(true)}><UserMinus size={14} aria-hidden="true" /> Ask to drop</Button>
                          ) : null}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Session by session */}
          <section aria-labelledby="sessions-heading" className="glass rounded-card p-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2 id="sessions-heading" className="text-h2 font-semibold">Session history</h2>
                <p className="text-small text-muted">Every session marked this semester, newest first.</p>
              </div>
              {shownClasses.length > 1 && (
                <div className="flex basis-full flex-wrap gap-1.5 sm:basis-auto" role="group" aria-label="Filter by class">
                  <FilterChip selected={!classFilter} onClick={() => setClassFilter('')}>All</FilterChip>
                  {shownClasses.map(c => (
                    <FilterChip key={c} selected={classFilter === c} onClick={() => setClassFilter(classFilter === c ? '' : c)}>{lookup.label(c)}</FilterChip>
                  ))}
                </div>
              )}
            </div>
            {recError ? null : !records ? (
              <LoadingList rows={3} label="Loading sessions" />
            ) : history.length === 0 ? (
              <p className="mt-3 text-small text-muted">No attendance marked yet.</p>
            ) : (
              <ul className="mt-2 grid">
                {history.map(r => {
                  const m = markOf(r);
                  return (
                    <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line/70 py-2 text-small first:border-0">
                      <span className="min-w-0">
                        <span className="font-medium">Week {r.semesterWeek}{multiSession(r.className) ? `, session ${r.sessionNumber}` : ''}</span>
                        <span className="text-muted"> · {lookup.label(r.className)}{r.date ? ` · ${formatDateShort(r.date)}` : ''}</span>
                      </span>
                      <StatusPill size="sm" status={m}>{m === 'holiday' ? 'No class' : undefined}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Drop requests and past semesters */}
          <section aria-labelledby="hist-heading" className="glass rounded-card p-4">
            <h2 id="hist-heading" className="text-h2 font-semibold">History</h2>
            <h3 className="mt-3 text-small font-semibold">Drop requests</h3>
            {drops === null ? (
              <Skeleton className="mt-2 h-10 w-full rounded-[7px]" />
            ) : dropHistory.length === 0 ? (
              <p className="mt-1 text-small text-muted">None.</p>
            ) : (
              <ul className="mt-1 grid">
                {dropHistory.map(d => (
                  <li key={d.key} className="grid gap-1 border-t border-line/70 py-2 first:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ClassChip classId={d.classId} size="sm" />
                      <StatusPill status={d.status} size="sm">{d.label}</StatusPill>
                      <span className="ml-auto text-caption text-muted">{formatDateShort(d.when)}</span>
                    </div>
                    <p className="text-small text-muted">{d.text}</p>
                    {d.note && <p className="text-small"><span className="font-semibold">Admin’s note: </span>{d.note}</p>}
                  </li>
                ))}
              </ul>
            )}

            {isAdmin && (
              <>
                <h3 className="mt-4 text-small font-semibold">Past semesters</h3>
                {pastError ? (
                  <p className="mt-1 text-small text-bad-fg">Couldn’t load the archive. Check your connection and try again.</p>
                ) : past === null ? (
                  <Skeleton className="mt-2 h-10 w-full rounded-[7px]" />
                ) : past.length === 0 ? (
                  <p className="mt-1 text-small text-muted">{student.previousSemester ? `Returning from ${student.previousSemester}, but no archived record matches.` : 'First semester with us.'}</p>
                ) : (
                  <ul className="mt-1 grid">
                    {[...past].sort((a, b) => b.semesterNumber - a.semesterNumber).map(p => {
                      const pct = p.counted ? Math.round((p.present / p.counted) * 100) : null;
                      return (
                        <li key={p.archiveKey} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line/70 py-2 text-small first:border-0">
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <History size={14} className="text-faint" aria-hidden="true" />
                            <span className="font-medium">{p.semesterLabel}</span>
                            <ClassChip classId={p.classId} size="sm" />
                          </span>
                          <span className="tabular-nums text-muted">
                            {pct === null ? 'No sessions' : <><b className="font-semibold text-ink">{pct}%</b> · {p.present} of {p.counted}</>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>

        <div className="grid gap-4 lg:sticky lg:top-[88px] lg:gap-5">
          {/* Details */}
          <section aria-labelledby="details-heading" className="glass rounded-card p-4">
            <h2 id="details-heading" className="text-h2 font-semibold">Details</h2>
            <dl className="mt-2 grid text-small">
              <Detail label="Phone">
                {student.phone
                  ? <a href={`tel:${student.phoneKey ? `+${student.phoneKey}` : student.phone}`} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"><Phone size={13} aria-hidden="true" /> {student.phone}</a>
                  : '—'}
              </Detail>
              <Detail label="Gender">{student.gender || '—'}</Detail>
              {student.ward && <Detail label="Ward or branch">{student.ward}</Detail>}
              {student.email && <Detail label="Email"><a href={`mailto:${student.email}`} className="break-all underline-offset-4 hover:underline">{student.email}</a></Detail>}
              <Detail label="Classes">
                <span className="flex flex-wrap justify-end gap-1">
                  {(student.classes ?? []).length ? student.classes.map(c => <ClassChip key={c} classId={c} size="sm" />) : 'None'}
                </span>
              </Detail>
              <Detail label="Registered">{student.createdAt ? `${formatDateShort(student.createdAt)}, ${formatTime(student.createdAt)}` : '—'}</Detail>
              <Detail label="How they joined">
                {student.registrationId
                  ? <>{joinedHow}{isAdmin && <span className="block text-caption text-muted">Code {formatRefCode(student.registrationId)}</span>}</>
                  : <>{adder ? `Added by ${adder}` : joinedHow}</>}
              </Detail>
              {student.registrationId && isAdmin && (
                <Detail label="Approved by">
                  {registration === null ? '—' : <>{approver ?? 'An admin'}{registration.reviewedAt ? <span className="block text-caption text-muted">{formatDateShort(registration.reviewedAt)}</span> : null}</>}
                </Detail>
              )}
              {student.previousSemester && <Detail label="Returning from">{student.previousSemester}</Detail>}
            </dl>
          </section>

          <QrCard student={student} />
        </div>
      </div>

      {isAdmin && <EditDialog student={student} open={editing} onClose={() => setEditing(false)} />}
      {isAdmin && <AdminDropDialog student={student} classId={dropping} uid={uid} onClose={() => setDropping(null)} />}
      {!isAdmin && myClass && <DropDialog student={asking ? student : null} classId={myClass} uid={uid} onClose={() => setAsking(false)} />}
    </>
  );
}

function Count({ dot, n, label }: { dot: string; n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      <b className="font-semibold tabular-nums text-ink">{n}</b> {label}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-start gap-3 border-t border-line/70 py-2 first:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

const qrValue = (id: string) => `gathering-place://student/${id}`;

function QrCard({ student }: { student: Student }) {
  const wrap = useRef<HTMLDivElement>(null);

  /** Draws the code with the student's name under it and saves it as a PNG */
  function download() {
    const svg = wrap.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const size = 720, pad = 56, text = 72;
      const canvas = document.createElement('canvas');
      canvas.width = size + pad * 2;
      canvas.height = size + pad * 2 + text;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, size, size);
      ctx.fillStyle = colors.ink.DEFAULT;
      ctx.font = '600 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(student.name, canvas.width / 2, size + pad + 46, size);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${student.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  }

  return (
    <section aria-labelledby="qr-heading" className="glass rounded-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="qr-heading" className="text-h2 font-semibold">QR code</h2>
          <p className="text-small text-muted">Scan to check them in.</p>
        </div>
        <QrCode size={18} className="mt-1 text-faint" aria-hidden="true" />
      </div>
      <div ref={wrap} className="mx-auto mt-3 w-fit rounded-[9px] border border-line bg-white p-3">
        <QRCodeSVG value={qrValue(student.id)} size={168} fgColor={colors.ink.DEFAULT} bgColor="#FFFFFF" level="M"
          role="img" aria-label={`QR code for ${student.name}`} />
      </div>
      <p className="mt-2 text-center font-mono text-caption text-muted">ID {student.id}</p>
      <Button variant="outline" block className="mt-3" onClick={download}><Download size={16} aria-hidden="true" /> Download QR code</Button>
    </section>
  );
}

function AdminDropDialog({ student, classId, uid, onClose }: { student: Student; classId: string | null; uid: string; onClose: () => void }) {
  const lookup = useClassLookup();
  const [busy, setBusy] = useState(false);
  async function drop() {
    if (!classId) return;
    setBusy(true);
    try {
      await adminDirectDrop(student.id, classId, uid, student.classes);
      toast.success(`${student.name} dropped from ${lookup.label(classId)}`);
      onClose();
    } catch {
      toast.error('Couldn’t drop. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={!!classId} onOpenChange={o => { if (!o) onClose(); }}
      title={`Drop ${student.name} from ${classId ? lookup.label(classId) : ''}?`}
      description="They leave the register straight away. Their attendance so far is kept."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={busy} onClick={drop}>Drop</Button>
      </>}
    />
  );
}

type EditErrors = Partial<Record<'name' | 'phone' | 'email', string>>;

function EditDialog({ student, open, onClose }: { student: Student; open: boolean; onClose: () => void }) {
  const initial = () => ({ name: student.name, phone: student.phone ?? '', gender: student.gender ?? '', ward: student.ward ?? '', email: student.email ?? '' });
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setForm(initial()); setErrors({}); } }, [open]);

  const set = (k: keyof ReturnType<typeof initial>, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  async function save(e: FormEvent) {
    e.preventDefault();
    const next: EditErrors = {};
    if (form.name.trim().length < 2) next.name = 'Enter their full name.';
    if (!form.phone.trim()) next.phone = 'Enter their phone number.';
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'That email doesn’t look right.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await updateStudentDetails(student, { ...form, gender: form.gender || null });
      toast.success('Details saved');
      onClose();
    } catch (err) {
      if (err instanceof RegistrationError) setErrors({ phone: err.message });
      else toast.error('Couldn’t save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }} title="Edit details"
      description="Change a class with Drop on the attendance card."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="edit-student" loading={saving}>Save</Button>
      </>}>
      <form id="edit-student" className="grid gap-4" onSubmit={save} noValidate>
        <Field label="Full name" required error={errors.name}>
          <Input value={form.name} onChange={e => set('name', e.target.value)} disabled={saving} maxLength={80} />
        </Field>
        <Field label="Phone number" required error={errors.phone}>
          <Input type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} disabled={saving} />
        </Field>
        <Field label="Gender" optional>
          <Select value={form.gender} onChange={e => set('gender', e.target.value)} disabled={saving}>
            <option value="">Choose…</option>
            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Ward or branch" optional>
          <Input value={form.ward} onChange={e => set('ward', e.target.value)} disabled={saving} maxLength={80} />
        </Field>
        <Field label="Email" optional error={errors.email}>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={saving} maxLength={120} />
        </Field>
      </form>
    </Dialog>
  );
}
