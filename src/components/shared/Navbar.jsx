// src/components/shared/Navbar.jsx
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ChevronDown, ShieldCheck, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { logoutUser } from '../../firebase/users';
import { CLASS_LABELS } from '../../utils/constants';

export default function Navbar({ pendingDrops = 0 }) {
  const { profile }             = useAuthStore();
  const navigate                = useNavigate();
  const location                = useLocation();
  const [open,     setOpen]     = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const isAdmin        = profile?.role === 'admin';
  const hasClass       = !!profile?.assignedClass;
  const isAdminTeacher = isAdmin && hasClass;
  const classLabel     = CLASS_LABELS[profile?.assignedClass] || profile?.assignedClass || '';

  async function handleLogout() {
    try { await logoutUser(); toast.success('Signed out'); navigate('/login'); }
    catch { toast.error('Failed to sign out'); }
  }

  const initials = (profile?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-40 border-b border-brown-400/30"
         style={{ background: 'linear-gradient(160deg, #5A3825 0%, #3A2216 100%)' }}>
      {/* subtle grain */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
           style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center
                            shadow-[0_2px_8px_rgba(229,122,6,0.4)]
                            group-hover:shadow-[0_4px_16px_rgba(229,122,6,0.5)]
                            transition-shadow duration-300"
                 style={{ background: 'linear-gradient(135deg, #E57A06, #C46905)' }}>
              <span className="font-display text-lg text-white font-bold" style={{ fontFamily:'Fraunces,serif' }}>G</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-sm font-semibold text-cream-100 leading-tight"
                 style={{ fontFamily:'Fraunces,serif' }}>The Gathering Place</p>
              <p className="font-body text-xs text-brown-300 leading-tight">Attendance System</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAdmin    && <NavLink to="/admin"   active={location.pathname === '/admin'}>Dashboard</NavLink>}
            {(isAdminTeacher || !isAdmin) &&
              <NavLink to="/teacher" active={location.pathname === '/teacher'}>
                {isAdminTeacher ? `${classLabel} Class` : 'My Class'}
              </NavLink>}
            <NavLink to="/register" active={location.pathname === '/register'}>Register</NavLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Pending drops badge — admin only */}
            {isAdmin && pendingDrops > 0 && (
              <Link to="/admin" className="relative p-2 rounded-xl text-cream-200 hover:bg-white/10 transition-colors">
                <Bell size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs
                                 font-bold font-body flex items-center justify-center text-white"
                      style={{ background: 'linear-gradient(135deg,#E57A06,#C46905)', fontSize: '10px' }}>
                  {pendingDrops}
                </span>
              </Link>
            )}

            {/* Role chips */}
            <div className="hidden sm:flex items-center gap-1.5">
              {isAdminTeacher ? (
                <>
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                                   font-semibold font-body text-white"
                        style={{ background:'linear-gradient(135deg,#E57A06,#C46905)' }}>
                    <ShieldCheck size={11} /> Admin
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold font-body
                                   bg-white/10 text-cream-200 border border-white/10">
                    {classLabel}
                  </span>
                </>
              ) : (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-body
                  ${isAdmin
                    ? 'text-white'
                    : 'bg-white/10 text-cream-200 border border-white/10'}`}
                  style={isAdmin ? { background:'linear-gradient(135deg,#E57A06,#C46905)' } : {}}>
                  {isAdmin ? 'Admin' : `${classLabel || 'Teacher'}`}
                </span>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setUserMenu(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl
                           hover:bg-white/10 transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center
                                text-xs font-bold font-body text-white shrink-0"
                     style={{ background:'linear-gradient(135deg,#E57A06,#C46905)' }}>
                  {initials}
                </div>
                <span className="hidden sm:block font-body text-sm text-cream-200 max-w-[100px] truncate">
                  {profile?.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown size={13} className={`text-brown-300 transition-transform duration-200
                  ${userMenu ? 'rotate-180' : ''}`} />
              </button>

              {userMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-warm-xl
                                border border-cream-200 overflow-hidden animate-scale-in">
                  {/* User info header */}
                  <div className="px-4 py-4 border-b border-cream-100"
                       style={{ background:'linear-gradient(160deg,#F7F0EB,#F2E9DE)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center
                                      font-bold font-body text-sm text-white shrink-0"
                           style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body font-semibold text-brown-500 text-sm truncate">{profile?.name}</p>
                        <p className="font-body text-brown-300 text-xs truncate">{profile?.email}</p>
                        {isAdminTeacher && (
                          <p className="font-body text-xs text-orange-500 flex items-center gap-1 mt-0.5">
                            <ShieldCheck size={10} /> Admin + {classLabel} Teacher
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 font-body text-sm
                               text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden p-2 text-cream-200 hover:bg-white/10 rounded-xl transition-colors"
              onClick={() => setOpen(v => !v)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1 animate-slide-up">
            {isAdmin    && <MobileNavLink to="/admin"   onClick={() => setOpen(false)}>Dashboard</MobileNavLink>}
            {(isAdminTeacher || !isAdmin) &&
              <MobileNavLink to="/teacher" onClick={() => setOpen(false)}>
                {isAdminTeacher ? `${classLabel} Class` : 'My Class'}
              </MobileNavLink>}
            <MobileNavLink to="/register" onClick={() => setOpen(false)}>Register Student</MobileNavLink>
            <button onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 font-body text-sm text-red-400
                         hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>

      {userMenu && <div className="fixed inset-0 z-[-1]" onClick={() => setUserMenu(false)} />}
    </nav>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link to={to}
      className={`px-4 py-2 rounded-xl font-body text-sm font-medium transition-all duration-200
        ${active
          ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
          : 'text-cream-200 hover:bg-white/10 hover:text-white'}`}>
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children, onClick }) {
  return (
    <Link to={to} onClick={onClick}
      className="block px-4 py-2.5 font-body text-sm text-cream-200
                 hover:bg-white/10 rounded-xl transition-colors font-medium">
      {children}
    </Link>
  );
}
