/**
 * Whether an assignment is still open. `status` is set to 'active' when the
 * assignment is created and nothing ever flips it, so an assignment due 10/9
 * kept counting as active weeks later. Open now means active AND not past the
 * end of its due day (local time) — due today still counts until midnight.
 */
interface DueFields {
  status?: 'active' | 'past';
  dueDate: string;
}

/** End of the local day the due date falls on, or null if it isn't a date. */
export function dueDayEnd(dueDate: string): Date | null {
  // A bare "2026-10-09" parses as UTC midnight, which is the previous evening
  // in the Americas; read it as that calendar day instead.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function isOverdue(a: Pick<DueFields, 'dueDate'>, now: Date = new Date()): boolean {
  const end = dueDayEnd(a.dueDate);
  return !!end && now.getTime() > end.getTime();
}

export function isAssignmentActive(a: DueFields, now: Date = new Date()): boolean {
  return a.status !== 'past' && !isOverdue(a, now);
}
