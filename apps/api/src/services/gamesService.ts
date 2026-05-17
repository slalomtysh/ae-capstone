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

function buildDateRange(days: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return `${dateToEspn(start)}-${dateToEspn(end)}`;
}

export async function fetchLiveGames(
  espnClient: EspnClient,
  sports: SportKey[],
  teamIds: string[]
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];

  for (const sport of sports) {
    const payload = await espnClient.getJson<any>(buildScoreboardUrl(sport));
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

export async function fetchRecentGames(
  espnClient: EspnClient,
  sports: SportKey[],
  teamIds: string[],
  days: number
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];
  const range = buildDateRange(days);

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
  eventId: string
): Promise<GameDetailDto> {
  const summaryPayload = await espnClient.getJson<any>(buildSummaryUrl(sport, eventId));
  return mapGameDetail(summaryPayload, summaryPayload, sport);
}
