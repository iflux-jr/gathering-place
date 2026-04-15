// src/pages/AdminDashboard.jsx — v3: registration control + semester archive
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, Download, Search, Eye, LayoutDashboard,
  ClipboardList, BarChart2, GraduationCap, TrendingUp,
  Check, X, Settings, UserMinus, CalendarDays,
  Archive, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/shared/Navbar';
import {
  PageLoader, EmptyState, ClassBadge, AttendanceBadge,
  StatCard, SkeletonCard, SkeletonRow, Modal,
  PercentageRing, Alert, DropRequestBadge,
} from '../components/shared/UIComponents';
import ClassConfigPanel        from '../components/admin/ClassConfigPanel';
import DropRequestsPanel       from '../components/admin/DropRequestsPanel';
import RegistrationControlPanel from '../components/admin/RegistrationControlPanel';
import SemesterArchivePanel    from '../components/admin/SemesterArchivePanel';
import { subscribeToAllStudents, updateStudent } from '../firebase/students';
import { subscribeToAllAttendance, calcAttendancePercentage } from '../firebase/attendance';
import { subscribeToUsers }          from '../firebase/users';
import { subscribeToAllDropRequests, adminDirectDrop } from '../firebase/dropRequests';
import { subscribeToAllClassConfigs } from '../firebase/classConfig';
import { subscribeToRegistrationStatus } from '../firebase/systemSettings';
import { formatDateShort } from '../utils/dateUtils';
import { exportToCSV, formatStudentsForExport, formatAttendanceForExport } from '../utils/exportUtils';
import { CLASSES, CLASS_LABELS, CHART_COLORS } from '../utils/constants';
import useAuthStore from '../store/authStore';

const TABS = [
  { id: 'overview',    label: 'Overview',      Icon: LayoutDashboard },
  { id: 'students',    label: 'Students',      Icon: Users },
  { id: 'attendance',  label: 'Attendance',    Icon: ClipboardList },
  { id: 'analytics',  label: 'Analytics',     Icon: BarChart2 },
  { id: 'config',     label: 'Class Setup',   Icon: Settings },
  { id: 'drops',      label: 'Drop Requests', Icon: UserMinus },
  { id: 'archive',    label: 'Archive',       Icon: Archive },
  { id: 'registration',label: 'Registration', Icon: Lock },
  { id: 'teachers',   label: 'Teachers',      Icon: GraduationCap },
];

