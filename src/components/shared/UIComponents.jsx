// src/components/shared/UIComponents.jsx
import {
  Loader2, AlertCircle, CheckCircle2, Info, X,
  Check, Minus, TrendingUp, TrendingDown,
} from 'lucide-react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return <Loader2 className={`animate-spin text-orange-400 ${sizes[size]} ${className}`} />;
}

export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-orange-gradient flex items-center justify-center shadow-[0_4px_16px_rgba(229,122,6,0.35)]">
          <Spinner size="sm" className="text-white" />
        </div>
      </div>
      <p className="font-body text-sm text-brown-300">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: IconProp, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {IconProp && (
        <div className="w-16 h-16 rounded-3xl bg-cream-100 border-2 border-cream-200
                        flex items-center justify-center mb-5 shadow-inner-warm">
          {typeof IconProp === 'string'
            ? <span className="text-brown-300 font-display text-xl">{IconProp}</span>
            : <IconProp size={26} className="text-brown-300" strokeWidth={1.5} />
          }
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-brown-500 mb-2">{title}</h3>
      {description && (
        <p className="font-body text-sm text-brown-300 max-w-xs leading-relaxed mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}

export function Alert({ type = 'info', message, className = '' }) {
  const variants = {
    info:    { wrap: 'bg-blue-50/80   border-blue-200',   icon: <Info         size={15} className="text-blue-500 shrink-0"    />, text: 'text-blue-700'   },
    success: { wrap: 'bg-emerald-50/80 border-emerald-200',icon: <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />, text: 'text-emerald-700' },
    error:   { wrap: 'bg-red-50/80    border-red-200',    icon: <AlertCircle  size={15} className="text-red-500 shrink-0"     />, text: 'text-red-700'    },
    warning: { wrap: 'bg-amber-50/80  border-amber-200',  icon: <AlertCircle  size={15} className="text-amber-600 shrink-0"   />, text: 'text-amber-700'  },
  };
  const v = variants[type] || variants.info;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${v.wrap} ${className}`}>
      <span className="mt-0.5">{v.icon}</span>
      <p className={`font-body text-sm leading-relaxed ${v.text}`}>{message}</p>
    </div>
  );
}

export function ClassBadge({ className: cls, small = false }) {
  const colorMap = {
    'computer':   'bg-blue-100   text-blue-800   border-blue-200',
    'make-up':    'bg-pink-100   text-pink-800   border-pink-200',
    'wig-making': 'bg-purple-100 text-purple-800 border-purple-200',
    'barbing':    'bg-green-100  text-green-800  border-green-200',
    'baking':     'bg-yellow-100 text-yellow-800 border-yellow-200',
    'resin-art':  'bg-orange-100 text-orange-800 border-orange-200',
    'nail-tech':  'bg-rose-100   text-rose-800   border-rose-200',
    'tailoring':  'bg-teal-100   text-teal-800   border-teal-200',
  };
  const dotMap = {
    'computer':   'bg-blue-500',   'make-up':    'bg-pink-500',
    'wig-making': 'bg-purple-500', 'barbing':    'bg-green-500',
    'baking':     'bg-yellow-500', 'resin-art':  'bg-orange-500',
    'nail-tech':  'bg-rose-500',   'tailoring':  'bg-teal-500',
  };
  const labelMap = {
    'computer':   'Computer',   'make-up':    'Make-up',
    'wig-making': 'Wig Making', 'barbing':    'Barbing',
    'baking':     'Baking',     'resin-art':  'Resin Art',
    'nail-tech':  'Nail Tech',  'tailoring':  'Tailoring',
  };
  const colors = colorMap[cls] || 'bg-gray-100 text-gray-700 border-gray-200';
  const dot    = dotMap[cls]   || 'bg-gray-400';
  const label  = labelMap[cls] || cls;
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-body font-semibold
      ${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'} ${colors}`}>
      <span className={`inline-block rounded-full shrink-0 ${dot} ${small ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
      {label}
    </span>
  );
}

export function AttendanceBadge({ present, size = 'sm', isHoliday = false }) {
  const base = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  if (isHoliday) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-body font-semibold status-holiday ${base}`}>
        Holiday
      </span>
    );
  }
  if (present === null || present === undefined) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-body font-semibold status-unmarked ${base}`}>
        <Minus size={11} /> Unmarked
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-body font-semibold
      ${present ? 'status-present' : 'status-absent'} ${base}`}>
      {present ? <><Check size={11} /> Present</> : <><X size={11} /> Absent</>}
    </span>
  );
}

