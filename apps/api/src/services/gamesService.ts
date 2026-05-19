import { buildScoreboardUrl, buildSummaryUrl } from '../espn/urls.js';
import { mapGameDetail, mapGameSummary } from '../espn/mappers.js';
import { UpstreamError } from '../errors.js';
import type { EspnClient, GameDetailDto, GameSummaryDto } from '../types.js';
import type { SportKey } from '../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFormatterByTimeZone = new Map<string, Intl.DateTimeFormat>();

interface SportEventsResult {
  sport: SportKey;
  events: any[];
}

interface SportFetchFailure {
  sport: SportKey;
  url: string;
  cause: string;
  details?: unknown;
}

function buildFavoriteKeySet(teamIds: string[]): Set<string> {
  return new Set(teamIds.map((id) => String(id).trim().toLowerCase()).filter(Boolean));
}

function isFavoriteGameForSport(sport: SportKey, competitorIds: string[], favoriteKeySet: Set<string>): boolean {
  const sportKey = sport.toLowerCase();
  return competitorIds.some((id) => {
    const teamId = String(id).trim().toLowerCase();
    return favoriteKeySet.has(teamId) || favoriteKeySet.has(`${sportKey}:${teamId}`);
  });
}

function dateToEspn(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateFormatterByTimeZone.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  dateFormatterByTimeZone.set(timeZone, formatter);
  return formatter;
}

function toIsoDateInTimeZone(date: Date, timeZone: string): string {
  const formatter = getDateFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return new Date(date).toISOString().split('T')[0];
  }
  return `${year}-${month}-${day}`;
}

function toLocalIsoDate(value: string, timeZone: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toIsoDateInTimeZone(parsed, timeZone);
}

function buildUtcDateRange(startOffsetDays: number, endOffsetDays: number): string {
  const now = new Date();
  const start = new Date(now.getTime() + startOffsetDays * DAY_MS);
  const end = new Date(now.getTime() + endOffsetDays * DAY_MS);
  return `${dateToEspn(start)}-${dateToEspn(end)}`;
}

function buildLocalDateSet(timeZone: string, startOffsetDays: number, endOffsetDays: number): Set<string> {
  const dates = new Set<string>();
  const now = new Date();

  for (let offset = startOffsetDays; offset <= endOffsetDays; offset += 1) {
    const candidate = new Date(now.getTime() + offset * DAY_MS);
    dates.add(toIsoDateInTimeZone(candidate, timeZone));
  }

  return dates;
}

async function fetchEventsBySport(
  espnClient: EspnClient,
  endpoint: 'live' | 'upcoming' | 'recent',
  sports: SportKey[],
  range: string,
): Promise<{ successes: SportEventsResult[]; failures: SportFetchFailure[] }> {
  const settled = await Promise.all(
    sports.map(async (sport) => {
      const url = buildScoreboardUrl(sport, range);
      try {
        const payload = await espnClient.getJson<any>(url);
        return {
          ok: true as const,
          sport,
          events: payload?.events ?? [],
        };
      } catch (error) {
        return {
          ok: false as const,
          sport,
          url,
          cause: error instanceof Error ? error.message : String(error),
          details: error instanceof UpstreamError ? error.details : undefined,
        };
      }
    }),
  );

  const successes: SportEventsResult[] = [];
  const failures: SportFetchFailure[] = [];

  for (const result of settled) {
    if (result.ok) {
      successes.push({ sport: result.sport, events: result.events });
    } else {
      failures.push({
        sport: result.sport,
        url: result.url,
        cause: result.cause,
        details: result.details,
      });
    }
  }

  if (successes.length === 0 && failures.length > 0) {
    throw new UpstreamError(`Upstream failed for all requested sports on ${endpoint} games`, {
      endpoint,
      requestedSports: sports,
      failedSports: failures.map((failure) => failure.sport),
      failures,
    });
  }

  if (failures.length > 0) {
    console.warn(`[gamesService] partial upstream failure on ${endpoint} games`, {
      requestedSports: sports,
      failedSports: failures.map((failure) => failure.sport),
    });
  }

  return { successes, failures };
}

/**
 * Live Games — all games for favorite teams on today's local date, any status.
 * Includes in-progress carryover games from the previous local date.
 */
