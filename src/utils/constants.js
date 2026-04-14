// src/utils/constants.js
// Application-wide constants — updated with 8 classes + new features

export const CLASSES = [
  { id: 'computer',   label: 'Computer',    dot: 'bg-blue-500',    color: 'bg-blue-100   text-blue-800   border-blue-200'   },
  { id: 'make-up',    label: 'Make-up',     dot: 'bg-pink-500',    color: 'bg-pink-100   text-pink-800   border-pink-200'   },
  { id: 'wig-making', label: 'Wig Making',  dot: 'bg-purple-500',  color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'barbing',    label: 'Barbing',     dot: 'bg-green-500',   color: 'bg-green-100  text-green-800  border-green-200'  },
  { id: 'baking',     label: 'Baking',      dot: 'bg-yellow-500',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'resin-art',  label: 'Resin Art',   dot: 'bg-orange-500',  color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'nail-tech',  label: 'Nail Tech',   dot: 'bg-rose-500',    color: 'bg-rose-100   text-rose-800   border-rose-200'   },
  { id: 'tailoring',  label: 'Tailoring',   dot: 'bg-teal-500',    color: 'bg-teal-100   text-teal-800   border-teal-200'   },
];

export const CLASS_LABELS = CLASSES.reduce((acc, c) => { acc[c.id] = c.label; return acc; }, {});
export const CLASS_COLORS = CLASSES.reduce((acc, c) => { acc[c.id] = c.color; return acc; }, {});
export const CLASS_DOTS   = CLASSES.reduce((acc, c) => { acc[c.id] = c.dot;   return acc; }, {});

export const ROLES = { ADMIN: 'admin', TEACHER: 'teacher' };

export const MAX_CLASSES_PER_STUDENT  = 2;
export const SEMESTER_TOTAL_WEEKS     = 12;
export const DEFAULT_SESSIONS_PER_WEEK = 1;

export const GENDERS = ['Male', 'Female', 'Prefer not to say'];

export const COLORS = {
  brown:  '#5A3825',
  orange: '#E57A06',
  cream:  '#F2E9DE',
};

export const CHART_COLORS = [
  '#E57A06', '#5A3825', '#C46905', '#4A2D1C',
  '#F5A833', '#A66A43', '#10b981', '#8b5cf6',
];

// Drop request statuses
export const DROP_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};
