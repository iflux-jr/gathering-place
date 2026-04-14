// src/components/admin/DropRequestsPanel.jsx
import { useState, useEffect } from 'react';
import { UserMinus, Check, X, UserPlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  subscribeToAllDropRequests,
  approveDropRequestWithClass,
  rejectDropRequest,
  adminDirectDrop,
  reEnrollStudent,
} from '../../firebase/dropRequests';
import { getStudentById } from '../../firebase/students';
import { ClassBadge, DropRequestBadge, EmptyState, Modal, Alert } from '../shared/UIComponents';
import useAuthStore from '../../store/authStore';

export default function DropRequestsPanel({ students }) {
  const { user }   = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [resolving, setResolving] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { return subscribeToAllDropRequests(setRequests); }, []);

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  async function handleApprove(req) {
    setResolving(req.id);
    try {
      const student = students.find(s => s.id === req.studentId)
        || await getStudentById(req.studentId);
      if (!student) throw new Error('Student not found');
      await approveDropRequestWithClass(req.id, user.uid, req.studentId, req.className, student.classes);
      toast.success(`${req.studentName} dropped from ${req.className}`);
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setResolving(null);
    }
  }

  async function handleReject(req) {
    setResolving(req.id);
    try {
      await rejectDropRequest(req.id, user.uid, rejectReason);
      toast.success('Drop request rejected');
      setRejectModal(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h3 className="font-display text-lg font-semibold text-brown-500">
            Pending Requests ({pending.length})
          </h3>
        </div>
        {pending.length === 0 ? (
          <div className="card text-center py-10">
            <UserMinus size={32} className="text-brown-200 mx-auto mb-2" />
            <p className="font-body text-sm text-brown-300">No pending drop requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req.id}
                   className="card flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-body font-semibold text-brown-500">{req.studentName}</p>
                    <ClassBadge className={req.className} small />
                    <DropRequestBadge status={req.status} />
                  </div>
                  {req.reason && (
                    <p className="font-body text-sm text-brown-400 italic">"{req.reason}"</p>
                  )}
                  <p className="font-body text-xs text-brown-300 mt-1">
                    Requested by teacher · {req.requestedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setRejectModal(req); setRejectReason(''); }}
                    disabled={resolving === req.id}
                    className="btn-outline text-sm py-2 px-4 text-red-600 border-red-200 hover:bg-red-500 hover:border-red-500">
                    <X size={14} /> Reject
                  </button>
                  <button onClick={() => handleApprove(req)}
                    disabled={resolving === req.id}
                    className="btn-success text-sm py-2 px-4">
                    <Check size={14} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved history */}
      {resolved.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-brown-500 mb-3">
            History ({resolved.length})
          </h3>
          <div className="card p-0 overflow-hidden">
            {resolved.map((req, idx) => (
              <div key={req.id}
                   className="flex items-center justify-between px-5 py-3.5
                              border-b border-cream-50 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <p className="font-body text-sm font-semibold text-brown-500">{req.studentName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ClassBadge className={req.className} small />
                    </div>
                  </div>
                </div>
                <DropRequestBadge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Drop Request">
        {rejectModal && (
          <div className="space-y-4">
            <Alert type="warning"
              message={`Rejecting will keep ${rejectModal.studentName} enrolled in ${rejectModal.className}.`} />
            <div>
              <label className="input-label">Reason for rejection (optional)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Student should attend remedial session first…"
                className="input-field resize-none" rows={3} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => handleReject(rejectModal)} className="btn-danger flex-1">
                <X size={14} /> Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
