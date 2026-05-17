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
  teamStats: unknown[];
  playerStats: unknown[];
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
