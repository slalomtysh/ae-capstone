function parseIntEnv(
  name: string,
  fallback: number,
  constraints?: { min?: number; max?: number },
): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const int = Math.floor(value);
  if (constraints?.min !== undefined && int < constraints.min) {
    return fallback;
  }
  if (constraints?.max !== undefined && int > constraints.max) {
    return fallback;
  }
  return int;
}

export const STALE_TTL_MINUTES = parseIntEnv('STALE_TTL_MINUTES', 60, { min: 1 });
export const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';
export const ESPN_V2_BASE_URL = 'https://site.api.espn.com/apis/v2/sports';
export const UPSTREAM_TIMEOUT_MS = parseIntEnv('UPSTREAM_TIMEOUT_MS', 8000, { min: 100 });
export const UPSTREAM_RETRY_COUNT = parseIntEnv('UPSTREAM_RETRY_COUNT', 1, { min: 0, max: 5 });

export const SUPPORTED_SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaam', 'soccer'] as const;

export type SportKey = (typeof SUPPORTED_SPORTS)[number];

export const SPORT_PATHS: Record<SportKey, { sport: string; league: string }> = {
  nfl: { sport: 'football', league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  mlb: { sport: 'baseball', league: 'mlb' },
  nhl: { sport: 'hockey', league: 'nhl' },
  ncaaf: { sport: 'football', league: 'college-football' },
  ncaam: { sport: 'basketball', league: 'mens-college-basketball' },
  soccer: { sport: 'soccer', league: 'eng.1' },
};

// Source: pseudo-r/Public-ESPN-API README College Football Conference IDs.
export const NCAAF_CONFERENCE_GROUP_IDS = ['8', '5', '1', '4', '17', '80'] as const;
