import { ApiError } from '../errors.js';
import { SUPPORTED_SPORTS, type SportKey } from '../config.js';

export function parseCsvParam(input: unknown): string[] {
  if (typeof input !== 'string') {
    return [];
  }
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function requireTeamIds(input: unknown): string[] {
  const ids = parseCsvParam(input);
  if (ids.length === 0) {
    throw new ApiError(400, 'INVALID_QUERY', 'teamIds is required and must be a comma-separated list');
  }
  return ids;
}

export function parseSports(input: unknown): SportKey[] {
  const values = parseCsvParam(input).map((v) => v.toLowerCase());
  if (values.length === 0) {
    return [...SUPPORTED_SPORTS];
  }

  const invalid = values.filter((value) => !SUPPORTED_SPORTS.includes(value as SportKey));
  if (invalid.length > 0) {
    throw new ApiError(400, 'INVALID_QUERY', `Unsupported sports: ${invalid.join(', ')}`);
  }

  return values as SportKey[];
}

export function requireSport(input: unknown): SportKey {
  if (typeof input !== 'string' || !input.trim()) {
    throw new ApiError(400, 'INVALID_QUERY', 'sport is required');
  }
  const value = input.trim().toLowerCase();
  if (!SUPPORTED_SPORTS.includes(value as SportKey)) {
    throw new ApiError(400, 'INVALID_QUERY', `Unsupported sport: ${input as string}`);
  }
  return value as SportKey;
}

export function parseDays(input: unknown, fallback = 7): number {
  if (input === undefined) {
    return fallback;
  }
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 30) {
    throw new ApiError(400, 'INVALID_QUERY', 'days must be a number between 1 and 30');
  }
  return Math.floor(parsed);
}