export function StatCard({ label, value, sub, Icon, accent = false, trend }) {
  return (
    <div className={accent ? 'card-dark' : 'card'}>
      <div className="flex items-start justify-between mb-3">
        <p className={`font-body text-xs font-semibold uppercase tracking-wider
          ${accent ? 'text-brown-300' : 'text-brown-300'}`}>{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0
            ${accent ? 'bg-white/10' : 'bg-orange-50 border border-orange-100'}`}>
            <Icon size={17} className={accent ? 'text-orange-300' : 'text-orange-400'} />
          </div>
        )}
      </div>
      <p className={`font-display text-4xl font-bold tracking-tight
        ${accent ? 'text-cream-100' : 'text-gradient-dark'}`}>{value}</p>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold
              ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
          {sub && <p className={`font-body text-xs ${accent ? 'text-brown-300' : 'text-brown-300'}`}>{sub}</p>}
        </div>
      )}
    </div>
  );
}

export function PercentageRing({ value, size = 64 }) {
  const radius      = (size - 8) / 2;
  const circ        = 2 * Math.PI * radius;
  const offset      = circ - (value / 100) * circ;
  const color       = value >= 75 ? '#10b981' : value >= 50 ? '#E57A06' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E8D5C0" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px`,
          fontSize: size < 56 ? 11 : 13, fontWeight: 700, fill: color, fontFamily:'Plus Jakarta Sans' }}>
        {value}%
      </text>
    </svg>
  );
}

export function SessionPill({ sessionNumber, status }) {
  // status: 'done' | 'active' | 'pending' | 'holiday'
  const classes = {
    done:    'session-pill session-pill-done',
    active:  'session-pill session-pill-active',
    pending: 'session-pill session-pill-pending',
    holiday: 'session-pill session-pill-holiday',
  };
  const labels = {
    done:    <><Check size={11} /> Session {sessionNumber}</>,
    active:  <>Session {sessionNumber} — Now</>,
    pending: <>Session {sessionNumber}</>,
    holiday: <>Session {sessionNumber} — Holiday</>,
  };
  return <span className={classes[status] || classes.pending}>{labels[status] || labels.pending}</span>;
}

export function SemesterProgressBar({ currentWeek, totalWeeks = 12 }) {
  const pct = Math.round((currentWeek / totalWeeks) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-body text-xs font-semibold text-brown-400 uppercase tracking-wider">
          Semester Progress
        </span>
        <span className="font-mono text-xs text-brown-400">
          Week {currentWeek} / {totalWeeks}
        </span>
      </div>
      <div className="h-2.5 bg-cream-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #E57A06, #C46905)',
          }}
        />
      </div>
      <p className="font-body text-xs text-brown-300 mt-1">{pct}% complete</p>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brown-900/60 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white rounded-3xl shadow-warm-xl
                       animate-scale-in overflow-hidden border border-cream-200`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-cream-100">
            <h2 className="font-display text-xl font-semibold text-brown-500">{title}</h2>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl
                         text-brown-300 hover:text-brown-500 hover:bg-cream-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function DropRequestBadge({ status }) {
  const map = {
    pending:  'bg-amber-100  text-amber-700  border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100   text-red-700   border-red-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-body border capitalize ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-cream-100/80">
      <div className="skeleton w-10 h-10 rounded-full" style={{ height: '40px' }} />
      <div className="flex-1 space-y-2">
        <div className="skeleton rounded" style={{ height: '12px', width: '35%' }} />
        <div className="skeleton rounded" style={{ height: '12px', width: '55%' }} />
      </div>
      <div className="skeleton rounded-full" style={{ height: '24px', width: '72px' }} />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="skeleton rounded" style={{ height: '14px', width: '30%' }} />
      <div className="skeleton rounded" style={{ height: '36px', width: '50%' }} />
      <div className="skeleton rounded" style={{ height: '12px', width: '70%' }} />
    </div>
  );
}