export async function fetchLiveGames(
  espnClient: EspnClient,
  sports: SportKey[],
  teamIds: string[],
  timeZone = 'UTC',
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];
  const favoriteKeySet = buildFavoriteKeySet(teamIds);
  const liveRange = buildUtcDateRange(-2, 1);
  const todayLocalDate = toIsoDateInTimeZone(new Date(), timeZone);
  const yesterdayLocalDate = toIsoDateInTimeZone(new Date(Date.now() - DAY_MS), timeZone);
  const { successes } = await fetchEventsBySport(espnClient, 'live', sports, liveRange);

  for (const { sport, events } of successes) {
    for (const event of events) {
      const summary = mapGameSummary(event, sport);
      const eventLocalDate = toLocalIsoDate(summary.startTimeUtc, timeZone);
      const isToday = eventLocalDate === todayLocalDate;
      const isLiveCarryover = summary.status === 'live' && eventLocalDate === yesterdayLocalDate;
      const shouldIncludeByDateWindow = isToday || isLiveCarryover;
      if (!shouldIncludeByDateWindow) {
        continue;
      }
      const competitorIds = [summary.homeTeam.teamId, summary.awayTeam.teamId];
      const isFavoriteGame = isFavoriteGameForSport(sport, competitorIds, favoriteKeySet);
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
  timeZone = 'UTC',
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];
  const favoriteKeySet = buildFavoriteKeySet(teamIds);
  const range = buildUtcDateRange(0, 8);
  const upcomingLocalDates = buildLocalDateSet(timeZone, 1, 7);
  const { successes } = await fetchEventsBySport(espnClient, 'upcoming', sports, range);

  for (const { sport, events } of successes) {
    for (const event of events) {
      const summary = mapGameSummary(event, sport);
      const eventLocalDate = toLocalIsoDate(summary.startTimeUtc, timeZone);
      const competitorIds = [summary.homeTeam.teamId, summary.awayTeam.teamId];
      const isFavoriteGame = isFavoriteGameForSport(sport, competitorIds, favoriteKeySet);
      const isInUpcomingRange = eventLocalDate !== null && upcomingLocalDates.has(eventLocalDate);
      if (isFavoriteGame && summary.status === 'pre' && isInUpcomingRange) {
        allEvents.push(summary);
      }
    }
  }

  // Sort ascending by start time (soonest first)
  allEvents.sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());

  return allEvents.slice(0, 9);
}

/**
 * Recent Games — final games for favorite teams in the 7 days before today (today excluded).
 */
export async function fetchRecentGames(
  espnClient: EspnClient,
  sports: SportKey[],
  teamIds: string[],
  days: number,
  timeZone = 'UTC',
): Promise<GameSummaryDto[]> {
  const allEvents: GameSummaryDto[] = [];
  const favoriteKeySet = buildFavoriteKeySet(teamIds);
  const range = buildUtcDateRange(-(days + 1), 0);
  const recentLocalDates = buildLocalDateSet(timeZone, -days, -1);
  const { successes } = await fetchEventsBySport(espnClient, 'recent', sports, range);

  for (const { sport, events } of successes) {
    for (const event of events) {
      const summary = mapGameSummary(event, sport);
      const eventLocalDate = toLocalIsoDate(summary.startTimeUtc, timeZone);
      const competitorIds = [summary.homeTeam.teamId, summary.awayTeam.teamId];
      const isFavoriteGame = isFavoriteGameForSport(sport, competitorIds, favoriteKeySet);
      const isInRecentRange = eventLocalDate !== null && recentLocalDates.has(eventLocalDate);
      if (isFavoriteGame && summary.status === 'final' && isInRecentRange) {
        allEvents.push(summary);
      }
    }
  }
  allEvents.sort((a, b) => new Date(b.startTimeUtc).getTime() - new Date(a.startTimeUtc).getTime());

  return allEvents.slice(0, 9);
}

export async function fetchGameDetail(
  espnClient: EspnClient,
  sport: SportKey,
  eventId: string,
): Promise<GameDetailDto> {
  const summaryPayload = await espnClient.getJson<any>(buildSummaryUrl(sport, eventId));
  return mapGameDetail(summaryPayload, summaryPayload, sport);
}
