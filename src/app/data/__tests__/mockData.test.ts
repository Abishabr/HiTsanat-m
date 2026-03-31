import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getSubDeptDisplayName, SUBDEPT_DISPLAY_NAMES } from '../mockData';

// Feature: dashboard-role-separation, Property 11: Sub-department name mapping is correct

describe('getSubDeptDisplayName', () => {
  // Unit tests for specific known mappings
  it('maps Timhert to "Timhert Academic"', () => {
    expect(getSubDeptDisplayName('Timhert')).toBe('Timhert Academic');
  });

  it('maps Mezmur to "Tmezmur"', () => {
    expect(getSubDeptDisplayName('Mezmur')).toBe('Tmezmur');
  });

  it('maps Kinetibeb to "Kinetibeb"', () => {
    expect(getSubDeptDisplayName('Kinetibeb')).toBe('Kinetibeb');
  });

  it('maps Kuttr to "Kuttr"', () => {
    expect(getSubDeptDisplayName('Kuttr')).toBe('Kuttr');
  });

  it('maps Ekd to "EKD"', () => {
    expect(getSubDeptDisplayName('Ekd')).toBe('EKD');
  });

  it('returns the input unchanged for unknown names', () => {
    expect(getSubDeptDisplayName('Unknown')).toBe('Unknown');
    expect(getSubDeptDisplayName('')).toBe('');
    expect(getSubDeptDisplayName('random')).toBe('random');
  });

  /**
   * Property 11: Sub-department name mapping is correct
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
   */
  it('property: returns correct display name for all five internal names', () => {
    // Feature: dashboard-role-separation, Property 11: Sub-department name mapping is correct
    const knownMappings: Array<[string, string]> = [
      ['Timhert', 'Timhert Academic'],
      ['Mezmur', 'Tmezmur'],
      ['Kinetibeb', 'Kinetibeb'],
      ['Kuttr', 'Kuttr'],
      ['Ekd', 'EKD'],
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...knownMappings),
        ([internalName, expectedDisplayName]) => {
          expect(getSubDeptDisplayName(internalName)).toBe(expectedDisplayName);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('property: returns input unchanged for unknown names', () => {
    // Feature: dashboard-role-separation, Property 11: Sub-department name mapping is correct
    const knownKeys = Object.keys(SUBDEPT_DISPLAY_NAMES);

    fc.assert(
      fc.property(
        fc.string().filter(s => !knownKeys.includes(s)),
        (unknownName) => {
          expect(getSubDeptDisplayName(unknownName)).toBe(unknownName);
        }
      ),
      { numRuns: 20 }
    );
  });
});
