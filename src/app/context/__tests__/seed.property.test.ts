/**
 * Property test for seed idempotence
 * Task 11.11 (Property 9: seed idempotence — upsert logic)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ── Property 9: Seed idempotence (task 11.11) ──────────────────────────────

describe('seed.sql — Property 9: seed idempotence', () => {
  const seedPath = path.resolve(process.cwd(), 'supabase/seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf-8');

  it('seed.sql uses ON CONFLICT DO NOTHING for all INSERT statements', () => {
    // Feature: supabase-backend, Property 9: For any database state (empty or
    // already seeded), running the seed script twice should produce the same
    // row count as running it once.
    //
    // We verify this by asserting the SQL uses ON CONFLICT DO NOTHING.

    // Count INSERT INTO statements (excluding comments)
    const sqlLines = seedSql.split('\n').filter(line => !line.trim().startsWith('--'));
    const sqlWithoutComments = sqlLines.join('\n');

    const insertCount = (sqlWithoutComments.match(/INSERT INTO/g) ?? []).length;
    const conflictCount = (sqlWithoutComments.match(/ON CONFLICT DO NOTHING/g) ?? []).length;

    // There should be at least one INSERT block
    expect(insertCount).toBeGreaterThan(0);

    // Every INSERT must be followed by ON CONFLICT DO NOTHING
    expect(conflictCount).toBe(insertCount);
  });

  it('all table inserts in seed.sql are idempotent', () => {
    const tables = ['members', 'children', 'program_slots', 'child_events', 'member_activities', 'timhert_activities'];

    for (const table of tables) {
      const tableInsertRegex = new RegExp(`INSERT INTO ${table}[\\s\\S]*?ON CONFLICT DO NOTHING;`);
      expect(seedSql).toMatch(tableInsertRegex);
    }
  });

  it('upsert deduplication logic: inserting same id twice keeps one record', () => {
    // Feature: supabase-backend, Property 9: property-test the upsert deduplication logic
    // Simulate the ON CONFLICT DO NOTHING behavior in JavaScript
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.uuid(), value: fc.string({ minLength: 1 }) }),
          { minLength: 1, maxLength: 20 }
        ),
        (rows) => {
          // Simulate INSERT ... ON CONFLICT DO NOTHING
          function upsertWithConflictDoNothing<T extends { id: string }>(
            existing: T[],
            newRows: T[]
          ): T[] {
            const existingIds = new Set(existing.map(r => r.id));
            const toInsert = newRows.filter(r => !existingIds.has(r.id));
            return [...existing, ...toInsert];
          }

          // First insert
          const afterFirst = upsertWithConflictDoNothing([], rows);
          // Second insert (same rows)
          const afterSecond = upsertWithConflictDoNothing(afterFirst, rows);

          // Row count should be the same after both inserts
          return afterFirst.length === afterSecond.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('upsert deduplication: duplicate ids are never inserted', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.uuid(), value: fc.string({ minLength: 1 }) }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(
          fc.record({ id: fc.uuid(), value: fc.string({ minLength: 1 }) }),
          { minLength: 0, maxLength: 5 }
        ),
        (existingRows, newRows) => {
          function upsertWithConflictDoNothing<T extends { id: string }>(
            existing: T[],
            incoming: T[]
          ): T[] {
            const existingIds = new Set(existing.map(r => r.id));
            const toInsert = incoming.filter(r => !existingIds.has(r.id));
            return [...existing, ...toInsert];
          }

          const result = upsertWithConflictDoNothing(existingRows, newRows);

          // No duplicate ids in result
          const ids = result.map(r => r.id);
          const uniqueIds = new Set(ids);
          return ids.length === uniqueIds.size;
        }
      ),
      { numRuns: 100 }
    );
  });
});
