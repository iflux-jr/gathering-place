// src/pages/AdminDashboard.jsx — admin sections not yet rebuilt: drop requests, archive and settings.
// Home, students, attendance and classes have their own pages.
import { useState, useEffect } from 'react';
import { GraduationCap, Lock } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState, ClassBadge, Alert } from '../components/shared/UIComponents';
import DropRequestsPanel       from '../components/admin/DropRequestsPanel';
import RegistrationControlPanel from '../components/admin/RegistrationControlPanel';
import SemesterArchivePanel    from '../components/admin/SemesterArchivePanel';
import { subscribeToAllStudents } from '../firebase/students';
import { subscribeToUsers }          from '../firebase/users';

const SECTION_TITLES = {
  requests:   'Drop requests',
  archive:    'Archive',
  settings:   'Settings',
};

export default function AdminDashboard({ section = 'requests' }) {
  const [students, setStudents] = useState([]);
  const [users,    setUsers]    = useState([]);

  useEffect(() => {
    if (section === 'requests') return subscribeToAllStudents(null, setStudents);
    if (section === 'settings') return subscribeToUsers(setUsers);
  }, [section]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title={SECTION_TITLES[section]} />

      {section === 'requests' && <DropRequestsPanel students={students} />}

      {section === 'archive' && <SemesterArchivePanel />}

      {section === 'settings' && (
        <>
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={18} className="text-orange-400" />
              <h3 className="font-display text-xl font-semibold text-brown-500">Registration Control</h3>
            </div>
            <RegistrationControlPanel />
          </div>
          <div className="space-y-6">
            <Alert type="info"
              message="Teacher accounts are created via Firebase Authentication + a Firestore user profile document." />
            <div className="grid sm:grid-cols-2 gap-4">
              {users.filter(u => u.role === 'teacher').length === 0 ? (
                <div className="sm:col-span-2">
                  <EmptyState icon={GraduationCap} title="No teachers yet" description="Create teacher accounts via Firebase Authentication." />
                </div>
              ) : users.filter(u => u.role === 'teacher').map(u => (
                <div key={u.id} className="card flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-brown-500">{u.name}</p>
                    <p className="font-body text-xs text-brown-300 truncate">{u.email}</p>
                  </div>
                  {u.assignedClass && <ClassBadge className={u.assignedClass} small />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
