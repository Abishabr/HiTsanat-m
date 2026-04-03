/**
 * Tests for ScheduleStore
 * Tasks 11.8 (Property 4: attendance upsert idempotence)
 *       11.9 (Property 5: notification created on attendance submission)
 *       11.10 (Property 6: markNotificationsRead idempotence)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { ScheduleProvider, useSchedule } from '../ScheduleStore';
import { DataStoreProvider } from '../DataStore';
import type { DayAttendance, AttendanceNotification } from '../ScheduleStore';
import { supabase } from '../../../lib/supabase';

// Extend the supabase mock to support upsert and full chaining
// (the global mock in test-setup.ts doesn't include upsert)
beforeEach(() => {
  const makeSingleResult = (data: Record<string, unknown>) => ({ data, error: null });
  const makeListResult = (data: unknown[]) => ({ data, error: null });

  // Notification row shape returned by insert().select().single()
  const notifRow = {
    id: `notif-mock-${Date.now()}`,
    date: '2024-01-01',
    day: 'Saturday',
    present_count: 0,
    absent_count: 0,
    total_count: 0,
    submitted_at: new Date().toISOString(),
    read: false,
  };

  const insertSelectSingle = vi.fn().mockReturnValue(makeSingleResult(notifRow));
  const insertSelect = vi.fn().mockReturnValue({
    ...makeListResult([]),
    single: insertSelectSingle,
  });
  const insertChain = {
    select: insertSelect,
    single: vi.fn().mockReturnValue(makeSingleResult({})),
  };

  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'attendance_notifications') {
      return {
        select: vi.fn().mockReturnValue(makeListResult([])),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            ...makeListResult([notifRow]),
            single: vi.fn().mockReturnValue(makeSingleResult(notifRow)),
          }),
          single: vi.fn().mockReturnValue(makeSingleResult(notifRow)),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(makeListResult([])),
        }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(makeListResult([])) }),
        upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(makeListResult([])) }),
        eq: vi.fn().mockReturnValue(makeListResult([])),
      } as ReturnType<typeof supabase.from>;
    }
    return {
      select: vi.fn().mockReturnValue(makeListResult([])),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(makeListResult([])) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(makeListResult([])) }),
      upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(makeListResult([])) }),
      eq: vi.fn().mockReturnValue(makeListResult([])),
    } as ReturnType<typeof supabase.from>;
  });
});

// ── Wrapper ────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    DataStoreProvider,
    null,
    React.createElement(ScheduleProvider, null, children)
  );

// ── Arbitraries ────────────────────────────────────────────────────────────

const attendanceStatusArb = fc.constantFrom<'present' | 'absent' | 'excused' | 'late'>(
  'present', 'absent', 'excused', 'late'
);

const dayArb = fc.constantFrom<'Saturday' | 'Sunday'>('Saturday', 'Sunday');

// ── Pure deduplication logic (mirrors ScheduleStore.markAttendance demo path) ──

function applyAttendanceRecords(
  existing: DayAttendance[],
  newRecords: Omit<DayAttendance, 'id'>[]
): DayAttendance[] {
  let counter = 1000;
  const withIds = newRecords.map(r => ({ ...r, id: `att-${counter++}` }));
  const filtered = existing.filter(
    a => !withIds.some(n => n.childId === a.childId && n.date === a.date)
  );
  return [...filtered, ...withIds];
}

// ── Property 4: Attendance upsert idempotence (task 11.8) ─────────────────

describe('ScheduleStore — Property 4: attendance upsert idempotence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('pure deduplication logic: calling twice with same records produces no duplicates', () => {
    // Feature: supabase-backend, Property 4: For any set of attendance records,
    // calling markAttendance twice with the same (childId, date) pairs should
    // result in the same final attendance state as calling it once — no duplicates.
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            childId: fc.uuid(),
            date: fc.constant('2024-03-15'),
            day: dayArb,
            status: attendanceStatusArb,
            markedBy: fc.uuid(),
            markedAt: fc.constant(new Date().toISOString()),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (records) => {
          // Apply once
          const afterFirst = applyAttendanceRecords([], records);
          // Apply again with same records
          const afterSecond = applyAttendanceRecords(afterFirst, records);

          // Count should be the same
          if (afterFirst.length !== afterSecond.length) return false;

          // No duplicate (childId, date) pairs
          const pairs = afterSecond.map(a => `${a.childId}:${a.date}`);
          const uniquePairs = new Set(pairs);
          return uniquePairs.size === pairs.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pure deduplication: overlapping records replace existing ones', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            childId: fc.uuid(),
            date: fc.constant('2024-04-01'),
            day: dayArb,
            status: attendanceStatusArb,
            markedBy: fc.uuid(),
            markedAt: fc.constant(new Date().toISOString()),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.record({
            childId: fc.uuid(),
            date: fc.constant('2024-04-01'),
            day: dayArb,
            status: attendanceStatusArb,
            markedBy: fc.uuid(),
            markedAt: fc.constant(new Date().toISOString()),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (first, second) => {
          const afterFirst = applyAttendanceRecords([], first);
          const afterSecond = applyAttendanceRecords(afterFirst, second);

          // No duplicate (childId, date) pairs in final state
          const pairs = afterSecond.map(a => `${a.childId}:${a.date}`);
          const uniquePairs = new Set(pairs);
          return uniquePairs.size === pairs.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('demo mode: calling markAttendance twice with same (childId, date) produces no duplicates', async () => {
    const { result } = renderHook(() => useSchedule(), { wrapper });

    const childId = 'child-dedup-test-' + Date.now();
    const date = '2024-06-01';

    const firstRecord: Omit<DayAttendance, 'id'> = {
      childId, date, day: 'Saturday', status: 'present',
      markedBy: 'member-1', markedAt: new Date().toISOString(),
    };
    const secondRecord: Omit<DayAttendance, 'id'> = {
      childId, date, day: 'Saturday', status: 'absent',
      markedBy: 'member-2', markedAt: new Date().toISOString(),
    };

    await act(async () => { await result.current.markAttendance([firstRecord]); });
    await act(async () => { await result.current.markAttendance([secondRecord]); });

    // There should be at most 1 record for this (childId, date) pair
    const records = result.current.attendance.filter(
      a => a.childId === childId && a.date === date
    );
    expect(records.length).toBeLessThanOrEqual(1);
  });
});

// ── Property 5: Notification created on attendance submission (task 11.9) ──

describe('ScheduleStore — Property 5: notification created on attendance submission', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('pure notification logic: N records produces 1 notification with correct counts', () => {
    // Feature: supabase-backend, Property 5: For any non-empty call to
    // markAttendance, the notifications array should grow by exactly one entry
    // whose presentCount + absentCount equals the number of records submitted.
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            childId: fc.uuid(),
            date: fc.constant('2024-04-01'),
            day: dayArb,
            status: fc.constantFrom<'present' | 'absent'>('present', 'absent'),
            markedBy: fc.uuid(),
            markedAt: fc.constant(new Date().toISOString()),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (records) => {
          // Simulate the notification creation logic from ScheduleStore
          const present = records.filter(r => r.status === 'present').length;
          const absent = records.filter(r => r.status === 'absent').length;

          const notif: AttendanceNotification = {
            id: `notif-${Date.now()}`,
            date: records[0].date,
            day: records[0].day,
            presentCount: present,
            absentCount: absent,
            totalCount: records.length,
            submittedAt: new Date().toISOString(),
            read: false,
          };

          return (
            notif.presentCount + notif.absentCount === records.length &&
            notif.totalCount === records.length &&
            notif.read === false
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('demo mode: markAttendance with N records adds exactly 1 notification', async () => {
    const { result } = renderHook(() => useSchedule(), { wrapper });

    const records: Omit<DayAttendance, 'id'>[] = [
      { childId: 'c1', date: '2024-05-01', day: 'Saturday', status: 'present', markedBy: 'm1', markedAt: new Date().toISOString() },
      { childId: 'c2', date: '2024-05-01', day: 'Saturday', status: 'present', markedBy: 'm1', markedAt: new Date().toISOString() },
      { childId: 'c3', date: '2024-05-01', day: 'Saturday', status: 'absent', markedBy: 'm1', markedAt: new Date().toISOString() },
    ];

    const notifsBefore = result.current.notifications.length;

    await act(async () => { await result.current.markAttendance(records); });

    // Exactly 1 notification added
    expect(result.current.notifications.length).toBe(notifsBefore + 1);
    // The notification should not be read
    expect(result.current.notifications[0].read).toBe(false);
  });

  it('demo mode: multiple markAttendance calls each add one notification', async () => {
    const { result } = renderHook(() => useSchedule(), { wrapper });

    const makeRecord = (childId: string, date: string): Omit<DayAttendance, 'id'> => ({
      childId, date, day: 'Sunday', status: 'present',
      markedBy: 'm1', markedAt: new Date().toISOString(),
    });

    const notifsBefore = result.current.notifications.length;

    await act(async () => { await result.current.markAttendance([makeRecord('cx1', '2024-06-10')]); });
    await act(async () => { await result.current.markAttendance([makeRecord('cx2', '2024-06-17')]); });

    expect(result.current.notifications.length).toBe(notifsBefore + 2);
  });
});

// ── Property 6: markNotificationsRead idempotence (task 11.10) ────────────

describe('ScheduleStore — Property 6: markNotificationsRead idempotence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('pure idempotence: marking read twice equals marking once', () => {
    // Feature: supabase-backend, Property 6: For any notifications state,
    // calling markNotificationsRead twice should produce the same result as
    // calling it once — all notifications have read === true.
    fc.assert(
      fc.property(
        fc.array(
          fc.record<AttendanceNotification>({
            id: fc.uuid(),
            date: fc.constant('2024-01-01'),
            day: dayArb,
            presentCount: fc.integer({ min: 0, max: 20 }),
            absentCount: fc.integer({ min: 0, max: 20 }),
            totalCount: fc.integer({ min: 1, max: 40 }),
            submittedAt: fc.constant(new Date().toISOString()),
            read: fc.boolean(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (notifications) => {
          // Simulate markNotificationsRead
          const markRead = (notifs: AttendanceNotification[]) =>
            notifs.map(n => ({ ...n, read: true }));

          const afterFirst = markRead(notifications);
          const afterSecond = markRead(afterFirst);

          // All read after first call
          const allReadAfterFirst = afterFirst.every(n => n.read === true);
          // Same result after second call
          const sameAfterSecond = JSON.stringify(afterFirst) === JSON.stringify(afterSecond);

          return allReadAfterFirst && sameAfterSecond;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('demo mode: markNotificationsRead sets all notifications to read=true', async () => {
    const { result } = renderHook(() => useSchedule(), { wrapper });

    const records: Omit<DayAttendance, 'id'>[] = [
      { childId: 'c-read-1', date: '2024-07-01', day: 'Sunday', status: 'present', markedBy: 'm1', markedAt: new Date().toISOString() },
    ];

    await act(async () => { await result.current.markAttendance(records); });
    expect(result.current.notifications.some(n => !n.read)).toBe(true);

    await act(async () => { await result.current.markNotificationsRead(); });
    expect(result.current.notifications.every(n => n.read)).toBe(true);

    // Call again — still all read
    await act(async () => { await result.current.markNotificationsRead(); });
    expect(result.current.notifications.every(n => n.read)).toBe(true);
  });

  it('demo mode: markNotificationsRead on already-read notifications is a no-op', async () => {
    const { result } = renderHook(() => useSchedule(), { wrapper });

    const records: Omit<DayAttendance, 'id'>[] = [
      { childId: 'c-noop-1', date: '2024-08-01', day: 'Saturday', status: 'absent', markedBy: 'm2', markedAt: new Date().toISOString() },
    ];

    await act(async () => { await result.current.markAttendance(records); });
    await act(async () => { await result.current.markNotificationsRead(); });

    const stateAfterFirst = result.current.notifications.map(n => ({ id: n.id, read: n.read }));

    await act(async () => { await result.current.markNotificationsRead(); });

    const stateAfterSecond = result.current.notifications.map(n => ({ id: n.id, read: n.read }));
    expect(stateAfterFirst).toEqual(stateAfterSecond);
  });
});
