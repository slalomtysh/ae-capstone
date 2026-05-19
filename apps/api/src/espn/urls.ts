import { ESPN_BASE_URL, ESPN_V2_BASE_URL, SPORT_PATHS, type SportKey } from '../config.js';

export function buildTeamsUrl(sport: SportKey, groupId?: string): string {
  const path = SPORT_PATHS[sport];
  const base = `${ESPN_BASE_URL}/${path.sport}/${path.league}/teams`;
  return groupId ? `${base}?groups=${encodeURIComponent(groupId)}` : base;
}

export function buildScoreboardUrl(sport: SportKey, dates?: string): string {
  const path = SPORT_PATHS[sport];
  const base = `${ESPN_BASE_URL}/${path.sport}/${path.league}/scoreboard`;
  return dates ? `${base}?dates=${dates}` : base;
}

export function buildSummaryUrl(sport: SportKey, eventId: string): string {
  const path = SPORT_PATHS[sport];
  return `${ESPN_BASE_URL}/${path.sport}/${path.league}/summary?event=${encodeURIComponent(eventId)}`;
}

export function buildStandingsUrl(sport: SportKey): string {
  const path = SPORT_PATHS[sport];
  return `${ESPN_V2_BASE_URL}/${path.sport}/${path.league}/standings`;
}
