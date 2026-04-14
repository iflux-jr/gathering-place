// src/pages/LoginPage.jsx — v2: updated design system
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Users, BarChart2, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginUser, getUserProfile } from '../firebase/users';
import useAuthStore from '../store/authStore';
import { Spinner } from '../components/shared/UIComponents';

const BG_IMAGE = 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80&auto=format&fit=crop';

export default function LoginPage() {
  const navigate       = useNavigate();
  const { user }       = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  if (user) {
    const profile = useAuthStore.getState().profile;
    navigate(profile?.role === 'admin' ? '/admin' : '/teacher', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const firebaseUser = await loginUser(email, password);
      const profile      = await getUserProfile(firebaseUser.uid);
      toast.success(`Welcome back, ${profile?.name || 'User'}!`);
      navigate(profile?.role === 'admin' ? '/admin' : '/teacher', { replace: true });
    } catch (err) {
      const map = {
        'auth/user-not-found':     'No account found with this email.',
        'auth/wrong-password':     'Incorrect password.',
        'auth/invalid-email':      'Please enter a valid email address.',
        'auth/too-many-requests':  'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
      };
      setError(map[err.code] || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor:'#F2E9DE' }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between">
        <img src={BG_IMAGE} alt="Classroom" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0"
             style={{ background:'linear-gradient(160deg, rgba(26,14,9,0.85) 0%, rgba(58,34,22,0.7) 50%, rgba(90,56,37,0.5) 100%)' }} />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center
                            shadow-[0_4px_16px_rgba(229,122,6,0.5)]"
                 style={{ background:'linear-gradient(135deg,#E57A06,#C46905)' }}>
              <span className="font-display text-2xl text-white font-bold" style={{ fontFamily:'Fraunces,serif' }}>G</span>
            </div>
            <div>
              <p className="font-display text-lg text-white font-semibold leading-tight"
                 style={{ fontFamily:'Fraunces,serif' }}>The Gathering Place</p>
              <p className="font-body text-white/50 text-xs">Attendance System</p>
            </div>
          </div>

          {/* Hero */}
          <div>
            <h1 className="font-display text-5xl text-white font-bold leading-[1.1] mb-5"
                style={{ fontFamily:'Fraunces,serif' }}>
              Track every<br/>
              <span style={{ color:'#E57A06' }}>moment</span><br/>
              that matters.
            </h1>
            
            <div className="flex flex-col gap-3">
              {[
                { Icon:Wifi,     text:'Live real-time updates' },
                { Icon:BarChart2,text:'Session & semester analytics' },
                { Icon:Users,    text:'8-class management system' },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                       style={{ background:'rgba(229,122,6,0.2)', border:'1px solid rgba(229,122,6,0.3)' }}>
                    <Icon size={15} style={{ color:'#E57A06' }} />
                  </div>
                  <span className="font-body text-sm text-white/75">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-8"
               style={{ borderTop:'1px solid rgba(255,255,255,0.12)' }}>
            {[{ num:'8', label:'Classes' },{ num:'50+', label:'Students' },{ num:'100%', label:'Real-time' }].map(s=>(
              <div key={s.label}>
                <p className="font-display text-2xl font-bold" style={{ color:'#E57A06', fontFamily:'Fraunces,serif' }}>{s.num}</p>
                <p className="font-body text-white/40 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background:'linear-gradient(135deg,#5A3825,#3A2216)' }}>
              <span className="font-display text-xl text-orange-400 font-bold" style={{ fontFamily:'Fraunces,serif' }}>G</span>
            </div>
            <div>
              <p className="font-display text-lg text-brown-500 font-semibold" style={{ fontFamily:'Fraunces,serif' }}>
                The Gathering Place
              </p>
              <p className="font-body text-brown-300 text-xs">Attendance System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-brown-500 mb-1"
                style={{ fontFamily:'Fraunces,serif' }}>Welcome back</h2>
            <p className="font-body text-brown-300 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <p className="font-body text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="input-label" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300" />
                <input id="email" type="email" autoComplete="email"
                  value={email} onChange={e=>{ setEmail(e.target.value); setError(''); }}
                  placeholder="teacher@example.com"
                  className="input-field pl-10" disabled={loading} />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300" />
                <input id="password" type={showPwd?'text':'password'} autoComplete="current-password"
                  value={password} onChange={e=>{ setPassword(e.target.value); setError(''); }}
                  placeholder="Your password"
                  className="input-field pl-10 pr-10" disabled={loading} />
                <button type="button" onClick={()=>setShowPwd(v=>!v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brown-300
                             hover:text-brown-500 transition-colors">
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading
                ? <><Spinner size="sm" className="text-white"/> Signing in…</>
                : 'Sign in'}
            </button>
          </form>

          <p className="font-body text-xs text-brown-300 text-center mt-8">
            Contact your administrator if you don't have an account.
          </p>
        </div>
      </div>
    </div>
  );
}
