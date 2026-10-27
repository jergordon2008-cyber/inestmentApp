import { describe, expect, it } from '@jest/globals';
import { isAssignmentActive, isOverdue } from '../assignments';

const at = (y: number, mo: number, d: number, h = 12) => new Date(y, mo - 1, d, h);

describe('isOverdue', () => {
  it('past the end of the due day', () => {
    expect(isOverdue({ dueDate: at(2026, 10, 9).toISOString() }, at(2026, 10, 10, 0))).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-09' }, at(2026, 10, 26))).toBe(true);
  });

  it('still open all of the due day, whatever time it was set for', () => {
    expect(isOverdue({ dueDate: at(2026, 10, 9, 8).toISOString() }, at(2026, 10, 9, 23))).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-09' }, at(2026, 10, 9, 23))).toBe(false);
  });

  it('future and unparseable dates are not overdue', () => {
    expect(isOverdue({ dueDate: at(2026, 11, 1).toISOString() }, at(2026, 10, 26))).toBe(false);
    expect(isOverdue({ dueDate: 'soon' }, at(2026, 10, 26))).toBe(false);
  });
});

describe('isAssignmentActive', () => {
  const now = at(2026, 10, 26);
  it('excludes overdue and explicitly past assignments', () => {
    expect(isAssignmentActive({ status: 'active', dueDate: at(2026, 10, 9).toISOString() }, now)).toBe(false);
    expect(isAssignmentActive({ status: 'past', dueDate: at(2026, 12, 1).toISOString() }, now)).toBe(false);
  });

  it('keeps upcoming active ones', () => {
    expect(isAssignmentActive({ status: 'active', dueDate: at(2026, 10, 30).toISOString() }, now)).toBe(true);
  });
});
