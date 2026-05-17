import { ApiError } from '../errors.js';
import { SUPPORTED_SPORTS } from '../config.js';
export function parseCsvParam(input) {
    if (typeof input !== 'string') {
        return [];
    }
    return input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}
export function requireTeamIds(input) {
    const ids = parseCsvParam(input);
    if (ids.length === 0) {
        throw new ApiError(400, 'INVALID_QUERY', 'teamIds is required and must be a comma-separated list');
    }
    return ids;
}
export function parseSports(input) {
    const values = parseCsvParam(input).map((v) => v.toLowerCase());
    if (values.length === 0) {
        return [...SUPPORTED_SPORTS];
    }
    const invalid = values.filter((value) => !SUPPORTED_SPORTS.includes(value));
    if (invalid.length > 0) {
        throw new ApiError(400, 'INVALID_QUERY', `Unsupported sports: ${invalid.join(', ')}`);
    }
    return values;
}
export function requireSport(input) {
    if (typeof input !== 'string' || !input.trim()) {
        throw new ApiError(400, 'INVALID_QUERY', 'sport is required');
    }
    const value = input.trim().toLowerCase();
    if (!SUPPORTED_SPORTS.includes(value)) {
        throw new ApiError(400, 'INVALID_QUERY', `Unsupported sport: ${input}`);
    }
    return value;
}
export function parseDays(input, fallback = 7) {
    if (input === undefined) {
        return fallback;
    }
    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 30) {
        throw new ApiError(400, 'INVALID_QUERY', 'days must be a number between 1 and 30');
    }
    return Math.floor(parsed);
}
