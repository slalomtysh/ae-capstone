import type { GameDetailDto, GameStatus, GameSummaryDto, TeamScoreDto } from '../types.js';

function toNumberOrNull(input: unknown): number | null {
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

function toTeamScoreDto(raw: any): TeamScoreDto {
  return {
    teamId: String(raw?.team?.id ?? ''),
    displayName: String(raw?.team?.displayName ?? raw?.team?.name ?? 'Unknown Team'),
    abbreviation: String(raw?.team?.abbreviation ?? ''),
    logoUrl: raw?.team?.logo ?? raw?.team?.logos?.[0]?.href ?? null,
    score: toNumberOrNull(raw?.score),
    record: raw?.records?.[0]?.summary ?? null,
  };
}

function deriveStatus(rawStatus: any): GameStatus {
  const state = String(rawStatus?.type?.state ?? '').toLowerCase();
  const description = String(rawStatus?.type?.description ?? '').toLowerCase();
  const detail = String(rawStatus?.type?.detail ?? '').toLowerCase();

  if (description.includes('postponed') || detail.includes('postponed')) {
    return 'postponed';
  }
  if (
    description.includes('canceled') ||
    description.includes('cancelled') ||
    detail.includes('canceled') ||
    detail.includes('cancelled')
  ) {
    return 'postponed';
  }
  if (description.includes('delayed') || detail.includes('delayed')) {
    return 'delayed';
  }
  if (state === 'in') {
    return 'live';
  }
  if (state === 'post' || state === 'final') {
    return 'final';
  }
  return 'pre';
}

function deriveOutcomeLabel(rawEvent: any): 'Tie' | 'Canceled' | 'Postponed' | null {
  const rawText =
    `${rawEvent?.status?.type?.description ?? ''} ${rawEvent?.status?.type?.detail ?? ''}`.toLowerCase();
  if (rawText.includes('canceled') || rawText.includes('cancelled')) {
    return 'Canceled';
  }
  if (rawText.includes('postponed')) {
    return 'Postponed';
  }

  const competitors = rawEvent?.competitions?.[0]?.competitors ?? [];
  if (competitors.length === 2) {
    const a = toNumberOrNull(competitors[0]?.score);
    const b = toNumberOrNull(competitors[1]?.score);
    const status = deriveStatus(rawEvent?.status);
    if (status === 'final' && a !== null && b !== null && a === b) {
      return 'Tie';
    }
  }

  return null;
}

export function mapGameSummary(rawEvent: any, sport: string): GameSummaryDto {
  const competitors = rawEvent?.competitions?.[0]?.competitors ?? [];
  const homeRaw =
    competitors.find((team: any) => team?.homeAway === 'home') ?? competitors[0] ?? {};
  const awayRaw =
    competitors.find((team: any) => team?.homeAway === 'away') ?? competitors[1] ?? {};

  return {
    eventId: String(rawEvent?.id ?? ''),
    sport,
    status: deriveStatus(rawEvent?.status),
    outcomeLabel: deriveOutcomeLabel(rawEvent),
    startTimeUtc: String(rawEvent?.date ?? new Date().toISOString()),
    homeTeam: toTeamScoreDto(homeRaw),
    awayTeam: toTeamScoreDto(awayRaw),
    venue: rawEvent?.competitions?.[0]?.venue?.fullName ?? null,
  };
}

export function mapGameDetail(rawSummary: any, rawDetail: any, sport: string): GameDetailDto {
  const event = rawSummary?.header?.competitions?.[0] ? rawSummary?.header : rawSummary;
  const summary = mapGameSummary(event?.events?.[0] ?? event, sport);

  return {
    summary,
    teamStats: rawDetail?.boxscore?.teams ?? [],
    playerStats: rawDetail?.boxscore?.players ?? rawDetail?.players ?? [],
  };
}

export function mapTeams(raw: any): Array<{
  teamId: string;
  displayName: string;
  abbreviation: string;
  sport: string;
  logoUrl: string | null;
}> {
  const teams = raw?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams.map((entry: any) => ({
    teamId: String(entry?.team?.id ?? ''),
    displayName: String(entry?.team?.displayName ?? entry?.team?.name ?? 'Unknown Team'),
    abbreviation: String(entry?.team?.abbreviation ?? ''),
    sport: String(raw?.sports?.[0]?.slug ?? ''),
    logoUrl: entry?.team?.logos?.[0]?.href ?? null,
  }));
}
