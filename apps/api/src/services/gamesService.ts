import { buildScoreboardUrl, buildSummaryUrl } from '../espn/urls.js';
import { mapGameDetail, mapGameSummary } from '../espn/mappers.js';
import type { EspnClient, GameDetailDto, GameSummaryDto } from '../types.js';
import type { SportKey } from '../config.js';

function dateToEspn(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Returns today's UTC date in YYYYMMDD format. */
function todayEspn(): string {
  return dateToEspn(new Date());
}

/** Returns a date range string for N days starting from today+offsetDays (inclusive). */
function buildFutureDateRange(startOffsetDays: number, endOffsetDays: number): string {
  const now = new Date();
  const start = new Date(now.getTime() + startOffsetDays * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + endOffsetDays * 24 * 60 * 60 * 1000);
  return `${dateToEspn(start)}-${dateToEspn(end)}`;
}

/** Returns a date range string for the N days before today (today excluded). */
function buildPastDateRange(days: number): string {
  const end = new Date();
  // yesterday
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return `${dateToEspn(start)}-${dateToEspn(end)}`;
}

/**
 * Live Games — all games for favorite teams on today's UTC date, any status.
 */
export async function fetchLiveGames(
  espnClient: EspnClient,
  sports: SportKey[],
  teamIds: string[],
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];
  const today = todayEspn();

  for (const sport of sports) {
    const payload = await espnClient.getJson<any>(buildScoreboardUrl(sport, today));
    const events = payload?.events ?? [];
    for (const event of events) {
      const summary = mapGameSummary(event, sport);
      const competitorIds = [summary.homeTeam.teamId, summary.awayTeam.teamId];
      const isFavoriteGame = competitorIds.some((id) => teamIds.includes(id));
      if (isFavoriteGame) {
        allEvents.push(summary);
      }
    }
  }

  return allEvents;
}

/**
 * Upcoming Games — pre-scheduled games for favorite teams in the next 1–7 days (today excluded).
 * Results are ordered ascending by startTimeUtc.
 */
export async function fetchUpcomingGames(
  espnClient: EspnClient,
  sports: SportKey[],
  teamIds: string[],
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];
  const range = buildFutureDateRange(1, 7);

  for (const sport of sports) {
    const payload = await espnClient.getJson<any>(buildScoreboardUrl(sport, range));
    const events = payload?.events ?? [];
    for (const event of events) {
      const summary = mapGameSummary(event, sport);
      const competitorIds = [summary.homeTeam.teamId, summary.awayTeam.teamId];
      const isFavoriteGame = competitorIds.some((id) => teamIds.includes(id));
      if (isFavoriteGame && summary.status === 'pre') {
        allEvents.push(summary);
      }
    }
  }

  // Sort ascending by start time (soonest first)
  allEvents.sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());

  return allEvents;
}

/**
 * Recent Games — final games for favorite teams in the 7 days before today (today excluded).
 */
export async function fetchRecentGames(
  espnClient: EspnClient,
  sports: SportKey[],
  teamIds: string[],
  days: number,
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];
  const range = buildPastDateRange(days);

  for (const sport of sports) {
    const payload = await espnClient.getJson<any>(buildScoreboardUrl(sport, range));
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

export async function fetchGameDetail(
  espnClient: EspnClient,
  sport: SportKey,
  eventId: string,
): Promise<GameDetailDto> {
  const summaryPayload = await espnClient.getJson<any>(buildSummaryUrl(sport, eventId));
  return mapGameDetail(summaryPayload, summaryPayload, sport);
}
