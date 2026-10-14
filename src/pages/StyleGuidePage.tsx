// src/pages/StyleGuidePage.tsx
// Living reference for the design system: every token and base component in one page.
// Public at /styleguide (no data, no login) so it can be checked on a phone from a preview link.

import { useState, type ReactNode } from 'react';
import { Logo } from '../components/brand/Logo';
import {
  Avatar, Button, Card, Checkbox, ClassChip, Dialog, EmptyState, ErrorState, Field,
  FilterChip, Input, LoadingList, ProgressBar, RoleBadge, Select, StatTile, StatusPill,
  SuccessState, TabPanel, Tabs, Textarea, type Status,
} from '../components/ui';
import { classPalette, colors } from '../theme/tokens.js';
import { DEFAULT_CLASS_COLORS, getClassColor } from '../theme/classes';
import { CLASSES } from '../utils/constants';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <h2 id={id} className="font-heading text-h2 md:text-h2-lg text-ink">{title}</h2>
      {children}
    </section>
  );
}

const core: [string, string, string?][] = [
  ['ink', colors.ink.DEFAULT, 'Text, top bar, primary buttons'],
  ['ink-2', colors.ink[2], 'Dark cards'],
  ['canvas', colors.canvas, 'Page background'],
  ['surface', colors.surface, 'Cards, inputs'],
  ['line', colors.line.DEFAULT, 'Dividers'],
  ['muted', colors.muted, 'Secondary text'],
  ['line-control', colors.line.control, 'Input and checkbox edges'],
  ['accent-300', colors.accent[300], 'Light buttons'],
  ['accent-600', colors.accent[600], 'Links, focus ring'],
];

const statuses: Status[] = ['present', 'absent', 'holiday', 'unmarked', 'pending', 'accepted', 'declined', 'archived', 'open', 'paused'];

