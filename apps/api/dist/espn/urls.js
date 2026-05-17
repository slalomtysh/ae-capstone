import { ESPN_BASE_URL, SPORT_PATHS } from '../config.js';
export function buildTeamsUrl(sport) {
    const path = SPORT_PATHS[sport];
    return `${ESPN_BASE_URL}/${path.sport}/${path.league}/teams`;
}
export function buildScoreboardUrl(sport, dates) {
    const path = SPORT_PATHS[sport];
    const base = `${ESPN_BASE_URL}/${path.sport}/${path.league}/scoreboard`;
    return dates ? `${base}?dates=${dates}` : base;
}
export function buildSummaryUrl(sport, eventId) {
    const path = SPORT_PATHS[sport];
    return `${ESPN_BASE_URL}/${path.sport}/${path.league}/summary?event=${encodeURIComponent(eventId)}`;
}
