import type {
  GameDetailDto,
  GameStatGroupDto,
  GameStatus,
  GameSummaryDto,
  TeamScoreDto,
} from '../types.js';

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

function toText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}

function toStatValue(raw: any): string {
  const preferred = raw?.displayValue ?? raw?.formatted ?? raw?.summary ?? raw?.value;
  if (preferred !== undefined && preferred !== null && String(preferred).trim() !== '') {
    return String(preferred);
  }
  return '-';
}

function toTeamStatGroups(rawTeams: any[]): GameStatGroupDto[] {
  return rawTeams
    .map((teamBlock: any, index): GameStatGroupDto => {
      const teamName = toText(
        teamBlock?.team?.displayName ?? teamBlock?.team?.name,
        `Team ${index + 1}`,
      );
      const statistics = Array.isArray(teamBlock?.statistics) ? teamBlock.statistics : [];
      const rows = statistics.map((stat: any, rowIndex: number) => ({
        label: toText(
          stat?.displayName ?? stat?.label ?? stat?.name ?? stat?.abbreviation,
          `Stat ${rowIndex + 1}`,
        ),
        value: toStatValue(stat),
      }));

      return {
        title: teamName,
        rows,
      };
    })
    .filter((group) => group.rows.length > 0);
}

function summarizeAthleteStats(athleteEntry: any, labels: string[]): string {
  const stats = Array.isArray(athleteEntry?.stats) ? athleteEntry.stats : [];
  if (stats.length === 0) {
    return '-';
  }

  if (labels.length > 0 && labels.length === stats.length) {
    return labels.map((label, index) => `${label}: ${stats[index]}`).join(' | ');
  }

  return stats.join(' | ');
}

function toPlayerStatGroups(rawPlayers: any[]): GameStatGroupDto[] {
  const groups: GameStatGroupDto[] = [];

  for (const playerBlock of rawPlayers) {
    const teamName = toText(playerBlock?.team?.displayName ?? playerBlock?.team?.name, 'Team');
    const categories = Array.isArray(playerBlock?.statistics) ? playerBlock.statistics : [];

    for (const category of categories) {
      const categoryName = toText(
        category?.displayName ?? category?.name ?? category?.abbreviation,
        'Player Stats',
      );
      const labels = Array.isArray(category?.labels)
        ? category.labels.map((label: unknown) => toText(label)).filter(Boolean)
        : [];
      const athletes = Array.isArray(category?.athletes) ? category.athletes : [];

      const rows = athletes
        .map((athlete: any, index: number) => ({
          label: toText(
            athlete?.athlete?.displayName ?? athlete?.athlete?.shortName ?? athlete?.athlete?.name,
            `Player ${index + 1}`,
          ),
          value: summarizeAthleteStats(athlete, labels),
        }))
        .filter((row) => row.label && row.value);

      if (rows.length > 0) {
        groups.push({
          title: `${teamName} - ${categoryName}`,
          rows,
        });
      }
    }
  }

  return groups;
}

export function mapGameDetail(rawSummary: any, rawDetail: any, sport: string): GameDetailDto {
  const event = rawSummary?.header?.competitions?.[0] ? rawSummary?.header : rawSummary;
  const summary = mapGameSummary(event?.events?.[0] ?? event, sport);
  const rawTeamStats = Array.isArray(rawDetail?.boxscore?.teams) ? rawDetail.boxscore.teams : [];
  const rawPlayerStats = Array.isArray(rawDetail?.boxscore?.players)
    ? rawDetail.boxscore.players
    : Array.isArray(rawDetail?.players)
      ? rawDetail.players
      : [];

  return {
    summary,
    teamStats: toTeamStatGroups(rawTeamStats),
    playerStats: toPlayerStatGroups(rawPlayerStats),
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
