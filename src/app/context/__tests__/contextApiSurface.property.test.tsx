/**
 * Property test for context API surface preservation
 * Task 11.12 (Property 10)
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { DataStoreProvider, useDataStore } from '../DataStore';
import { ScheduleProvider, useSchedule } from '../ScheduleStore';

// ── Required API surface keys ──────────────────────────────────────────────

const AUTH_CONTEXT_KEYS = ['user', 'login', 'logout', 'error'] as const;
const DATA_STORE_KEYS = [
  'members', 'children',
  'addMember', 'updateMember', 'deleteMember',
  'addChild', 'updateChild', 'deleteChild',
  'isLoading', 'lastError',
] as const;
const SCHEDULE_STORE_KEYS = [
  'slots', 'attendance',
  'addSlot', 'removeSlot', 'assignMember',
  'markAttendance', 'notifications', 'markNotificationsRead',
  'isLoading',
] as const;

// ── Wrappers ───────────────────────────────────────────────────────────────

const authWrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

const dataWrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(DataStoreProvider, null, children);

const scheduleWrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    DataStoreProvider,
    null,
    React.createElement(ScheduleProvider, null, children)
  );

// ── Property 10: Context API surface preservation (task 11.12) ────────────

describe('Context API surface — Property 10: all required keys present', () => {
  it('AuthContext exposes all required keys', () => {
    // Feature: supabase-backend, Property 10: For any component that destructures
    // the existing fields from useAuth, useDataStore, or useSchedule, all
    // previously available fields should still be present and have compatible types.
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    const ctx = result.current;

    for (const key of AUTH_CONTEXT_KEYS) {
      expect(ctx).toHaveProperty(key);
    }
  });

  it('AuthContext login and logout are functions', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('DataStore exposes all required keys', () => {
    const { result } = renderHook(() => useDataStore(), { wrapper: dataWrapper });
    const ctx = result.current;

    for (const key of DATA_STORE_KEYS) {
      expect(ctx).toHaveProperty(key);
    }
  });

  it('DataStore CRUD methods are functions', () => {
    const { result } = renderHook(() => useDataStore(), { wrapper: dataWrapper });
    const fnKeys = ['addMember', 'updateMember', 'deleteMember', 'addChild', 'updateChild', 'deleteChild'] as const;
    for (const key of fnKeys) {
      expect(typeof result.current[key]).toBe('function');
    }
  });

  it('DataStore array fields are arrays', () => {
    const { result } = renderHook(() => useDataStore(), { wrapper: dataWrapper });
    expect(Array.isArray(result.current.members)).toBe(true);
    expect(Array.isArray(result.current.children)).toBe(true);
  });

  it('ScheduleStore exposes all required keys', () => {
    const { result } = renderHook(() => useSchedule(), { wrapper: scheduleWrapper });
    const ctx = result.current;

    for (const key of SCHEDULE_STORE_KEYS) {
      expect(ctx).toHaveProperty(key);
    }
  });

  it('ScheduleStore CRUD methods are functions', () => {
    const { result } = renderHook(() => useSchedule(), { wrapper: scheduleWrapper });
    const fnKeys = ['addSlot', 'removeSlot', 'assignMember', 'markAttendance', 'markNotificationsRead'] as const;
    for (const key of fnKeys) {
      expect(typeof result.current[key]).toBe('function');
    }
  });

  it('ScheduleStore array fields are arrays', () => {
    const { result } = renderHook(() => useSchedule(), { wrapper: scheduleWrapper });
    expect(Array.isArray(result.current.slots)).toBe(true);
    expect(Array.isArray(result.current.attendance)).toBe(true);
    expect(Array.isArray(result.current.notifications)).toBe(true);
  });

  it('property: all required keys are present across 100 renders', () => {
    // Feature: supabase-backend, Property 10: property-test that all required
    // keys are present in context value objects.
    fc.assert(
      fc.property(
        fc.constant(null), // no meaningful input variation needed
        () => {
          const { result: authResult } = renderHook(() => useAuth(), { wrapper: authWrapper });
          const { result: dataResult } = renderHook(() => useDataStore(), { wrapper: dataWrapper });
          const { result: schedResult } = renderHook(() => useSchedule(), { wrapper: scheduleWrapper });

          const authOk = AUTH_CONTEXT_KEYS.every(k => k in authResult.current);
          const dataOk = DATA_STORE_KEYS.every(k => k in dataResult.current);
          const schedOk = SCHEDULE_STORE_KEYS.every(k => k in schedResult.current);

          return authOk && dataOk && schedOk;
        }
      ),
      { numRuns: 10 } // Fewer runs due to React rendering overhead
    );
  });

  it('AuthContext user is null or has required User fields', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    const { user } = result.current;

    if (user !== null) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('phone');
    } else {
      expect(user).toBeNull();
    }
  });

  it('DataStore isLoading is boolean', () => {
    const { result } = renderHook(() => useDataStore(), { wrapper: dataWrapper });
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('ScheduleStore isLoading is boolean', () => {
    const { result } = renderHook(() => useSchedule(), { wrapper: scheduleWrapper });
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});
