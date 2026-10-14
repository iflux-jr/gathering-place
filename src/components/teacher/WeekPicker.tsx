// Step between the semester's weeks. Teachers can go back to catch up on a missed week,
// but not forward past this week.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui';
import type { Semester } from '../../types/firestore';
import { semesterWeekStart } from '../../utils/dateUtils';

interface WeekPickerProps {
  week: number;
  lastWeek: number;
  totalWeeks: number;
  currentWeek: number | null;
  semester: Semester;
  onChange: (week: number) => void;
}

function range(week: number, semester: Semester) {
  const start = semesterWeekStart(week, semester);
  if (!start) return '';
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString('en-NG', withMonth ? { day: 'numeric', month: 'short' } : { day: 'numeric' });
  return start.getMonth() === end.getMonth()
    ? `${fmt(start, false)}–${fmt(end, true)}`
    : `${fmt(start, true)} – ${fmt(end, true)}`;
}

export function WeekPicker({ week, lastWeek, totalWeeks, currentWeek, semester, onChange }: WeekPickerProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0" aria-live="polite">
        <p className="font-heading text-h3 leading-tight">
          Week {week} <span className="font-body text-small font-medium text-muted">of {totalWeeks}</span>
        </p>
        <p className="text-small text-muted">
          {range(week, semester)}
          {week === currentWeek && <span className="font-medium text-ink"> · this week</span>}
        </p>
      </div>
      <div className="flex flex-none gap-1.5">
        <Button variant="outline" size="icon" aria-label="Previous week" disabled={week <= 1} onClick={() => onChange(week - 1)}>
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next week" disabled={week >= lastWeek} onClick={() => onChange(week + 1)}>
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
