// src/components/admin/RegistrationControlPanel.jsx
// Admin UI for pausing/resuming student registration

import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Lock, Unlock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeToRegistrationStatus, setRegistrationStatus } from '../../firebase/systemSettings';
import { Alert, Spinner } from '../shared/UIComponents';
import useAuthStore from '../../store/authStore';

export default function RegistrationControlPanel() {
  const { user } = useAuthStore();
  const [status,  setStatus]  = useState({ isOpen: true, message: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const unsub = subscribeToRegistrationStatus(s => {
      setStatus(s);
      setMessage(s.message || '');
    });
    return () => unsub();
  }, []);

  async function handleToggle() {
    // Opening — no message needed, just open
    if (!status.isOpen) {
      setLoading(true);
      try {
        await setRegistrationStatus(true, '', user.uid);
        toast.success('Registration is now open');
        setEditing(false);
      } catch { toast.error('Failed to update registration status'); }
      finally { setLoading(false); }
      return;
    }
    // Pausing — show message editor
    setEditing(true);
  }

  async function handlePause() {
    setLoading(true);
    try {
      await setRegistrationStatus(false, message.trim(), user.uid);
      toast.success('Registration paused');
      setEditing(false);
    } catch { toast.error('Failed to pause registration'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Status card */}
      <div className={`card border-2 transition-all duration-300
        ${status.isOpen
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-red-200 bg-red-50/30'}`}>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
              ${status.isOpen ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {status.isOpen
                ? <Unlock size={22} className="text-emerald-600" />
                : <Lock   size={22} className="text-red-600" />}
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-brown-500">
                Registration is {status.isOpen ? 'Open' : 'Paused'}
              </p>
              {!status.isOpen && status.message && (
                <p className="font-body text-sm text-red-600 mt-0.5 italic">
                  "{status.message}"
                </p>
              )}
              {status.updatedAt && (
                <p className="font-body text-xs text-brown-300 mt-1">
                  Last changed: {status.updatedAt?.toDate?.()?.toLocaleDateString('en-NG', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  }) || 'Recently'}
                </p>
              )}
            </div>
          </div>

          {/* Toggle button */}
          {!editing && (
            <button
              onClick={handleToggle}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-body font-semibold
                          text-sm border-2 transition-all duration-200 shrink-0
                          ${status.isOpen
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
              {loading ? <Spinner size="sm" /> : status.isOpen
                ? <><Lock size={14} /> Pause Registration</>
                : <><Unlock size={14} /> Open Registration</>}
            </button>
          )}
        </div>

        {/* Pause form */}
        {editing && status.isOpen && (
          <div className="mt-5 pt-5 border-t border-red-100 space-y-3 animate-slide-up">
            <div>
              <label className="input-label">
                Message shown to users <span className="text-brown-300 font-normal">(required)</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder='e.g. "Registration is currently closed. New intake begins March 2026."'
                className="input-field resize-none"
                rows={3}
                autoFocus
              />
              <p className="font-body text-xs text-brown-300 mt-1">
                This message will be shown on the registration page and to teachers.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)}
                className="btn-outline flex-1 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handlePause}
                disabled={loading || !message.trim()}
                className="btn-danger flex-1 py-2 text-sm">
                {loading ? <Spinner size="sm" className="text-white" /> : <><Lock size={13} /> Confirm Pause</>}
              </button>
            </div>
          </div>
        )}
      </div>

      <Alert
        type="info"
        message="When registration is paused, teachers cannot submit the registration form and new students cannot be added. All existing students and attendance records are unaffected." />
    </div>
  );
}
