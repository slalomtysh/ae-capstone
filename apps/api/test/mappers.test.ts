import { describe, expect, it } from 'vitest';
import { toUtcIsoString } from '../src/espn/mappers.js';

describe('toUtcIsoString', () => {
  it('treats timezone-less ISO timestamps as UTC', () => {
    const result = toUtcIsoString('2026-05-18T21:00');
    expect(result).toBe('2026-05-18T21:00:00.000Z');
  });

  it('normalizes date-only values to UTC midnight', () => {
    const result = toUtcIsoString('2026-05-18');
    expect(result).toBe('2026-05-18T00:00:00.000Z');
  });

  it('does not default to current time when parsing fails', () => {
    const result = toUtcIsoString('not-a-date');
    expect(result).toBe('1970-01-01T00:00:00.000Z');
  });
});
