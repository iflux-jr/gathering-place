// src/utils/constants.js
// Application-wide constants

/**
 * The original eight classes. The live list is the admin's, in systemSettings/classes
 * (see src/lib/classCatalog.ts); this is its starting point and fallback.
 */
export const CLASSES = [
  { id: 'computer',   label: 'Computer'   },
  { id: 'make-up',    label: 'Make-up'    },
  { id: 'wig-making', label: 'Wig Making' },
  { id: 'barbing',    label: 'Barbing'    },
  { id: 'baking',     label: 'Baking'     },
  { id: 'resin-art',  label: 'Resin Art'  },
  { id: 'nail-tech',  label: 'Nail Tech'  },
  { id: 'tailoring',  label: 'Tailoring'  },
];

export const MAX_CLASSES_PER_STUDENT  = 2;
export const SEMESTER_TOTAL_WEEKS     = 12;

export const GENDERS = ['Male', 'Female', 'Prefer not to say'];
