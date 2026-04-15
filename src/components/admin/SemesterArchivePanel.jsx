// src/components/admin/SemesterArchivePanel.jsx
// Admin UI: archive a class semester + browse past archives

import { useState, useEffect } from 'react';
import {
  Archive, ChevronDown, ChevronRight, Users, ClipboardList,
  AlertTriangle, CheckCircle2, Loader2, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeToAllClassConfigs }      from '../../firebase/classConfig';
import { archiveClassSemester, getArchiveIndex, getArchivedStudents, getArchivedAttendance } from '../../firebase/archive';
import { recordNewSemester, getActiveSemester }    from '../../firebase/systemSettings';
import { ClassBadge, Alert, Spinner, Modal, AttendanceBadge } from '../shared/UIComponents';
import { CLASSES, CLASS_LABELS } from '../../utils/constants';
import { formatDateShort }       from '../../utils/dateUtils';
import useAuthStore from '../../store/authStore';

// Word the admin must type to confirm archiving
const CONFIRM_WORD = 'ARCHIVE';

export default function SemesterArchivePanel() {
  const { user }    = useAuthStore();
  const [configs,   setConfigs]   = useState({});
  const [archives,  setArchives]  = useState([]);   // archive index
  const [expanded,  setExpanded]  = useState(null); // expanded archive key
  const [archiveStudents,  setArchiveStudents]  = useState([]);
  const [archiveAttendance,setArchiveAttendance] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Archive modal state
  const [archiveModal, setArchiveModal] = useState(null); // classId to archive
  const [confirmInput, setConfirmInput] = useState('');
  const [archiving,    setArchiving]    = useState(false);
  const [progress,     setProgress]     = useState('');

  useEffect(() => {
    const unsub = subscribeToAllClassConfigs(setConfigs);
    loadArchiveIndex();
    return () => unsub();
  }, []);

  async function loadArchiveIndex() {
    try {
      const idx = await getArchiveIndex();
      setArchives(idx);
    } catch (err) {
      console.error('Failed to load archive index', err);
    }
  }

  async function handleExpandArchive(archiveKey) {
    if (expanded === archiveKey) { setExpanded(null); return; }
    setExpanded(archiveKey);
    setLoadingArchive(true);
    try {
      const [students, attendance] = await Promise.all([
        getArchivedStudents(archiveKey),
        getArchivedAttendance(archiveKey),
      ]);
      setArchiveStudents(students);
      setArchiveAttendance(attendance);
    } catch { toast.error('Failed to load archive data'); }
    finally { setLoadingArchive(false); }
  }

  async function handleArchive() {
    if (!archiveModal) return;
    const cfg = configs[archiveModal];
    if (!cfg?.semester?.label) { toast.error('Class has no semester configured'); return; }

    setArchiving(true);
    setProgress('Starting…');
    try {
      // Get current semester number from active semester doc
      const active = await getActiveSemester();
      const semNum = (active?.semesterNumber || 0) + 1;

      const result = await archiveClassSemester(
        archiveModal,
        cfg.semester.label,
        semNum,
        user.uid,
        msg => setProgress(msg)
      );

      // Update active semester record
      await recordNewSemester(semNum, cfg.semester.label, user.uid);

      toast.success(
        `Archived ${result.studentCount} students and ${result.attendanceCount} records for ${CLASS_LABELS[archiveModal]}`
      );
      setArchiveModal(null);
      setConfirmInput('');
      await loadArchiveIndex();
    } catch (err) {
      console.error(err);
      toast.error('Archive failed: ' + (err.message || 'Unknown error'));
    } finally {
      setArchiving(false);
      setProgress('');
    }
  }

  const classesWithConfig = CLASSES.filter(c => configs[c.id]?.semester);
  const classesWithout    = CLASSES.filter(c => !configs[c.id]?.semester);

  return (
    <div className="space-y-6">

      {/* ── Start New Semester (per class) ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Archive size={18} className="text-orange-400" />
          <h3 className="font-display text-xl font-semibold text-brown-500">Start New Semester</h3>
        </div>
        <Alert type="warning"
          message="Archiving a class moves all its students and attendance to the archive. Active student list for that class will be cleared. This cannot be undone." />

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {classesWithConfig.map(cls => {
            const cfg = configs[cls.id];
            return (
              <div key={cls.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <ClassBadge className={cls.id} />
                  <p className="font-body text-xs text-brown-300 mt-1.5">
                    {cfg.semester?.label || '—'} ·{' '}
                    {formatDateShort(cfg.semester?.startDate)} – {formatDateShort(cfg.semester?.endDate)}
                  </p>
                </div>
                <button
                  onClick={() => { setArchiveModal(cls.id); setConfirmInput(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2
                             border-orange-200 text-orange-600 hover:bg-orange-50
                             font-body font-semibold text-xs transition-all shrink-0">
                  <Archive size={13} /> Archive
                </button>
              </div>
            );
          })}

          {classesWithout.map(cls => (
            <div key={cls.id} className="card flex items-center justify-between gap-3 opacity-50">
              <div>
                <ClassBadge className={cls.id} />
                <p className="font-body text-xs text-brown-300 mt-1.5 italic">No semester configured</p>
              </div>
              <span className="font-body text-xs text-brown-300">Configure first</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Archive Browser ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-orange-400" />
            <h3 className="font-display text-xl font-semibold text-brown-500">
              Archive Browser ({archives.length})
            </h3>
          </div>
          <button onClick={loadArchiveIndex}
            className="btn-ghost py-1.5 px-3 text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {archives.length === 0 ? (
          <div className="card text-center py-10">
            <Archive size={32} className="text-brown-200 mx-auto mb-2" />
            <p className="font-body text-sm text-brown-300">No archives yet. Archive a class to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archives.map(arch => (
              <div key={arch.id} className="card p-0 overflow-hidden">
                {/* Archive header */}
                <button
                  onClick={() => handleExpandArchive(arch.id)}
                  className="w-full flex items-center justify-between px-5 py-4
                             hover:bg-cream-50/50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
                      <Archive size={16} className="text-cream-100" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ClassBadge className={arch.classId} small />
                        <span className="font-body text-sm font-semibold text-brown-500">
                          {arch.semesterLabel}
                        </span>
                      </div>
                      <p className="font-body text-xs text-brown-300 mt-0.5">
                        {arch.studentCount} students · {arch.attendanceCount} records ·{' '}
                        Archived {arch.archivedAt
                          ? new Date(arch.archivedAt).toLocaleDateString('en-NG',{month:'short',day:'numeric',year:'numeric'})
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {expanded === arch.id
                    ? <ChevronDown size={16} className="text-brown-300 shrink-0" />
                    : <ChevronRight size={16} className="text-brown-300 shrink-0" />}
                </button>

                {/* Expanded archive detail */}
                {expanded === arch.id && (
                  <div className="border-t border-cream-100 px-5 py-4 animate-slide-up">
                    {loadingArchive ? (
                      <div className="flex items-center gap-2 py-4 text-brown-300">
                        <Spinner size="sm" /> Loading archive data…
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Students */}
                        <div>
                          <p className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider mb-2">
                            Students ({archiveStudents.length})
                          </p>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {archiveStudents.map(s => (
                              <div key={s.id}
                                   className="flex items-center gap-3 p-2.5 rounded-xl bg-cream-50 border border-cream-100">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center
                                                font-bold font-body text-xs text-cream-100 shrink-0"
                                     style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
                                  {s.name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-body text-sm font-semibold text-brown-500 truncate">{s.name}</p>
                                  <p className="font-body text-xs text-brown-300">{s.phone}</p>
                                </div>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {(s.classes||[]).map(c => <ClassBadge key={c} className={c} small />)}
                                </div>
                              </div>
                            ))}
                            {archiveStudents.length === 0 && (
                              <p className="font-body text-sm text-brown-300 italic">No students in this archive.</p>
                            )}
                          </div>
                        </div>

                        {/* Attendance summary */}
                        <div>
                          <p className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider mb-2">
                            Attendance Summary
                          </p>
                          {(() => {
                            const countable = archiveAttendance.filter(r => !r.isHoliday && r.present !== null);
                            const present   = countable.filter(r => r.present === true).length;
                            const rate      = countable.length ? Math.round((present/countable.length)*100) : 0;
                            const holidays  = archiveAttendance.filter(r => r.isHoliday).length;
                            return (
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label:'Total',    val: archiveAttendance.length, cls:'bg-cream-100   border-cream-200  text-brown-500'   },
                                  { label:'Present',  val: present,                  cls:'bg-emerald-50  border-emerald-100 text-emerald-700' },
                                  { label:'Absent',   val: countable.length-present, cls:'bg-red-50      border-red-100     text-red-700'     },
                                  { label:'Holiday',  val: holidays,                 cls:'bg-violet-50   border-violet-100  text-violet-700'  },
                                ].map(s => (
                                  <div key={s.label} className={`text-center p-2.5 rounded-xl border ${s.cls}`}>
                                    <p className="font-display text-xl font-bold">{s.val}</p>
                                    <p className="font-body text-xs mt-0.5">{s.label}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Archive confirmation modal ── */}
      <Modal
        open={!!archiveModal}
        onClose={() => { if (!archiving) { setArchiveModal(null); setConfirmInput(''); } }}
        title="Archive Class Semester">
        {archiveModal && (
          <div className="space-y-5">
            {/* What will happen */}
            <div className="p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-orange-600" />
                <p className="font-body font-bold text-orange-700 text-sm">This will:</p>
              </div>
              <ul className="space-y-1.5">
                {[
                  `Archive all students enrolled in ${CLASS_LABELS[archiveModal] || archiveModal}`,
                  'Archive all attendance records for this class',
                  'Clear the active student list for this class',
                  'Cancel any pending drop requests',
                  'Open registration for fresh enrollment',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 font-body text-sm text-orange-700">
                    <CheckCircle2 size={14} className="text-orange-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Alert type="info"
              message="All archived data remains accessible in the Archive Browser above. Nothing is deleted." />

            {/* Semester label being archived */}
            <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-2xl border border-cream-100">
              <ClassBadge className={archiveModal} />
              <div>
                <p className="font-body text-sm font-semibold text-brown-500">
                  {configs[archiveModal]?.semester?.label || '—'}
                </p>
                <p className="font-body text-xs text-brown-300">
                  {formatDateShort(configs[archiveModal]?.semester?.startDate)} –{' '}
                  {formatDateShort(configs[archiveModal]?.semester?.endDate)}
                </p>
              </div>
            </div>

            {/* Progress during archive */}
            {archiving && (
              <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl animate-fade-in">
                <Loader2 size={16} className="text-amber-600 animate-spin shrink-0" />
                <p className="font-body text-sm text-amber-700">{progress}</p>
              </div>
            )}

            {/* Confirm word input */}
            {!archiving && (
              <div>
                <label className="input-label">
                  Type <span className="font-mono text-orange-600 font-bold">{CONFIRM_WORD}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value.toUpperCase())}
                  placeholder={CONFIRM_WORD}
                  className={`input-field font-mono tracking-widest text-center text-lg
                    ${confirmInput === CONFIRM_WORD ? 'border-emerald-400' : ''}`}
                  autoFocus
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setArchiveModal(null); setConfirmInput(''); }}
                disabled={archiving}
                className="btn-outline flex-1">
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving || confirmInput !== CONFIRM_WORD}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
                           font-body font-semibold text-sm text-white transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: confirmInput === CONFIRM_WORD
                  ? 'linear-gradient(135deg,#E57A06,#C46905)'
                  : '#C28E6B' }}>
                {archiving
                  ? <><Spinner size="sm" className="text-white" /> {progress}</>
                  : <><Archive size={15} /> Archive Semester</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
