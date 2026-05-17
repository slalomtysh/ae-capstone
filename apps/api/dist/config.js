export const STALE_TTL_MINUTES = 60;
export const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';
export const UPSTREAM_TIMEOUT_MS = 8000;
export const UPSTREAM_RETRY_COUNT = 1;
export const SUPPORTED_SPORTS = [
    'nfl',
    'nba',
    'mlb',
    'nhl',
    'ncaaf',
    'ncaam',
    'soccer'
];
export const SPORT_PATHS = {
    nfl: { sport: 'football', league: 'nfl' },
    nba: { sport: 'basketball', league: 'nba' },
    mlb: { sport: 'baseball', league: 'mlb' },
    nhl: { sport: 'hockey', league: 'nhl' },
    ncaaf: { sport: 'football', league: 'college-football' },
    ncaam: { sport: 'basketball', league: 'mens-college-basketball' },
    soccer: { sport: 'soccer', league: 'eng.1' }
};
