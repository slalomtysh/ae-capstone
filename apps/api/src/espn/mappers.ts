import type { GameDetailDto, GameStatus, GameSummaryDto, TeamScoreDto } from '../types.js';

const INVALID_DATE_FALLBACK_ISO = '1970-01-01T00:00:00.000Z';

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

function normalizeUpstreamTimestamp(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return raw;
  }

  // ESPN can emit timestamps without timezone suffix; treat those as UTC.
  const isoWithoutTimezone =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(raw);
  if (isoWithoutTimezone) {
    return `${raw}Z`;
  }

  // Normalize date-only values to UTC midnight.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if (dateOnly) {
    return `${raw}T00:00:00.000Z`;
  }

  return raw;
}

export function toUtcIsoString(value: unknown): string {
  const normalizedValue = normalizeUpstreamTimestamp(String(value ?? ''));
  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) {
    return INVALID_DATE_FALLBACK_ISO;
  }
  return parsed.toISOString();
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
    startTimeUtc: toUtcIsoString(rawEvent?.date),
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
  conference: string | null;
  logoUrl: string | null;
}>;

export function mapTeams(
  raw: any,
  conferenceByTeamId: ReadonlyMap<string, string> = new Map(),
): Array<{
  teamId: string;
  displayName: string;
  abbreviation: string;
  sport: string;
  conference: string | null;
  logoUrl: string | null;
}> {
  const sports = raw?.sports ?? [];
  const allTeams = sports.flatMap((sportEntry: any) =>
    (sportEntry?.leagues ?? []).flatMap((leagueEntry: any) => leagueEntry?.teams ?? []),
  );
  const byId = new Map<
    string,
    {
      teamId: string;
      displayName: string;
      abbreviation: string;
      sport: string;
      conference: string | null;
      logoUrl: string | null;
    }
  >();

  for (const entry of allTeams) {
    const teamId = String(entry?.team?.id ?? '');
    if (!teamId || byId.has(teamId)) {
      continue;
    }
    byId.set(teamId, {
      teamId,
      displayName: String(entry?.team?.displayName ?? entry?.team?.name ?? 'Unknown Team'),
      abbreviation: String(entry?.team?.abbreviation ?? ''),
      sport: String(sports?.[0]?.slug ?? ''),
      conference:
        conferenceByTeamId.get(teamId) ??
        entry?.team?.groups?.[0]?.name ??
        entry?.team?.groups?.[0]?.shortName ??
        entry?.groups?.[0]?.name ??
        null,
      logoUrl: entry?.team?.logos?.[0]?.href ?? null,
    });
  }

  return Array.from(byId.values());
}

export function mapConferenceByTeamIdFromStandings(raw: any): Map<string, string> {
  const byTeamId = new Map<string, string>();

  const visit = (node: any): void => {
    if (!node || typeof node !== 'object') {
      return;
    }

    const conferenceName =
      typeof node.name === 'string' && node.name.trim().length > 0 ? node.name.trim() : null;
    const entries = node?.standings?.entries ?? [];
    if (conferenceName && Array.isArray(entries)) {
      for (const entry of entries) {
        const teamId = String(entry?.team?.id ?? '').trim();
        if (teamId && !byTeamId.has(teamId)) {
          byTeamId.set(teamId, conferenceName);
        }
      }
    }

    const children = node?.children ?? [];
    if (Array.isArray(children)) {
      for (const child of children) {
        visit(child);
      }
    }
  };

  visit(raw);
  return byTeamId;
}
