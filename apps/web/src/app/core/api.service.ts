import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { ApiResponse, GameDetailDto, GameSummaryDto, TeamDto } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiBase = '/api';

  constructor(private readonly http: HttpClient) {}

  getTeams(sport: string) {
    const params = new HttpParams().set('sport', sport);
    return this.http.get<ApiResponse<TeamDto[]>>(`${this.apiBase}/teams`, { params });
  }

  getLiveGames(teamIds: string[], sports: string[]) {
    const params = new HttpParams()
      .set('teamIds', teamIds.join(','))
      .set('sports', sports.join(','));
    return this.http.get<ApiResponse<GameSummaryDto[]>>(`${this.apiBase}/games/live`, { params });
  }

  getRecentGames(teamIds: string[], sports: string[], days = 7) {
    const params = new HttpParams()
      .set('teamIds', teamIds.join(','))
      .set('sports', sports.join(','))
      .set('days', String(days));
    return this.http.get<ApiResponse<GameSummaryDto[]>>(`${this.apiBase}/games/recent`, { params });
  }

  getGameDetail(sport: string, eventId: string) {
    const params = new HttpParams().set('sport', sport);
    return this.http.get<ApiResponse<GameDetailDto>>(`${this.apiBase}/games/${eventId}`, { params });
  }
}