export default function StyleGuidePage() {
  const [tab, setTab] = useState('mark');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [filter, setFilter] = useState('all');
  const [mark, setMark] = useState<Record<string, boolean | undefined>>({ a: true, b: false });

  return (
    <div className="min-h-dvh bg-canvas font-body text-ink">
      <header className="rounded-b-frame bg-ink px-4 pb-8 pt-5 text-white sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-4">
          <Logo on="dark" height={36} label="The Gathering Place" />
          <h1 className="font-heading text-display md:text-display-lg">Design system</h1>
          <p className="max-w-[60ch] text-[#D9D5CB]">
            Tokens and base components for the redesign. Everything here is built from <code>src/theme/tokens.js</code> and <code>src/components/ui</code>.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-12 px-4 py-10 sm:px-8">
        <Section id="sg-logo" title="Logo (placeholder)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="grid place-items-start gap-5">
              <Logo height={40} />
              <Logo variant="wordmark" height={24} />
              <Logo variant="mark" height={56} />
            </Card>
            <Card tone={colors.ink.DEFAULT} className="grid place-items-start gap-5">
              <Logo on="dark" height={40} />
              <Logo variant="wordmark" on="dark" height={24} />
              <img src="/icon-192.png" alt="" width={64} height={64} />
            </Card>
          </div>
        </Section>

        <Section id="sg-colour" title="Colour">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {core.map(([name, hex, use]) => (
              <li key={name} className="overflow-hidden rounded-md border border-line bg-surface">
                <div className="h-16" style={{ backgroundColor: hex }} />
                <div className="p-2.5 text-caption">
                  <p className="font-semibold text-small">{name}</p>
                  <p className="font-mono text-muted">{hex}</p>
                  <p>{use}</p>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="font-heading text-h3">Class palette</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(classPalette).map(([key, c]) => {
              const cls = CLASSES.find(x => DEFAULT_CLASS_COLORS[x.id] === key);
              return (
                <li key={key} className="grid gap-2 rounded-card border border-line p-4" style={{ backgroundColor: c.surface }}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-ink px-2.5 py-1 text-caption font-semibold text-white">{cls?.label ?? 'Spare'}</span>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.strong }} aria-hidden="true" />
                  </span>
                  <span className="font-heading text-h3">{c.label}</span>
                  <span className="font-mono text-caption">{c.surface} / {c.strong}</span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section id="sg-type" title="Type">
          <Card className="grid gap-3">
            <p className="font-heading text-display md:text-display-lg">Good morning, Bisi</p>
            <p className="font-heading text-h1 md:text-h1-lg">Registrations</p>
            <p className="font-heading text-h2 md:text-h2-lg">Computer · Week 7</p>
            <p className="font-heading text-h3">Session 2 of 2</p>
            <p className="text-body">Your registration is with the admin team. We'll let you know the outcome.</p>
            <p className="text-small text-muted">Submitted 12 Oct, 4:20 pm</p>
            <p className="text-caption font-semibold uppercase tracking-[0.06em] text-muted">Pending review</p>
            <p className="font-mono text-small">GP-7KQ4M2</p>
          </Card>
        </Section>

        <Section id="sg-buttons" title="Buttons and chips">
          <Card className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Submit session</Button>
              <Button variant="dark">Accept 6 selected</Button>
              <Button variant="outline">Decline</Button>
              <Button variant="accent">Share registration link</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Remove class</Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by class">
              {['all', 'computer', 'baking'].map(f => (
                <FilterChip key={f} selected={filter === f} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All classes' : CLASSES.find(c => c.id === f)?.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {CLASSES.map(c => <ClassChip key={c.id} classId={c.id} />)}
            </div>
            <div className="flex flex-wrap gap-2">
              {statuses.map(s => <StatusPill key={s} status={s} />)}
            </div>
            <div className="flex flex-wrap gap-2">
              <RoleBadge role="admin" /><RoleBadge role="teacher" /><RoleBadge role="admin-teacher" />
            </div>
          </Card>
        </Section>

        <Section id="sg-forms" title="Form fields">
          <Card className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input autoComplete="name" placeholder="e.g. Amara Okafor" />
            </Field>
            <Field label="Phone number" required hint="We'll use this to reach you about your registration." error="Enter an 11-digit number, like 08012345678.">
              <Input type="tel" inputMode="tel" defaultValue="0801234" />
            </Field>
            <Field label="Gender" optional>
              <Select defaultValue="">
                <option value="">Prefer not to say</option>
                <option>Female</option>
                <option>Male</option>
              </Select>
            </Field>
            <Field label="Reason" optional>
              <Textarea placeholder="Visible to the admin only" />
            </Field>
            <Checkbox
              className="sm:col-span-2"
              checked={consent}
              onCheckedChange={setConsent}
              required
              label="I agree to The Gathering Place storing my details for class registration."
              description="Only the admin team and your class teacher can see them."
            />
          </Card>
        </Section>

        <Section id="sg-teacher" title="Attendance row (phone)">
          <div className="mx-auto w-full max-w-[380px] rounded-[36px] bg-ink p-3">
            <div className="grid gap-3 rounded-[26px] bg-canvas p-4">
              <Tabs label="Session" value={tab} onValueChange={setTab} items={[{ value: 'mark', label: 'Session 1' }, { value: 's2', label: 'Session 2' }]}>
                <TabPanel value="mark" className="mt-3 grid gap-2">
                  {[
                    { id: 'a', name: 'Amara Okafor', sub: 'Present 12 of 13' },
                    { id: 'b', name: 'Emeka Obiora', sub: 'New this week' },
                    { id: 'c', name: 'Olumide Fashola', sub: 'Present 9 of 13' },
                  ].map(s => (
                    <div key={s.id} className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5">
                      <Avatar name={s.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-semibold">{s.name}</p>
                        <p className="truncate text-caption text-muted">{s.sub}</p>
                      </div>
                      <div className="flex gap-1.5" role="group" aria-label={`Attendance for ${s.name}`}>
                        <button
                          type="button" aria-pressed={mark[s.id] === true} onClick={() => setMark(m => ({ ...m, [s.id]: true }))}
                          className="grid h-11 w-11 place-items-center rounded-sm border-1.5 border-ink font-heading font-semibold aria-pressed:bg-ok-solid focus-visible:outline-none focus-visible:shadow-focus"
                        >P<span className="sr-only">resent</span></button>
                        <button
                          type="button" aria-pressed={mark[s.id] === false} onClick={() => setMark(m => ({ ...m, [s.id]: false }))}
                          className="grid h-11 w-11 place-items-center rounded-sm border-1.5 border-ink font-heading font-semibold aria-pressed:bg-peach focus-visible:outline-none focus-visible:shadow-focus"
                        >A<span className="sr-only">bsent</span></button>
                      </div>
                    </div>
                  ))}
                </TabPanel>
                <TabPanel value="s2" className="mt-3">
                  <EmptyState title="Session 2 is on Saturday" description="You can mark it from 8 am that day." />
                </TabPanel>
              </Tabs>
              <div className="flex items-center gap-3 rounded-[18px] bg-ink p-3 text-white">
                <span className="flex-1 text-small">{Object.values(mark).filter(v => v !== undefined).length} of 3 marked</span>
                <Button size="sm">Save session</Button>
              </div>
            </div>
          </div>
        </Section>

        <Section id="sg-data" title="Cards, stats and progress">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Students" value={148} sub="+12 this week" tone={colors.butter} />
            <StatTile label="Pending" value={5} tone={classPalette.peach.surface} />
            <StatTile label="Attendance" value="84%" tone={colors.lilac} />
            <StatTile label="Classes" value={8} tone={colors.sky} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {['computer', 'make-up', 'baking'].map((id, i) => (
              <Card key={id} tone={getClassColor(id).surface} className="grid gap-3">
                <span className="justify-self-start rounded-full bg-ink px-2.5 py-1 text-caption font-semibold text-white">{CLASSES.find(c => c.id === id)?.label}</span>
                <p className="font-heading text-h3">{CLASSES.find(c => c.id === id)?.label}</p>
                <div className="flex justify-between text-small"><span>Week {7 - i} of 12</span><b>{84 + i * 3}%</b></div>
                <ProgressBar value={7 - i} max={12} label="Semester progress" valueText={`Week ${7 - i} of 12`} />
              </Card>
            ))}
          </div>
        </Section>

        <Section id="sg-states" title="Loading, empty, error and success">
          <div className="grid gap-4 md:grid-cols-2">
            <LoadingList rows={3} label="Loading students" />
            <EmptyState title="No registrations waiting" description="New sign-ups from the public form appear here." action={<Button variant="accent">Share registration link</Button>} />
            <ErrorState onRetry={() => undefined} />
            <SuccessState title="You're on the list" description="Your reference code is GP-7KQ4M2." />
          </div>
        </Section>

        <Section id="sg-dialog" title="Dialog">
          <div>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>Decline registration</Button>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Decline Ngozi Eze?"
            description="The registration is kept with its status. Nothing is deleted."
            footer={<>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Decline</Button>
            </>}
          >
            <Field label="Reason" optional hint="Internal unless you tick the box below.">
              <Textarea />
            </Field>
          </Dialog>
        </Section>
      </main>
    </div>
  );
}
