/**
 * Unit tests for useReportData hook
 * Task 3.2: Write unit tests for useReportData hook
 * 
 * Tests:
 * - Data merging logic
 * - Loading state handling
 * - Empty data scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useReportData } from '../useReportData';
import * as ScheduleStore from '../../context/ScheduleStore';
import * as DataStore from '../../context/DataStore';
import type { DayAttendance } from '../../context/ScheduleStore';
import type { Child } from '../../data/mockData';

// Mock the context hooks
vi.mock('../../context/ScheduleStore', async () => {
  const actual = await vi.importActual('../../context/ScheduleStore');
  return {
    ...actual,
    useSchedule: vi.fn(),
  };
});

vi.mock('../../context/DataStore', async () => {
  const actual = await vi.importActual('../../context/DataStore');
  return {
    ...actual,
    useDataStore: vi.fn(),
  };
});

describe('useReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should merge attendance records with child metadata', () => {
    // Arrange
    const mockAttendance: DayAttendance[] = [
      {
        id: 'att-1',
        date: '2024-01-15',
        day: 'Saturday',
        childId: 'child-1',
        status: 'present',
        markedBy: 'teacher-1',
        markedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'att-2',
        date: '2024-01-15',
        day: 'Saturday',
        childId: 'child-2',
        status: 'absent',
        markedBy: 'teacher-1',
        markedAt: '2024-01-15T10:00:00Z',
      },
    ];

    const mockChildren: Child[] = [
      {
        id: 'child-1',
        name: 'John Doe',
        age: 8,
        kutrLevel: 1,
        familyId: 'fam-1',
        familyName: 'Doe Family',
        guardianContact: '+1234567890',
        registrationDate: '2024-01-01',
      },
      {
        id: 'child-2',
        name: 'Jane Smith',
        age: 10,
        kutrLevel: 2,
        familyId: 'fam-2',
        familyName: 'Smith Family',
        guardianContact: '+0987654321',
        registrationDate: '2024-01-01',
      },
    ];

    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: mockAttendance,
      isLoading: false,
      slots: [],
      notifications: [],
      addSlot: vi.fn(),
      removeSlot: vi.fn(),
      assignMember: vi.fn(),
      markAttendance: vi.fn(),
      markNotificationsRead: vi.fn(),
    });

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: mockChildren,
      isLoading: false,
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      lastError: null,
    });

    // Act
    const { result } = renderHook(() => useReportData());

    // Assert
    expect(result.current.records).toHaveLength(2);
    expect(result.current.records[0]).toEqual({
      id: 'att-1',
      date: '2024-01-15',
      day: 'Saturday',
      childId: 'child-1',
      status: 'present',
      markedBy: 'teacher-1',
      markedAt: '2024-01-15T10:00:00Z',
      childName: 'John Doe',
      childKutrLevel: 1,
      familyName: 'Doe Family',
    });
    expect(result.current.records[1]).toEqual({
      id: 'att-2',
      date: '2024-01-15',
      day: 'Saturday',
      childId: 'child-2',
      status: 'absent',
      markedBy: 'teacher-1',
      markedAt: '2024-01-15T10:00:00Z',
      childName: 'Jane Smith',
      childKutrLevel: 2,
      familyName: 'Smith Family',
    });
  });

  it('should handle missing child data gracefully', () => {
    // Arrange
    const mockAttendance: DayAttendance[] = [
      {
        id: 'att-1',
        date: '2024-01-15',
        day: 'Saturday',
        childId: 'child-999', // Non-existent child
        status: 'present',
        markedBy: 'teacher-1',
        markedAt: '2024-01-15T10:00:00Z',
      },
    ];

    const mockChildren: Child[] = [];

    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: mockAttendance,
      isLoading: false,
      slots: [],
      notifications: [],
      addSlot: vi.fn(),
      removeSlot: vi.fn(),
      assignMember: vi.fn(),
      markAttendance: vi.fn(),
      markNotificationsRead: vi.fn(),
    });

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: mockChildren,
      isLoading: false,
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      lastError: null,
    });

    // Act
    const { result } = renderHook(() => useReportData());

    // Assert
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0].childName).toBe('Unknown');
    expect(result.current.records[0].childKutrLevel).toBe(1);
    expect(result.current.records[0].familyName).toBe('Unknown');
  });

  it('should return loading state when attendance is loading', () => {
    // Arrange
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: true,
      slots: [],
      notifications: [],
      addSlot: vi.fn(),
      removeSlot: vi.fn(),
      assignMember: vi.fn(),
      markAttendance: vi.fn(),
      markNotificationsRead: vi.fn(),
    });

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: false,
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      lastError: null,
    });

    // Act
    const { result } = renderHook(() => useReportData());

    // Assert
    expect(result.current.isLoading).toBe(true);
  });

  it('should return loading state when children data is loading', () => {
    // Arrange
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: false,
      slots: [],
      notifications: [],
      addSlot: vi.fn(),
      removeSlot: vi.fn(),
      assignMember: vi.fn(),
      markAttendance: vi.fn(),
      markNotificationsRead: vi.fn(),
    });

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: true,
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      lastError: null,
    });

    // Act
    const { result } = renderHook(() => useReportData());

    // Assert
    expect(result.current.isLoading).toBe(true);
  });

  it('should return loading state when both are loading', () => {
    // Arrange
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: true,
      slots: [],
      notifications: [],
      addSlot: vi.fn(),
      removeSlot: vi.fn(),
      assignMember: vi.fn(),
      markAttendance: vi.fn(),
      markNotificationsRead: vi.fn(),
    });

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: true,
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      lastError: null,
    });

    // Act
    const { result } = renderHook(() => useReportData());

    // Assert
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle empty attendance data', () => {
    // Arrange
    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: [],
      isLoading: false,
      slots: [],
      notifications: [],
      addSlot: vi.fn(),
      removeSlot: vi.fn(),
      assignMember: vi.fn(),
      markAttendance: vi.fn(),
      markNotificationsRead: vi.fn(),
    });

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: false,
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      lastError: null,
    });

    // Act
    const { result } = renderHook(() => useReportData());

    // Assert
    expect(result.current.records).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle empty children data', () => {
    // Arrange
    const mockAttendance: DayAttendance[] = [
      {
        id: 'att-1',
        date: '2024-01-15',
        day: 'Saturday',
        childId: 'child-1',
        status: 'present',
        markedBy: 'teacher-1',
        markedAt: '2024-01-15T10:00:00Z',
      },
    ];

    vi.mocked(ScheduleStore.useSchedule).mockReturnValue({
      attendance: mockAttendance,
      isLoading: false,
      slots: [],
      notifications: [],
      addSlot: vi.fn(),
      removeSlot: vi.fn(),
      assignMember: vi.fn(),
      markAttendance: vi.fn(),
      markNotificationsRead: vi.fn(),
    });

    vi.mocked(DataStore.useDataStore).mockReturnValue({
      children: [],
      isLoading: false,
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      lastError: null,
    });

    // Act
    const { result } = renderHook(() => useReportData());

    // Assert
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0].childName).toBe('Unknown');
    expect(result.current.records[0].familyName).toBe('Unknown');
  });
});
