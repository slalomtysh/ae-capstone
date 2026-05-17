import { buildScoreboardUrl, buildSummaryUrl } from '../espn/urls.js';
import { mapGameDetail, mapGameSummary } from '../espn/mappers.js';
function dateToEspn(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}
function buildDateRange(days) {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return `${dateToEspn(start)}-${dateToEspn(end)}`;
}
export async function fetchLiveGames(espnClient, sports, teamIds) {
    const allEvents = [];
    for (const sport of sports) {
        const payload = await espnClient.getJson(buildScoreboardUrl(sport));
        const events = payload?.events ?? [];
        for (const event of events) {
            const summary = mapGameSummary(event, sport);
            const competitorIds = [summary.homeTeam.teamId, summary.awayTeam.teamId];
            const isFavoriteGame = competitorIds.some((id) => teamIds.includes(id));
            if (isFavoriteGame && summary.status !== 'final') {
                allEvents.push(summary);
            }
        }
    }
    return allEvents;
}
export async function fetchRecentGames(espnClient, sports, teamIds, days) {
    const allEvents = [];
    const range = buildDateRange(days);
    for (const sport of sports) {
        const payload = await espnClient.getJson(buildScoreboardUrl(sport, range));
        const events = payload?.events ?? [];
        for (const event of events) {
            const summary = mapGameSummary(event, sport);
            const competitorIds = [summary.homeTeam.teamId, summary.awayTeam.teamId];
            const isFavoriteGame = competitorIds.some((id) => teamIds.includes(id));
            if (isFavoriteGame && summary.status === 'final') {
                allEvents.push(summary);
            }
        }
    }
    return allEvents;
}
export async function fetchGameDetail(espnClient, sport, eventId) {
    const summaryPayload = await espnClient.getJson(buildSummaryUrl(sport, eventId));
    return mapGameDetail(summaryPayload, summaryPayload, sport);
}
