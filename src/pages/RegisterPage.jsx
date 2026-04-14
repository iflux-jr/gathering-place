// src/pages/RegisterPage.jsx — v2: 8 classes, new design
import { useState } from 'react';
import { User, Phone, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Navbar from '../components/shared/Navbar';
import { ClassBadge, Spinner, Modal, Alert } from '../components/shared/UIComponents';
import { registerStudent, phoneExists } from '../firebase/students';
import { CLASSES, GENDERS, MAX_CLASSES_PER_STUDENT } from '../utils/constants';

const INITIAL = { name:'', phone:'', gender:'', classes:[] };

export default function RegisterPage() {
  const [form,    setForm]    = useState(INITIAL);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [qrModal, setQrModal] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name  = 'Full name is required.';
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    else if (!/^\+?[\d\s\-]{7,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number.';
    if (form.classes.length === 0)                  e.classes = 'Select at least one class.';
    if (form.classes.length > MAX_CLASSES_PER_STUDENT) e.classes = `Maximum ${MAX_CLASSES_PER_STUDENT} classes.`;
    return e;
  }

  function toggleClass(classId) {
    setErrors(e => ({ ...e, classes: undefined }));
    setForm(f => {
      if (f.classes.includes(classId)) return { ...f, classes: f.classes.filter(c=>c!==classId) };
      if (f.classes.length >= MAX_CLASSES_PER_STUDENT) { toast.error(`Max ${MAX_CLASSES_PER_STUDENT} classes`); return f; }
      return { ...f, classes: [...f.classes, classId] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      if (await phoneExists(form.phone.trim())) {
        setErrors({ phone:'A student with this number is already registered.' });
        setLoading(false);
        return;
      }
      const id = await registerStudent({ name:form.name.trim(), phone:form.phone.trim(), gender:form.gender||null, classes:form.classes });
      setSuccess({ id, name:form.name.trim() });
      setForm(INITIAL);
      toast.success('Student registered!');
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrapper min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 rounded-full" style={{ background:'linear-gradient(180deg,#E57A06,#C46905)' }} />
            <h1 className="font-display text-3xl font-bold text-brown-500">Register Student</h1>
          </div>
          <p className="font-body text-sm text-brown-300 pl-4">
            Add a new student. Maximum {MAX_CLASSES_PER_STUDENT} classes per student.
          </p>
        </div>

        {/* Success */}
        {success ? (
          <div className="card border-2 border-emerald-200 animate-scale-in text-center">
            <div className="py-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200
                              flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-brown-500">Student Registered!</h3>
                <p className="font-body text-sm text-brown-300 mt-1">
                  <strong className="text-brown-500">{success.name}</strong> has been added to the system.
                </p>
                <p className="font-mono text-xs text-brown-300 mt-2 bg-cream-100 px-3 py-1.5 rounded-xl inline-block">
                  ID: {success.id}
                </p>
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                <button onClick={() => setQrModal(true)} className="btn-outline flex-1">
                  <QrCode size={15}/> QR Code
                </button>
                <button onClick={() => setSuccess(null)} className="btn-primary flex-1">
                  Register Another
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form */
          <div className="card animate-slide-up">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Name */}
              <div>
                <label className="input-label" htmlFor="name">Full Name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300" />
                  <input id="name" type="text" value={form.name}
                    onChange={e=>{ setForm(f=>({...f,name:e.target.value})); setErrors(er=>({...er,name:undefined})); }}
                    placeholder="e.g. Amara Okafor"
                    className={`input-field pl-10 ${errors.name?'border-red-400':''}`}
                    disabled={loading} />
                </div>
                {errors.name && <p className="input-error"><AlertCircle size={11}/>{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="input-label" htmlFor="phone">Phone Number *</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300" />
                  <input id="phone" type="tel" value={form.phone}
                    onChange={e=>{ setForm(f=>({...f,phone:e.target.value})); setErrors(er=>({...er,phone:undefined})); }}
                    placeholder="e.g. 08012345678"
                    className={`input-field pl-10 ${errors.phone?'border-red-400':''}`}
                    disabled={loading} />
                </div>
                {errors.phone && <p className="input-error"><AlertCircle size={11}/>{errors.phone}</p>}
              </div>

              {/* Gender */}
              <div>
                <label className="input-label" htmlFor="gender">
                  Gender <span className="text-brown-300 font-normal">(optional)</span>
                </label>
                <select id="gender" value={form.gender}
                  onChange={e=>setForm(f=>({...f,gender:e.target.value}))}
                  className="input-field" disabled={loading}>
                  <option value="">Prefer not to say</option>
                  {GENDERS.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Classes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="input-label mb-0">Class Selection *</label>
                  <span className={`font-body text-xs font-semibold px-2.5 py-1 rounded-full
                    ${form.classes.length===MAX_CLASSES_PER_STUDENT
                      ?'bg-orange-100 text-orange-700 border border-orange-200'
                      :'bg-cream-100 text-brown-400 border border-cream-200'}`}>
                    {form.classes.length}/{MAX_CLASSES_PER_STUDENT} selected
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CLASSES.map(cls => {
                    const selected = form.classes.includes(cls.id);
                    const maxed    = !selected && form.classes.length >= MAX_CLASSES_PER_STUDENT;
                    return (
                      <button key={cls.id} type="button"
                        onClick={() => toggleClass(cls.id)}
                        disabled={loading || maxed}
                        className={`relative flex items-center gap-2.5 p-3 rounded-2xl border-2
                          font-body text-sm font-semibold transition-all duration-200 text-left
                          ${selected
                            ?'border-orange-400 shadow-[0_2px_12px_rgba(229,122,6,0.25)]'
                            :maxed
                              ?'border-cream-200 bg-cream-100 text-brown-300 opacity-50 cursor-not-allowed'
                              :'border-cream-200 bg-white text-brown-500 hover:border-orange-300 hover:bg-orange-50/50'}`}
                        style={selected?{ background:'linear-gradient(160deg,#FEF4E6,#FDE4BC)' }:{}}>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cls.dot}`} />
                        <span className="leading-tight">{cls.label}</span>
                        {selected && (
                          <CheckCircle2 size={13} className="absolute top-2 right-2 text-orange-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.classes && <p className="input-error mt-2"><AlertCircle size={11}/>{errors.classes}</p>}
              </div>

              {/* Selected preview */}
              {form.classes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap p-3 bg-cream-50 rounded-2xl border border-cream-100">
                  <span className="font-body text-xs text-brown-400 font-semibold">Selected:</span>
                  {form.classes.map(c=><ClassBadge key={c} className={c}/>)}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading
                  ? <><Spinner size="sm" className="text-white"/> Registering…</>
                  : 'Register Student'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {success && (
        <Modal open={qrModal} onClose={()=>setQrModal(false)} title="Student QR Code">
          <div className="flex flex-col items-center gap-4">
            <p className="font-body text-sm text-brown-400 text-center">
              Scan to check in <strong className="text-brown-500">{success.name}</strong>
            </p>
            <div className="p-5 bg-white border-2 border-cream-200 rounded-3xl shadow-warm">
              <QRCodeSVG value={`gathering-place://student/${success.id}`}
                size={192} fgColor="#5A3825" bgColor="#FFFFFF" level="M" />
            </div>
            <p className="font-mono text-xs text-brown-300 bg-cream-100 px-3 py-1.5 rounded-xl">
              ID: {success.id}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