export default function AdminDashboard() {
  const { profile, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  const [students,    setStudents]    = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [users,       setUsers]       = useState([]);
  const [dropReqs,    setDropReqs]    = useState([]);
  const [classConfigs,setClassConfigs]= useState({});
  const [regStatus,   setRegStatus]   = useState({ isOpen: true });
  const [loading,     setLoading]     = useState(true);

  // Filters
  const [classFilter, setClassFilter] = useState('');
  const [search,      setSearch]      = useState('');
  const [semWkFilter, setSemWkFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [directDropModal, setDirectDropModal] = useState(null);

  // ── Subscriptions ──
  useEffect(() => {
    const u1 = subscribeToAllStudents(null, d => { setStudents(d); setLoading(false); });
    const u2 = subscribeToAllAttendance(setAttendance);
    const u3 = subscribeToUsers(setUsers);
    const u4 = subscribeToAllDropRequests(setDropReqs);
    const u5 = subscribeToAllClassConfigs(setClassConfigs);
    const u6 = subscribeToRegistrationStatus(setRegStatus);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  const pendingDrops = dropReqs.filter(r => r.status === 'pending').length;

  // ── Derived stats ──
  const stats = useMemo(() => {
    const totalStudents   = students.length;
    const totalPresent    = attendance.filter(r => r.present === true  && !r.isHoliday).length;
    const totalCountable  = attendance.filter(r => r.present !== null  && !r.isHoliday).length;
    const overallRate     = totalCountable ? Math.round((totalPresent / totalCountable) * 100) : 0;
    const teachers        = users.filter(u => u.role === 'teacher').length;
    const holidaySessions = attendance.filter(r => r.isHoliday).length;
    return { totalStudents, overallRate, teachers, holidaySessions };
  }, [students, attendance, users]);

  // ── Filtered students ──
  const filteredStudents = useMemo(() => students.filter(s => {
    const matchClass  = !classFilter || (s.classes || []).includes(classFilter);
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
    return matchClass && matchSearch;
  }), [students, classFilter, search]);

  // ── Filtered attendance ──
  const filteredAttendance = useMemo(() => attendance.filter(r => {
    const matchClass = !classFilter || r.className === classFilter;
    const matchSearch = !search || r.studentName?.toLowerCase().includes(search.toLowerCase());
    const matchWeek  = semWkFilter === 'all' || String(r.semesterWeek) === String(semWkFilter);
    return matchClass && matchSearch && matchWeek && !r.isHoliday;
  }), [attendance, classFilter, search, semWkFilter]);

  // ── Chart data ──
  const classChartData = useMemo(() => CLASSES.map(cls => {
    const clsStudents = students.filter(s => (s.classes || []).includes(cls.id));
    const clsAtt      = attendance.filter(r => r.className === cls.id && !r.isHoliday && r.present !== null);
    const present     = clsAtt.filter(r => r.present === true).length;
    const rate        = clsAtt.length ? Math.round((present / clsAtt.length) * 100) : 0;
    const cfg         = classConfigs[cls.id];
    return { name: cls.label, students: clsStudents.length, rate, sessions: cfg?.sessionsPerWeek || 1 };
  }), [students, attendance, classConfigs]);

  const weeklyChartData = useMemo(() => {
    const weeks = [...new Set(attendance.map(r => r.semesterWeek).filter(Boolean))].sort((a,b)=>a-b).slice(-8);
    return weeks.map(w => {
      const wRecs   = attendance.filter(r => r.semesterWeek === w && !r.isHoliday && r.present !== null);
      const present = wRecs.filter(r => r.present === true).length;
      const rate    = wRecs.length ? Math.round((present / wRecs.length) * 100) : 0;
      return { name: `Wk ${w}`, rate, total: wRecs.length };
    });
  }, [attendance]);

  // ── Unique semester weeks for filter ──
  const semWeeks = useMemo(() => {
    const weeks = [...new Set(attendance.map(r => r.semesterWeek).filter(Boolean))].sort((a,b)=>a-b);
    return weeks;
  }, [attendance]);

  // ── Export ──
  function exportStudents() {
    exportToCSV(formatStudentsForExport(filteredStudents), `students_${Date.now()}.csv`);
    toast.success('Students exported');
  }
  function exportAttendance() {
    exportToCSV(formatAttendanceForExport(filteredAttendance), `attendance_${Date.now()}.csv`);
    toast.success('Attendance exported');
  }

  // ── Student detail attendance ──
  const studentDetail = useMemo(() => {
    if (!selectedStudent) return [];
    return attendance
      .filter(r => r.studentId === selectedStudent.id)
      .sort((a,b) => (b.semesterWeek||0) - (a.semesterWeek||0) || (b.sessionNumber||0) - (a.sessionNumber||0));
  }, [attendance, selectedStudent]);

  // ── Direct drop ──
  async function handleDirectDrop() {
    if (!directDropModal) return;
    try {
      await adminDirectDrop(
        directDropModal.studentId, directDropModal.className,
        user.uid, directDropModal.classes
      );
      toast.success(`Student dropped from ${directDropModal.className}`);
      setDirectDropModal(null);
    } catch (err) {
      toast.error(err.message || 'Failed to drop student');
    }
  }

  const tooltipStyle = { fontFamily:'Plus Jakarta Sans', borderRadius:'12px', border:'1px solid #E8D5C0', fontSize:12 };

  return (
    <div className="page-wrapper min-h-screen">
      <Navbar pendingDrops={pendingDrops} />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="font-display text-3xl font-bold text-brown-500">Admin Dashboard</h1>
            <p className="font-body text-sm text-brown-300 mt-1">
              Welcome back, {profile?.name}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-2xl border border-cream-200
                          shadow-warm-sm text-xs font-body text-brown-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live updates active
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay:'0.05s' }}>
          {TABS.map(tab => {
            const hasBadge    = tab.id === 'drops' && pendingDrops > 0;
            const hasRegBadge = tab.id === 'registration' && !regStatus.isOpen;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl font-body text-sm
                            font-semibold whitespace-nowrap transition-all duration-200
                            ${activeTab === tab.id
                              ? 'text-white shadow-warm'
                              : 'bg-white text-brown-400 hover:bg-cream-100 border border-cream-200 hover:border-cream-300'}`}
                style={activeTab === tab.id ? { background:'linear-gradient(160deg,#5A3825,#3A2216)' } : {}}>
                <tab.Icon size={14} />
                {tab.label}
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs
                                   font-bold flex items-center justify-center"
                        style={{ background:'linear-gradient(135deg,#E57A06,#C46905)', fontSize:'10px' }}>
                    {pendingDrops}
                  </span>
                )}
                {hasRegBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════ OVERVIEW ══════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">

            {/* Registration closed alert */}
            {!regStatus.isOpen && (
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl
                              bg-red-50 border-2 border-red-200 animate-fade-in">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-red-500 shrink-0" />
                  <div>
                    <p className="font-body font-semibold text-red-700 text-sm">
                      Registration is currently paused
                    </p>
                    {regStatus.message && (
                      <p className="font-body text-xs text-red-500 mt-0.5 italic">
                        "{regStatus.message}"
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setActiveTab('registration')}
                  className="font-body text-xs text-red-600 font-semibold underline
                             underline-offset-2 hover:text-red-800 transition-colors shrink-0">
                  Manage
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? [...Array(4)].map((_,i) => <SkeletonCard key={i} />) : <>
                <StatCard label="Total Students"   value={stats.totalStudents}    Icon={Users} />
                <StatCard label="Active Teachers"  value={stats.teachers}          Icon={GraduationCap} />
                <StatCard label="Overall Rate"     value={`${stats.overallRate}%`} Icon={TrendingUp} accent />
                <StatCard label="Holiday Sessions" value={stats.holidaySessions}   Icon={CalendarDays} />
              </>}
            </div>

            {/* Class overview cards */}
            <div className="card">
              <h2 className="section-title mb-1 accent-line pl-4">Class Overview</h2>
              <p className="font-body text-xs text-brown-300 mb-5 pl-4">Students enrolled and attendance rates per class</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {classChartData.map(cls => (
                  <div key={cls.name}
                       className="flex flex-col gap-2 p-4 rounded-2xl border border-cream-100 bg-cream-50/50
                                  hover:border-orange-200 hover:bg-orange-50/30 transition-all duration-200">
                    <p className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider">{cls.name}</p>
                    <p className="font-display text-3xl font-bold text-gradient-dark">{cls.students}</p>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-semibold font-body w-fit
                      ${cls.rate>=75?'bg-emerald-100 text-emerald-700'
                      :cls.rate>=50?'bg-amber-100 text-amber-700'
                      :'bg-red-100 text-red-700'}`}>
                      {cls.rate}% att.
                    </div>
                    <p className="font-body text-xs text-brown-300">{cls.sessions} session{cls.sessions>1?'s':''}/wk</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly trend */}
            <div className="card">
              <h2 className="section-title mb-1 accent-line pl-4">Attendance Trend</h2>
              <p className="font-body text-xs text-brown-300 mb-5 pl-4">By semester week (all classes)</p>
              {weeklyChartData.length === 0 ? (
                <EmptyState icon={BarChart2} title="No data yet" description="Attendance records will appear here." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weeklyChartData} margin={{ top:0,right:0,bottom:0,left:-20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#A66A43' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#A66A43' }} domain={[0,100]} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v=>[`${v}%`,'Rate']} />
                    <Bar dataKey="rate" fill="#E57A06" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ STUDENTS ══════════════ */}
        {activeTab === 'students' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300" />
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search by name or phone…" className="input-field pl-10" />
              </div>
              <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className="input-field sm:w-44">
                <option value="">All Classes</option>
                {CLASSES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button onClick={exportStudents} className="btn-outline whitespace-nowrap">
                <Download size={15}/> Export CSV
              </button>
            </div>

            <p className="font-body text-xs text-brown-300 font-semibold">
              {filteredStudents.length} student{filteredStudents.length!==1?'s':''} found
            </p>

            <div className="card p-0 overflow-hidden">
              {loading ? <div>{[...Array(6)].map((_,i)=><SkeletonRow key={i}/>)}</div>
              : filteredStudents.length === 0 ? (
                <EmptyState icon={Users} title="No students found" description="Try adjusting your filters." />
              ) : (
                <div>
                  <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-cream-100"
                       style={{ background:'linear-gradient(160deg,#FDFAF7,#F2E9DE)' }}>
                    {['Student','Phone','Classes','Actions'].map(h=>(
                      <span key={h} className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider">{h}</span>
                    ))}
                  </div>
                  {filteredStudents.map((student, idx) => (
                    <AdminStudentRow key={student.id} student={student}
                      attendance={attendance.filter(r=>r.studentId===student.id)}
                      onView={()=>setSelectedStudent(student)}
                      onDirectDrop={(className)=>setDirectDropModal({ studentId:student.id, studentName:student.name, className, classes:student.classes })}
                      index={idx} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ ATTENDANCE ══════════════ */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className="input-field sm:w-44">
                <option value="">All Classes</option>
                {CLASSES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select value={semWkFilter} onChange={e=>setSemWkFilter(e.target.value)} className="input-field sm:w-44">
                <option value="all">All Weeks</option>
                {semWeeks.map(w=><option key={w} value={w}>Week {w}</option>)}
              </select>
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300" />
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search student…" className="input-field pl-10" />
              </div>
              <button onClick={exportAttendance} className="btn-outline whitespace-nowrap">
                <Download size={15}/> Export CSV
              </button>
            </div>

            <p className="font-body text-xs text-brown-300 font-semibold">
              {filteredAttendance.length} record{filteredAttendance.length!==1?'s':''} found
            </p>

            <div className="card p-0 overflow-hidden">
              {filteredAttendance.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No records" description="No attendance for this filter." />
              ) : (
                <div>
                <div>
                  {/* Desktop header */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-cream-100"
                       style={{ background:'linear-gradient(160deg,#FDFAF7,#F2E9DE)' }}>
                    {['Student','Class','Week','Session','Status'].map(h=>(
                      <span key={h} className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider">{h}</span>
                    ))}
                  </div>
                  {filteredAttendance.map((rec, idx) => (
                    <div key={rec.id}
                         className="border-b border-cream-50 hover:bg-cream-50/50
                                    transition-colors animate-fade-in"
                         style={{ animationDelay:`${idx*0.02}s` }}>

                      {/* Mobile */}
                      <div className="flex items-center gap-3 px-4 py-3.5 sm:hidden">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center
                                        text-cream-100 font-bold font-body text-xs shrink-0"
                             style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
                          {rec.studentName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-semibold text-brown-500 truncate">{rec.studentName}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <ClassBadge className={rec.className} small />
                            <span className="font-mono text-xs text-brown-300">Wk {rec.semesterWeek} · S{rec.sessionNumber}</span>
                          </div>
                        </div>
                        <AttendanceBadge present={rec.present} isHoliday={rec.isHoliday} size="sm" />
                      </div>

                      {/* Desktop */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-3.5 items-center">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center
                                          text-cream-100 font-bold font-body text-xs shrink-0"
                               style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
                            {rec.studentName?.charAt(0)}
                          </div>
                          <p className="font-body text-sm font-semibold text-brown-500 truncate">{rec.studentName}</p>
                        </div>
                        <ClassBadge className={rec.className} small />
                        <span className="font-mono text-xs text-brown-400">Wk {rec.semesterWeek}</span>
                        <span className="font-body text-xs text-brown-400">S{rec.sessionNumber}</span>
                        <AttendanceBadge present={rec.present} isHoliday={rec.isHoliday} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ ANALYTICS ══════════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Students per class */}
              <div className="card">
                <h3 className="section-title mb-1 accent-line pl-4">Students per Class</h3>
                <p className="font-body text-xs text-brown-300 mb-5 pl-4">Enrollment breakdown</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={classChartData} layout="vertical" margin={{ left:16,right:16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" horizontal={false} />
                    <XAxis type="number" tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#A66A43' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={80}
                      tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#5A3825' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="students" radius={[0,8,8,0]}>
                      {classChartData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie */}
              <div className="card">
                <h3 className="section-title mb-1 accent-line pl-4">Enrollment Distribution</h3>
                <p className="font-body text-xs text-brown-300 mb-5 pl-4">Share per class</p>
                {classChartData.filter(c=>c.students>0).length === 0 ? (
                  <EmptyState icon={BarChart2} title="No data" description="Register students to see distribution." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={classChartData.filter(c=>c.students>0)}
                        cx="50%" cy="50%" innerRadius={55} outerRadius={88}
                        dataKey="students" nameKey="name" paddingAngle={3}>
                        {classChartData.filter(c=>c.students>0).map((_,i)=>(
                          <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="circle" iconSize={9}
                        formatter={v=><span style={{ fontFamily:'Plus Jakarta Sans',fontSize:12,color:'#5A3825' }}>{v}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Attendance rate per class */}
            <div className="card">
              <h3 className="section-title mb-1 accent-line pl-4">Attendance Rate by Class</h3>
              <p className="font-body text-xs text-brown-300 mb-5 pl-4">Holidays excluded from calculation</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={classChartData} margin={{ top:0,right:0,bottom:0,left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#A66A43' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#A66A43' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v=>[`${v}%`,'Rate']} />
                  <Bar dataKey="rate" radius={[8,8,0,0]}>
                    {classChartData.map((e,i)=>(
                      <Cell key={i} fill={e.rate>=75?'#10b981':e.rate>=50?'#E57A06':'#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Trend */}
            <div className="card">
              <h3 className="section-title mb-1 accent-line pl-4">Weekly Trend</h3>
              <p className="font-body text-xs text-brown-300 mb-5 pl-4">Semester weeks (all classes combined)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyChartData} margin={{ top:0,right:0,bottom:0,left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#A66A43' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{ fontFamily:'Plus Jakarta Sans',fontSize:11,fill:'#A66A43' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v=>[`${v}%`,'Rate']} />
                  <Bar dataKey="rate" fill="#5A3825" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══════════════ CLASS CONFIG ══════════════ */}
        {activeTab === 'config' && (
          <div className="animate-fade-in">
            <ClassConfigPanel />
          </div>
        )}

        {/* ══════════════ DROP REQUESTS ══════════════ */}
        {activeTab === 'drops' && (
          <div className="animate-fade-in">
            <DropRequestsPanel students={students} />
          </div>
        )}

        {/* ══════════════ TEACHERS ══════════════ */}
        {activeTab === 'teachers' && (
          <div className="space-y-6 animate-fade-in">
            <Alert type="info"
              message="Teacher accounts are created via Firebase Authentication + a Firestore user profile document." />
            <div className="grid sm:grid-cols-2 gap-4">
              {users.filter(u=>u.role==='teacher').length === 0 ? (
                <div className="sm:col-span-2">
                  <EmptyState icon={GraduationCap} title="No teachers yet"
                    description="Create teacher accounts via Firebase Authentication." />
                </div>
              ) : users.filter(u=>u.role==='teacher').map((u,idx)=>(
                <div key={u.id}
                     className="card flex items-center gap-4 animate-fade-in"
                     style={{ animationDelay:`${idx*0.05}s` }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center
                                  font-bold font-display text-lg text-white shrink-0"
                       style={{ background:'linear-gradient(135deg,#E57A06,#C46905)' }}>
                    {u.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-brown-500">{u.name}</p>
                    <p className="font-body text-xs text-brown-300 truncate">{u.email}</p>
                  </div>
                  {u.assignedClass && <ClassBadge className={u.assignedClass} small />}
                </div>
              ))}
            </div>

            {users.filter(u=>u.role==='admin').length > 0 && (
              <div>
                <h3 className="section-title mb-3">Administrators</h3>
                <div className="card p-0 overflow-hidden">
                  {users.filter(u=>u.role==='admin').map((u,idx)=>(
                    <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-cream-50 last:border-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center
                                      font-bold font-body text-sm text-white shrink-0"
                           style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
                        {u.name?.charAt(0)||'?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-semibold text-brown-500 text-sm">{u.name}</p>
                        <p className="font-body text-xs text-brown-300 truncate">{u.email}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold font-body text-white"
                            style={{ background:'linear-gradient(135deg,#E57A06,#C46905)' }}>
                        Admin
                      </span>
                      {u.assignedClass && <ClassBadge className={u.assignedClass} small />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ ARCHIVE ══════════════ */}
        {activeTab === 'archive' && (
          <div className="animate-fade-in">
            <SemesterArchivePanel />
          </div>
        )}

        {/* ══════════════ REGISTRATION CONTROL ══════════════ */}
        {activeTab === 'registration' && (
          <div className="animate-fade-in space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={18} className="text-orange-400" />
              <h3 className="font-display text-xl font-semibold text-brown-500">
                Registration Control
              </h3>
            </div>
            <RegistrationControlPanel />
          </div>
        )}

      </div>

      {/* ── Student detail modal ── */}
      <Modal open={!!selectedStudent} onClose={()=>setSelectedStudent(null)}
             title={selectedStudent?.name} width="max-w-2xl">
        {selectedStudent && (
          <StudentDetailModal student={selectedStudent} records={studentDetail}
            onDirectDrop={(className)=>{
              setDirectDropModal({ studentId:selectedStudent.id, studentName:selectedStudent.name, className, classes:selectedStudent.classes });
              setSelectedStudent(null);
            }} />
        )}
      </Modal>

      {/* ── Direct drop modal ── */}
      <Modal open={!!directDropModal} onClose={()=>setDirectDropModal(null)} title="Remove from Class">
        {directDropModal && (
          <div className="space-y-4">
            <Alert type="error"
              message={`This will immediately remove ${directDropModal.studentName} from ${CLASS_LABELS[directDropModal.className] || directDropModal.className}. Past attendance records are preserved.`} />
            <div className="flex gap-3">
              <button onClick={()=>setDirectDropModal(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleDirectDrop} className="btn-danger flex-1">
                <UserMinus size={14}/> Remove Student
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Admin student row ──
// Mobile: card layout (stacked). Desktop (sm+): single row grid.
function AdminStudentRow({ student, attendance, onView, onDirectDrop, index }) {
  return (
    <div className="border-b border-cream-50 hover:bg-cream-50/50
                    transition-colors duration-150 animate-fade-in"
         style={{ animationDelay:`${index*0.025}s` }}>

      {/* ── Mobile layout (< sm) ── */}
      <div className="flex items-start gap-3 px-4 py-4 sm:hidden">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center
                        text-cream-100 font-bold font-body text-sm shrink-0 mt-0.5"
             style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
          {student.name.charAt(0)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + gender */}
          <p className="font-body font-semibold text-brown-500 text-sm leading-snug">
            {student.name}
          </p>
          {student.gender && (
            <p className="font-body text-xs text-brown-300 mb-1.5">{student.gender}</p>
          )}

          {/* Phone */}
          <p className="font-body text-xs text-brown-300 mb-2">{student.phone}</p>

          {/* Class badges — wrap naturally */}
          <div className="flex flex-wrap gap-1.5">
            {(student.classes||[]).map(c => <ClassBadge key={c} className={c} small />)}
          </div>
        </div>

        {/* Actions — stacked vertically on mobile */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button onClick={onView}
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       bg-cream-100 text-brown-400 hover:bg-brown-100 hover:text-brown-600
                       transition-colors">
            <Eye size={14}/>
          </button>
          {(student.classes||[]).map(cls => (
            <button key={cls} onClick={() => onDirectDrop(cls)}
              title={`Remove from ${CLASS_LABELS[cls]||cls}`}
              className="w-8 h-8 rounded-xl flex items-center justify-center
                         bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600
                         transition-colors">
              <UserMinus size={13}/>
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop layout (sm+) ── */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center">
        {/* Name + avatar */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center
                          text-cream-100 font-bold font-body text-sm shrink-0"
               style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
            {student.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-body font-semibold text-brown-500 text-sm truncate">{student.name}</p>
            {student.gender && <p className="font-body text-xs text-brown-300">{student.gender}</p>}
          </div>
        </div>

        {/* Phone */}
        <p className="font-body text-sm text-brown-300 whitespace-nowrap">{student.phone}</p>

        {/* Classes */}
        <div className="flex gap-1 flex-wrap justify-end">
          {(student.classes||[]).map(c => <ClassBadge key={c} className={c} small />)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={onView}
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       bg-cream-100 text-brown-400 hover:bg-brown-100 hover:text-brown-600
                       transition-colors">
            <Eye size={14}/>
          </button>
          {(student.classes||[]).map(cls => (
            <button key={cls} onClick={() => onDirectDrop(cls)}
              title={`Remove from ${CLASS_LABELS[cls]||cls}`}
              className="w-8 h-8 rounded-xl flex items-center justify-center
                         bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600
                         transition-colors">
              <UserMinus size={13}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Student detail modal ──
function StudentDetailModal({ student, records, onDirectDrop }) {
  const present  = records.filter(r => r.present === true && !r.isHoliday).length;
  const countable = records.filter(r => r.present !== null && !r.isHoliday).length;
  const pct      = countable ? Math.round((present / countable) * 100) : 0;
  const holidays = records.filter(r => r.isHoliday).length;

  return (
    <div className="space-y-5">
      {/* Bio */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center
                        text-cream-100 font-display font-bold text-2xl shrink-0"
             style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
          {student.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1">
            {(student.classes||[]).map(c=><ClassBadge key={c} className={c} small />)}
          </div>
          <p className="font-body text-sm text-brown-400">Phone: {student.phone}</p>
          {student.gender && <p className="font-body text-xs text-brown-300">Gender: {student.gender}</p>}
        </div>
        <PercentageRing value={pct} size={72} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label:'Present',  val:present,           cls:'bg-emerald-50 border-emerald-100 text-emerald-700' },
          { label:'Absent',   val:countable-present,  cls:'bg-red-50 border-red-100 text-red-700' },
          { label:'Holiday',  val:holidays,           cls:'bg-violet-50 border-violet-100 text-violet-700' },
          { label:'Total',    val:records.length,     cls:'bg-cream-100 border-cream-200 text-brown-500' },
        ].map(s=>(
          <div key={s.label} className={`text-center p-3 rounded-2xl border ${s.cls}`}>
            <p className="font-display text-2xl font-bold">{s.val}</p>
            <p className="font-body text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Admin drop buttons */}
      {(student.classes||[]).length > 0 && (
        <div>
          <p className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider mb-2">Admin Actions</p>
          <div className="flex gap-2 flex-wrap">
            {(student.classes||[]).map(cls=>(
              <button key={cls} onClick={()=>onDirectDrop(cls)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200
                           text-red-600 text-xs font-semibold font-body hover:bg-red-50 transition-colors">
                <UserMinus size={12}/> Remove from {CLASS_LABELS[cls]||cls}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <p className="font-body text-xs font-bold text-brown-400 uppercase tracking-wider mb-2">Attendance History</p>
        {records.length === 0 ? (
          <p className="font-body text-sm text-brown-300 text-center py-4">No records yet.</p>
        ) : (
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {records.map(r=>(
              <div key={r.id} className="flex items-center justify-between p-3
                                         rounded-xl border border-cream-100 bg-cream-50/50">
                <div>
                  <p className="font-body text-xs font-semibold text-brown-500">
                    Wk {r.semesterWeek} · Session {r.sessionNumber}
                  </p>
                  <p className="font-body text-xs text-brown-300">
                    {r.date ? new Date(r.date).toLocaleDateString('en-NG',{weekday:'short',month:'short',day:'numeric'}) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ClassBadge className={r.className} small />
                  <AttendanceBadge present={r.present} isHoliday={r.isHoliday} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

