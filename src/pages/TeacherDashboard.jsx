// src/pages/TeacherDashboard.jsx — v2: sessions, semester, holidays, drop requests
import { useState, useEffect, useMemo } from 'react';
import {
  Search, Send, RefreshCw, CheckSquare, XSquare,
  Users, CheckCircle2, XCircle, BarChart2, School,
  ShieldCheck, CalendarOff, ChevronRight, UserMinus,
  AlertTriangle, Calendar, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar   from '../components/shared/Navbar';
import {
  PageLoader, EmptyState, ClassBadge, AttendanceBadge,
  StatCard, SkeletonRow, Alert, Modal, Spinner,
  SessionPill, SemesterProgressBar, DropRequestBadge,
} from '../components/shared/UIComponents';
import { subscribeToStudentsByClass }                     from '../firebase/students';
import { submitSessionAttendance, subscribeToWeekAttendance, calcAttendancePercentage } from '../firebase/attendance';
import { subscribeToClassConfig, setHoliday, isHolidaySession } from '../firebase/classConfig';
import { createDropRequest, subscribeToDropRequests }    from '../firebase/dropRequests';
import {
  currentSemesterWeek, getSemesterStatus, formatDateShort,
  formatSemesterWeekLabel, getSemesterWeeks,
} from '../utils/dateUtils';
import useAuthStore   from '../store/authStore';
import { CLASS_LABELS, SEMESTER_TOTAL_WEEKS } from '../utils/constants';

export default function TeacherDashboard() {
  const { profile, user }  = useAuthStore();
  const assignedClass      = profile?.assignedClass;
  const isAdminTeacher     = profile?.role === 'admin' && !!assignedClass;

  // Config
  const [config,      setConfig]      = useState(null);
  const [students,    setStudents]    = useState([]);
  const [weekRecords, setWeekRecords] = useState([]);   // attendance for current sem week
  const [dropReqs,    setDropReqs]    = useState([]);

  // UI state
  const [loading,      setLoading]      = useState(true);
  const [activeSession, setActiveSession] = useState(1);
  const [attendance,   setAttendance]   = useState({});  // { studentId: bool }
  const [submitting,   setSubmitting]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilter]       = useState('all');
  const [dropModal,    setDropModal]    = useState(null); // student object
  const [dropReason,   setDropReason]   = useState('');
  const [holidayModal, setHolidayModal] = useState(false);
  const [markingHoliday, setMarkingHoliday] = useState(false);

  // Derived semester info
  const semStatus  = useMemo(() => getSemesterStatus(config?.semester), [config]);
  const semWeek    = useMemo(() => currentSemesterWeek(config?.semester) || 0, [config]);
  const sessionsPerWeek = config?.sessionsPerWeek || 1;
  const sessions   = Array.from({ length: sessionsPerWeek }, (_, i) => i + 1);

  // Subscribe to class config
  useEffect(() => {
    if (!assignedClass) { setLoading(false); return; }
    const unsub = subscribeToClassConfig(assignedClass, cfg => {
      setConfig(cfg);
      setLoading(false);
    });
    return () => unsub();
  }, [assignedClass]);

  // Subscribe to students
  useEffect(() => {
    if (!assignedClass) return;
    return subscribeToStudentsByClass(assignedClass, setStudents);
  }, [assignedClass]);

  // Subscribe to this week's attendance (all sessions)
  useEffect(() => {
    if (!assignedClass || !semWeek) return;
    return subscribeToWeekAttendance(assignedClass, semWeek, setWeekRecords);
  }, [assignedClass, semWeek]);

  // Subscribe to drop requests for this class
  useEffect(() => {
    if (!assignedClass) return;
    return subscribeToDropRequests(assignedClass, setDropReqs);
  }, [assignedClass]);

  // Pre-populate attendance from existing records for active session
  useEffect(() => {
    const sessionRecs = weekRecords.filter(r => r.sessionNumber === activeSession);
    if (sessionRecs.length > 0) {
      const map = {};
      sessionRecs.forEach(r => { map[r.studentId] = r.present; });
      setAttendance(map);
    } else {
      setAttendance({});
    }
  }, [weekRecords, activeSession]);

  // Helpers
  const isSessionSubmitted = (sNum) =>
    weekRecords.some(r => r.sessionNumber === sNum && r.submittedAt);

  const isSessionHoliday = (sNum) =>
    isHolidaySession(config, semWeek, sNum);

  function markStudent(studentId, present) {
    setAttendance(prev => ({ ...prev, [studentId]: present }));
  }

  function markAll(present) {
    const map = {};
    students.forEach(s => { map[s.id] = present; });
    setAttendance(map);
  }

  async function handleSubmitAttendance() {
    const unmarked = students.filter(s => attendance[s.id] === undefined);
    if (unmarked.length > 0) {
      toast.error(`${unmarked.length} student(s) not marked yet`);
      return;
    }
    if (semStatus !== 'active') {
      toast.error('Semester is not active');
      return;
    }
    setSubmitting(true);
    try {
      const records = students.map(s => ({
        studentId:   s.id,
        studentName: s.name,
        present:     attendance[s.id],
      }));
      await submitSessionAttendance(
        records, assignedClass, user.uid,
        activeSession, config?.semester, false
      );
      toast.success(`Session ${activeSession} attendance submitted!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkHoliday() {
    if (!semWeek) { toast.error('No active semester week'); return; }
    setMarkingHoliday(true);
    try {
      await setHoliday(assignedClass, semWeek, activeSession, true, user.uid);
      toast.success(`Session ${activeSession} marked as holiday`);
      setHolidayModal(false);
    } catch (err) {
      toast.error('Failed to mark holiday');
    } finally {
      setMarkingHoliday(false);
    }
  }

  async function handleUnmarkHoliday() {
    await setHoliday(assignedClass, semWeek, activeSession, false, user.uid);
    toast.success('Holiday removed');
  }

  async function handleDropRequest() {
    if (!dropModal) return;
    try {
      await createDropRequest({
        studentId:   dropModal.id,
        studentName: dropModal.name,
        className:   assignedClass,
        requestedBy: user.uid,
        reason:      dropReason,
      });
      toast.success(`Drop request submitted for ${dropModal.name}`);
      setDropModal(null);
      setDropReason('');
    } catch {
      toast.error('Failed to submit drop request');
    }
  }

  // Filtered students
  const filtered = useMemo(() => students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
    const status = attendance[s.id];
    const matchFilter =
      filterStatus === 'all'     ? true :
      filterStatus === 'present' ? status === true :
      filterStatus === 'absent'  ? status === false :
      status === undefined;
    return matchSearch && matchFilter;
  }), [students, search, filterStatus, attendance]);

  // Stats
  const totalPresent  = Object.values(attendance).filter(v => v === true).length;
  const totalAbsent   = Object.values(attendance).filter(v => v === false).length;
  const totalUnmarked = students.length - totalPresent - totalAbsent;
  const pct = students.length ? Math.round((totalPresent / students.length) * 100) : 0;
  const pendingDrops  = dropReqs.filter(d => d.status === 'pending').length;

  // ── No class assigned ──
  if (!assignedClass) {
    return (
      <div className="page-wrapper min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <EmptyState icon={School} title="No Class Assigned"
            description={profile?.role === 'admin'
              ? 'Add assignedClass to your Firestore user profile to teach a class.'
              : 'Contact your administrator to get a class assigned.'} />
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return <div className="page-wrapper min-h-screen"><Navbar /><PageLoader message="Loading class data…" /></div>;
  }

  return (
    <div className="page-wrapper min-h-screen">
      <Navbar pendingDrops={pendingDrops} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-slide-up">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <ClassBadge className={assignedClass} />
              {isAdminTeacher && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                                 font-semibold font-body bg-orange-100 text-orange-700 border border-orange-200">
                  <ShieldCheck size={11} /> Admin view
                </span>
              )}
              <span className="font-body text-xs text-brown-300 flex items-center gap-1">
                <Calendar size={12} />
                {semStatus === 'active' && semWeek
                  ? formatSemesterWeekLabel(semWeek, SEMESTER_TOTAL_WEEKS)
                  : semStatus === 'not_started' ? 'Semester not started'
                  : semStatus === 'ended' ? 'Semester ended'
                  : 'No semester configured'}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold text-brown-500">
              {CLASS_LABELS[assignedClass] || assignedClass}
            </h1>
            <p className="font-body text-sm text-brown-300 mt-1">
              {profile?.name}
              {config?.semester && (
                <> · {formatDateShort(config.semester.startDate)} – {formatDateShort(config.semester.endDate)}</>
              )}
            </p>
          </div>

          {/* Semester status pill */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-semibold font-body shrink-0
            ${semStatus === 'active'        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : semStatus === 'not_started'   ? 'bg-amber-50 border-amber-200 text-amber-700'
            : semStatus === 'ended'         ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-cream-100 border-cream-200 text-brown-400'}`}>
            <div className={`w-2 h-2 rounded-full ${semStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-current opacity-50'}`} />
            {semStatus === 'active' ? 'Semester Active'
            : semStatus === 'not_started' ? `Starts ${formatDateShort(config?.semester?.startDate)}`
            : semStatus === 'ended' ? 'Semester Ended'
            : 'No Semester'}
          </div>
        </div>

        {/* ── Semester progress ── */}
        {config?.semester && semWeek > 0 && (
          <div className="card animate-slide-up" style={{ animationDelay:'0.05s' }}>
            <SemesterProgressBar currentWeek={semWeek} totalWeeks={SEMESTER_TOTAL_WEEKS} />
          </div>
        )}

        {/* ── Session tabs ── */}
        {sessionsPerWeek > 1 && (
          <div className="flex items-center gap-2 flex-wrap animate-slide-up" style={{ animationDelay:'0.1s' }}>
            <span className="font-body text-xs font-semibold text-brown-400 uppercase tracking-wider mr-1">Sessions:</span>
            {sessions.map(sNum => {
              const done    = isSessionSubmitted(sNum);
              const holiday = isSessionHoliday(sNum);
              const active  = activeSession === sNum;
              return (
                <button key={sNum} onClick={() => setActiveSession(sNum)}
                  className={`session-pill cursor-pointer
                    ${holiday ? 'session-pill-holiday'
                    : done    ? 'session-pill-done'
                    : active  ? 'session-pill-active ring-2 ring-orange-400 ring-offset-1'
                    : 'session-pill-pending hover:border-orange-300'}`}>
                  <SessionPill sessionNumber={sNum}
                    status={holiday ? 'holiday' : done ? 'done' : active ? 'active' : 'pending'} />
                </button>
              );
            })}
            <span className="font-body text-xs text-brown-300 ml-auto">
              {sessionsPerWeek} session{sessionsPerWeek > 1 ? 's' : ''}/week
            </span>
          </div>
        )}

        {/* ── Semester not configured warning ── */}
        {semStatus === 'not_configured' && (
          <Alert type="warning" message="No semester configured for this class. Ask the admin to set up the semester dates and sessions per week before marking attendance." />
        )}

        {/* ── Holiday banner ── */}
        {isSessionHoliday(activeSession) && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl
                          bg-violet-50 border border-violet-200">
            <div className="flex items-center gap-3">
              <CalendarOff size={20} className="text-violet-600" />
              <div>
                <p className="font-body font-semibold text-violet-700 text-sm">
                  Session {activeSession} — Holiday / No Class
                </p>
                <p className="font-body text-xs text-violet-500">
                  This session is excluded from attendance calculations
                </p>
              </div>
            </div>
            <button onClick={handleUnmarkHoliday}
              className="font-body text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2">
              Remove holiday
            </button>
          </div>
        )}

        {/* ── Stats ── */}
        {!isSessionHoliday(activeSession) && semStatus === 'active' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay:'0.15s' }}>
            <StatCard label="Students"    value={students.length} Icon={Users} />
            <StatCard label="Present"     value={totalPresent}    Icon={CheckCircle2} />
            <StatCard label="Absent"      value={totalAbsent}     Icon={XCircle} />
            <StatCard label="Rate"        value={`${pct}%`}       Icon={BarChart2} accent={pct >= 75} />
          </div>
        )}

        {/* ── Marking progress bar ── */}
        {!isSessionHoliday(activeSession) && students.length > 0 && semStatus === 'active' && (
          <div className="card py-4 animate-slide-up" style={{ animationDelay:'0.2s' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-body text-sm font-semibold text-brown-500">
                Session {activeSession} — Marking Progress
              </span>
              <span className="font-mono text-xs text-brown-300">
                {students.length - totalUnmarked}/{students.length}
              </span>
            </div>
            <div className="h-2.5 bg-cream-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                   style={{
                     width: `${students.length ? ((students.length - totalUnmarked) / students.length) * 100 : 0}%`,
                     background: 'linear-gradient(90deg, #E57A06, #C46905)',
                   }} />
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        {!isSessionHoliday(activeSession) && semStatus === 'active' && students.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay:'0.22s' }}>
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search students…" className="input-field pl-10" />
            </div>
            <select value={filterStatus} onChange={e => setFilter(e.target.value)} className="input-field sm:w-36">
              <option value="all">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="unmarked">Unmarked</option>
            </select>
            <button onClick={() => markAll(true)}  className="btn-outline text-sm whitespace-nowrap">
              <CheckSquare size={14} /> All Present
            </button>
            <button onClick={() => markAll(false)} className="btn-ghost text-sm whitespace-nowrap border border-cream-200">
              <XSquare size={14} /> All Absent
            </button>
          </div>
        )}

        {/* ── Student list ── */}
        {semStatus === 'active' && (
          <div className="card p-0 overflow-hidden animate-slide-up" style={{ animationDelay:'0.25s' }}>
            {students.length === 0 ? (
              <EmptyState icon={Users} title="No students enrolled"
                description="No students are enrolled in this class yet." />
            ) : isSessionHoliday(activeSession) ? (
              <div className="py-12 text-center">
                <CalendarOff size={40} className="text-violet-300 mx-auto mb-3" />
                <p className="font-display text-lg font-semibold text-brown-400">Holiday — No Attendance</p>
                <p className="font-body text-sm text-brown-300 mt-1">
                  This session is marked as a holiday and excluded from calculations.
                </p>
              </div>
            ) : (
              <>
                {/* Table header — desktop only */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-3
                                border-b border-cream-100"
                     style={{ background:'linear-gradient(160deg,#FDFAF7,#F2E9DE)' }}>
                  {['Student', 'Phone', 'Status', 'Mark'].map(h => (
                    <span key={h} className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                {filtered.map((student, idx) => (
                  <TeacherStudentRow
                    key={student.id}
                    student={student}
                    status={attendance[student.id]}
                    onMark={markStudent}
                    onDrop={() => setDropModal(student)}
                    index={idx}
                    existingDropReq={dropReqs.find(d => d.studentId === student.id && d.status === 'pending')}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Action bar ── */}
        {semStatus === 'active' && !isSessionHoliday(activeSession) && students.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3
                          animate-slide-up" style={{ animationDelay:'0.3s' }}>
            {/* Mark as holiday */}
            <button onClick={() => setHolidayModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2
                         border-violet-200 text-violet-600 hover:bg-violet-50 font-body
                         text-sm font-semibold transition-all duration-200">
              <CalendarOff size={15} /> Mark as Holiday
            </button>

            {/* Submit */}
            <button onClick={handleSubmitAttendance}
              disabled={submitting || totalUnmarked > 0}
              className="btn-primary px-8">
              {submitting
                ? <><Spinner size="sm" className="text-white" /> Submitting…</>
                : <><Send size={15} /> Submit Session {activeSession}</>}
            </button>
          </div>
        )}

        {totalUnmarked > 0 && semStatus === 'active' && !isSessionHoliday(activeSession) && (
          <Alert type="warning" message={`${totalUnmarked} student(s) not yet marked for Session ${activeSession}.`} />
        )}

        {isSessionSubmitted(activeSession) && !isSessionHoliday(activeSession) && (
          <Alert type="success" message={`Session ${activeSession} attendance submitted. You can still update records.`} />
        )}

        {/* ── Drop requests status ── */}
        {dropReqs.length > 0 && (
          <div className="card animate-slide-up" style={{ animationDelay:'0.35s' }}>
            <h3 className="font-display text-lg font-semibold text-brown-500 mb-4 accent-line">
              Drop Requests
            </h3>
            <div className="space-y-2">
              {dropReqs.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3
                                             bg-cream-50 rounded-2xl border border-cream-100">
                  <div>
                    <p className="font-body text-sm font-semibold text-brown-500">{req.studentName}</p>
                    {req.reason && <p className="font-body text-xs text-brown-300 mt-0.5">"{req.reason}"</p>}
                  </div>
                  <DropRequestBadge status={req.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Drop request modal ── */}
      <Modal open={!!dropModal} onClose={() => { setDropModal(null); setDropReason(''); }}
             title="Request Student Drop">
        {dropModal && (
          <div className="space-y-5">
            <Alert type="warning"
              message="This will send a drop request to admin. The student will remain enrolled until approved." />
            <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-2xl border border-cream-100">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center
                              font-bold font-display text-sm text-white shrink-0"
                   style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
                {dropModal.name.charAt(0)}
              </div>
              <div>
                <p className="font-body font-semibold text-brown-500 text-sm">{dropModal.name}</p>
                <p className="font-body text-xs text-brown-300">{dropModal.phone}</p>
              </div>
            </div>
            <div>
              <label className="input-label">Reason (optional)</label>
              <textarea
                value={dropReason}
                onChange={e => setDropReason(e.target.value)}
                placeholder="e.g. Student requested withdrawal, moved to another class…"
                className="input-field resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDropModal(null); setDropReason(''); }}
                className="btn-outline flex-1">Cancel</button>
              <button onClick={handleDropRequest}
                className="btn-danger flex-1 flex items-center justify-center gap-2">
                <UserMinus size={15} /> Submit Request
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Holiday confirmation modal ── */}
      <Modal open={holidayModal} onClose={() => setHolidayModal(false)} title="Mark as Holiday">
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-center">
            <CalendarOff size={28} className="text-violet-600 mx-auto mb-2" />
            <p className="font-body font-semibold text-violet-700 text-sm">
              Session {activeSession} — {formatSemesterWeekLabel(semWeek)}
            </p>
            <p className="font-body text-xs text-violet-500 mt-1">
              No attendance will be taken. This session is excluded from percentage calculations.
            </p>
          </div>
          <Alert type="info" message="Students will not be marked absent for this session." />
          <div className="flex gap-3">
            <button onClick={() => setHolidayModal(false)} className="btn-outline flex-1">Cancel</button>
            <button onClick={handleMarkHoliday} disabled={markingHoliday}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
                         font-body font-semibold text-sm text-white transition-all duration-200"
              style={{ background:'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
              {markingHoliday ? <Spinner size="sm" className="text-white" /> : <CalendarOff size={15} />}
              Confirm Holiday
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TeacherStudentRow({ student, status, onMark, onDrop, index, existingDropReq }) {
  return (
    <div className="border-b border-cream-50 hover:bg-cream-50/50
                    transition-colors duration-150 animate-fade-in"
         style={{ animationDelay:`${index * 0.025}s` }}>

      {/* ── Mobile layout (< sm) ── */}
      <div className="flex items-start gap-3 px-4 py-4 sm:hidden">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center
                        text-cream-100 font-bold font-body text-sm shrink-0 mt-0.5"
             style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
          {student.name.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className="font-body font-semibold text-brown-500 text-sm leading-snug">
            {student.name}
          </p>
          {/* Phone */}
          <p className="font-body text-xs text-brown-300 mb-2">{student.phone}</p>

          {/* Status + drop warning */}
          <div className="flex items-center gap-2 flex-wrap">
            <AttendanceBadge present={status} size="sm" />
            {existingDropReq && (
              <span className="font-body text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle size={10} /> Drop pending
              </span>
            )}
          </div>
        </div>

        {/* Mark + drop actions — stacked vertically */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button onClick={() => onMark(student.id, true)} title="Present"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
              ${status === true
                ? 'text-white shadow-sm'
                : 'bg-cream-100 text-brown-300 hover:bg-emerald-100 hover:text-emerald-600'}`}
            style={status === true ? { background:'linear-gradient(135deg,#10b981,#059669)' } : {}}>
            <CheckSquare size={15} />
          </button>
          <button onClick={() => onMark(student.id, false)} title="Absent"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
              ${status === false
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-cream-100 text-brown-300 hover:bg-red-100 hover:text-red-600'}`}>
            <XSquare size={15} />
          </button>
          <button onClick={onDrop} title="Request drop"
            disabled={!!existingDropReq}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-cream-100
                       text-brown-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed">
            <UserMinus size={14} />
          </button>
        </div>
      </div>

      {/* ── Desktop layout (sm+) ── */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-4 items-center">
        {/* Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center
                          text-cream-100 font-bold font-body text-sm shrink-0"
               style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-body font-semibold text-brown-500 text-sm truncate">{student.name}</p>
            {existingDropReq && (
              <span className="font-body text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle size={10} /> Drop pending
              </span>
            )}
          </div>
        </div>

        {/* Phone */}
        <p className="font-body text-sm text-brown-300 whitespace-nowrap">{student.phone}</p>

        {/* Status */}
        <AttendanceBadge present={status} size="sm" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => onMark(student.id, true)} title="Present"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
              ${status === true
                ? 'text-white shadow-sm'
                : 'bg-cream-100 text-brown-300 hover:bg-emerald-100 hover:text-emerald-600'}`}
            style={status === true ? { background:'linear-gradient(135deg,#10b981,#059669)' } : {}}>
            <CheckSquare size={15} />
          </button>
          <button onClick={() => onMark(student.id, false)} title="Absent"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
              ${status === false
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-cream-100 text-brown-300 hover:bg-red-100 hover:text-red-600'}`}>
            <XSquare size={15} />
          </button>
          <button onClick={onDrop} title="Request drop"
            disabled={!!existingDropReq}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-cream-100
                       text-brown-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed">
            <UserMinus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
