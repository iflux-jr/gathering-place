// src/components/admin/ClassConfigPanel.jsx
import { useState, useEffect } from 'react';
import { Settings, Save, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeToAllClassConfigs, saveClassConfig } from '../../firebase/classConfig';
import { ClassBadge, Spinner, Alert } from '../shared/UIComponents';
import { CLASSES, SEMESTER_TOTAL_WEEKS } from '../../utils/constants';
import useAuthStore from '../../store/authStore';
import { formatDateShort } from '../../utils/dateUtils';

export default function ClassConfigPanel() {
  const { user } = useAuthStore();
  const [configs,  setConfigs]  = useState({});
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { return subscribeToAllClassConfigs(setConfigs); }, []);

  function startEdit(classId) {
    const cfg = configs[classId] || {};
    setForm({
      sessionsPerWeek: cfg.sessionsPerWeek || 1,
      semStartDate:    cfg.semester?.startDate || '',
      semEndDate:      cfg.semester?.endDate   || '',
      semLabel:        cfg.semester?.label     || '',
    });
    setEditing(classId);
  }

  async function handleSave() {
    if (!form.semStartDate || !form.semEndDate) { toast.error('Set both semester dates'); return; }
    const start = new Date(form.semStartDate);
    const end   = new Date(form.semEndDate);
    if (end <= start) { toast.error('End date must be after start date'); return; }
    setSaving(true);
    try {
      await saveClassConfig(editing, {
        sessionsPerWeek: Number(form.sessionsPerWeek),
        semester: {
          startDate:  form.semStartDate,
          endDate:    form.semEndDate,
          label:      form.semLabel || `Semester ${new Date(form.semStartDate).getFullYear()}`,
          totalWeeks: SEMESTER_TOTAL_WEEKS,
        },
        updatedBy: user.uid,
      });
      toast.success('Configuration saved!');
      setEditing(null);
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Alert type="info"
        message="Set semester dates and weekly session count for each class. Attendance is only allowed within the semester period." />
      <div className="grid sm:grid-cols-2 gap-4">
        {CLASSES.map(cls => {
          const cfg    = configs[cls.id];
          const isEdit = editing === cls.id;
          return (
            <div key={cls.id} className={`card transition-all duration-300 ${isEdit ? 'ring-2 ring-orange-400' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <ClassBadge className={cls.id} />
                {!isEdit && (
                  <button onClick={() => startEdit(cls.id)} className="btn-ghost py-1 px-3 text-xs">
                    <Settings size={13} /> Configure
                  </button>
                )}
              </div>
              {isEdit ? (
                <div className="space-y-3">
                  <div>
                    <label className="input-label text-xs">Sessions Per Week</label>
                    <select value={form.sessionsPerWeek}
                      onChange={e => setForm(f => ({ ...f, sessionsPerWeek: e.target.value }))}
                      className="input-field py-2 text-sm">
                      {[1,2,3,4,5].map(n => (
                        <option key={n} value={n}>{n} session{n>1?'s':''}/week</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="input-label text-xs">Start Date</label>
                      <input type="date" value={form.semStartDate}
                        onChange={e => setForm(f => ({ ...f, semStartDate: e.target.value }))}
                        className="input-field py-2 text-sm" />
                    </div>
                    <div>
                      <label className="input-label text-xs">End Date</label>
                      <input type="date" value={form.semEndDate}
                        onChange={e => setForm(f => ({ ...f, semEndDate: e.target.value }))}
                        className="input-field py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="input-label text-xs">Semester Label</label>
                    <input type="text" value={form.semLabel}
                      onChange={e => setForm(f => ({ ...f, semLabel: e.target.value }))}
                      placeholder="e.g. Jan–Mar 2025" className="input-field py-2 text-sm" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditing(null)} className="btn-ghost flex-1 py-2 text-sm border border-cream-200">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2 text-sm">
                      {saving ? <Spinner size="sm" className="text-white" /> : <><Save size={13} /> Save</>}
                    </button>
                  </div>
                </div>
              ) : cfg ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-orange-400" />
                    <span className="font-body text-sm font-semibold text-brown-500">
                      {cfg.sessionsPerWeek} session{cfg.sessionsPerWeek > 1 ? 's' : ''}/week
                    </span>
                  </div>
                  {cfg.semester && (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-orange-400" />
                      <span className="font-body text-xs text-brown-400">
                        {formatDateShort(cfg.semester.startDate)} – {formatDateShort(cfg.semester.endDate)}
                        {cfg.semester.label && ` · ${cfg.semester.label}`}
                      </span>
                    </div>
                  )}
                  {cfg.holidays?.length > 0 && (
                    <p className="font-body text-xs text-violet-600">
                      {cfg.holidays.length} holiday session{cfg.holidays.length > 1 ? 's' : ''} marked
                    </p>
                  )}
                </div>
              ) : (
                <p className="font-body text-xs text-brown-300 italic">Not configured yet — click Configure</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
