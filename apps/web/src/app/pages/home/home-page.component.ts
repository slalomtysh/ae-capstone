import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { FavoritesService } from '../../core/favorites.service';
import type { ApiResponse, GameSummaryDto } from '../../core/models';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly api = inject(ApiService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly favorites = this.favoritesService.favorites;
  readonly live = signal<GameSummaryDto[]>([]);
  readonly upcoming = signal<GameSummaryDto[]>([]);
  readonly recent = signal<GameSummaryDto[]>([]);
  readonly liveMeta = signal<ApiResponse<GameSummaryDto[]>['meta'] | null>(null);
  readonly upcomingMeta = signal<ApiResponse<GameSummaryDto[]>['meta'] | null>(null);
  readonly recentMeta = signal<ApiResponse<GameSummaryDto[]>['meta'] | null>(null);
  readonly error = signal<string | null>(null);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const favorites = this.favorites();
      this.stopRefreshTimer();
      this.error.set(null);

      if (favorites.length === 0) {
        this.live.set([]);
        this.upcoming.set([]);
        this.recent.set([]);
        return;
      }

      this.refreshNow();
      this.refreshTimer = setInterval(() => this.refreshNow(), 30000);
    });

    this.destroyRef.onDestroy(() => this.stopRefreshTimer());
  }

  refreshNow(): void {
    const favorites = this.favorites();
    if (favorites.length === 0) {
      return;
    }

    const teamIds = favorites.map((team) => team.teamId);
    const sports = [...new Set(favorites.map((team) => team.sport.toLowerCase()))];

    forkJoin({
      live: this.api.getLiveGames(teamIds, sports),
      upcoming: this.api.getUpcomingGames(teamIds, sports),
      recent: this.api.getRecentGames(teamIds, sports, 7),
    }).subscribe({
      next: ({ live, upcoming, recent }) => {
        this.error.set(null);
        this.live.set(live.data);
        this.upcoming.set(upcoming.data);
        this.recent.set(recent.data);
        this.liveMeta.set(live.meta);
        this.upcomingMeta.set(upcoming.meta);
        this.recentMeta.set(recent.meta);
      },
      error: () => {
        this.error.set('Unable to refresh games right now. Please try again.');
      },
    });
  }

  openGame(game: GameSummaryDto): void {
    this.router.navigate(['/games', game.sport, game.eventId]);
  }

  sportIcon(sport: string): string {
    const key = sport.toLowerCase();
    if (key === 'nfl' || key === 'ncaaf') {
      return '🏈';
    }
    if (key === 'nba' || key === 'ncaam') {
      return '🏀';
    }
    if (key === 'mlb') {
      return '⚾';
    }
    if (key === 'nhl') {
      return '🏒';
    }
    if (key === 'soccer') {
      return '⚽';
    }
    return '🎯';
  }

  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
