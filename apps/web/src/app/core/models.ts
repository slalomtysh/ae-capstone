export type GameStatus = 'pre' | 'live' | 'final' | 'delayed' | 'postponed';

export interface FavoriteTeam {
  teamId: string;
  sport: string;
  teamName: string;
}

export interface TeamDto {
  teamId: string;
  displayName: string;
  abbreviation: string;
  sport: string;
  conference?: string | null;
  logoUrl: string | null;
}

export interface TeamScoreDto {
  teamId: string;
  displayName: string;
  abbreviation: string;
  logoUrl: string | null;
  score: number | null;
  record: string | null;
}

export interface GameSummaryDto {
  eventId: string;
  sport: string;
  status: GameStatus;
  outcomeLabel: 'Tie' | 'Canceled' | 'Postponed' | null;
  startTimeUtc: string;
  homeTeam: TeamScoreDto;
  awayTeam: TeamScoreDto;
  venue: string | null;
}

export interface GameDetailDto {
  summary: GameSummaryDto;
  teamStats: GameStatGroupDto[];
  playerStats: GameStatGroupDto[];
}

export interface GameStatRowDto {
  label: string;
  value: string;
}

export interface GameStatGroupDto {
  title: string;
  rows: GameStatRowDto[];
}

export interface ResponseMetaDto {
  isStale: boolean;
  lastSuccessfulRefreshUtc: string | null;
  generatedAtUtc: string;
  staleTtlMinutes: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: ResponseMetaDto;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string | null;
}

export interface ApiErrorEnvelope {
  error: ApiErrorDetail;
}
