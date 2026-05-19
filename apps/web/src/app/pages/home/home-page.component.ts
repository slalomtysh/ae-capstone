import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { FavoritesService } from '../../core/favorites.service';
import type {
  ApiErrorEnvelope,
  ApiResponse,
  FavoriteTeam,
  GameSummaryDto,
} from '../../core/models';

const LEAGUE_ORDER = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaam', 'soccer'] as const;
type LeagueKey = (typeof LEAGUE_ORDER)[number];

interface FavoriteGroup {
  sport: LeagueKey;
  label: string;
  teams: FavoriteTeam[];
}

type SectionKey = 'live' | 'upcoming' | 'recent';

interface RefreshContext {
  teamIds: string[];
  sports: LeagueKey[];
}

type SectionResult =
  | {
      section: SectionKey;
      ok: true;
      response: ApiResponse<GameSummaryDto[]>;
    }
  | {
      section: SectionKey;
      ok: false;
      message: string;
    };

const SPORT_ALIASES: Record<string, LeagueKey> = {
  football: 'nfl',
  basketball: 'nba',
  baseball: 'mlb',
  hockey: 'nhl',
  nlh: 'nhl',
};

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly leagueOrder = LEAGUE_ORDER;
  private readonly leagueLabels: Record<LeagueKey, string> = {
    nfl: 'NFL',
    nba: 'NBA',
    mlb: 'MLB',
    nhl: 'NHL',
    ncaaf: 'NCAA Football',
    ncaam: 'NCAA Basketball',
    soccer: 'Soccer',
  };

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
  readonly liveLoading = signal(false);
  readonly upcomingLoading = signal(false);
  readonly recentLoading = signal(false);
  readonly liveError = signal<string | null>(null);
  readonly upcomingError = signal<string | null>(null);
  readonly recentError = signal<string | null>(null);
  readonly favoriteGroups = computed<FavoriteGroup[]>(() => {
    const favorites = this.favorites();

    return this.leagueOrder
      .map((sport) => {
        const teams = favorites
          .filter((favorite) => this.toLeagueKey(favorite.sport) === sport)
          .slice()
          .sort((a, b) => a.teamName.localeCompare(b.teamName));

        if (teams.length === 0) {
          return null;
        }

        return {
          sport,
          label: this.leagueLabels[sport],
          teams,
        };
      })
      .filter((group): group is FavoriteGroup => group !== null);
  });

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
        this.liveError.set(null);
        this.upcomingError.set(null);
        this.recentError.set(null);
        this.liveLoading.set(false);
        this.upcomingLoading.set(false);
        this.recentLoading.set(false);
        return;
      }

      this.refreshNow();
      this.refreshTimer = setInterval(() => this.refreshNow(), 30000);
    });

    this.destroyRef.onDestroy(() => this.stopRefreshTimer());
  }

  refreshNow(): void {
    const context = this.buildRefreshContext();
    if (!context) {
      return;
    }

    this.setSectionLoading('live', true);
    this.setSectionLoading('upcoming', true);
    this.setSectionLoading('recent', true);
    this.liveError.set(null);
    this.upcomingError.set(null);
    this.recentError.set(null);

    forkJoin([
      this.runSectionRequest('live', context),
      this.runSectionRequest('upcoming', context),
      this.runSectionRequest('recent', context),
    ]).subscribe((results) => {
      this.error.set(null);

      let failed = 0;
      for (const result of results) {
        if (!result.ok) {
          failed += 1;
        }
        this.applySectionResult(result);
      }

      this.setSectionLoading('live', false);
      this.setSectionLoading('upcoming', false);
      this.setSectionLoading('recent', false);

      if (failed === 3) {
        this.error.set('Unable to refresh games right now. Please try again.');
      }
    });
  }

  retrySection(section: SectionKey): void {
    const context = this.buildRefreshContext();
    if (!context) {
      return;
    }

    this.setSectionLoading(section, true);
    this.setSectionError(section, null);

    this.runSectionRequest(section, context).subscribe((result) => {
      this.applySectionResult(result);
      this.setSectionLoading(section, false);

      if (result.ok) {
        this.error.set(null);
      }
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

  private buildRefreshContext(): RefreshContext | null {
    const favorites = this.favorites();
    if (favorites.length === 0) {
      return null;
    }

    const teamIds = favorites.map((team) => {
      const sport = this.toLeagueKey(team.sport) ?? team.sport.toLowerCase();
      return `${sport}:${team.teamId}`;
    });
    const sports = [
      ...new Set(
        favorites
          .map((team) => this.toLeagueKey(team.sport))
          .filter((sport): sport is LeagueKey => sport !== null),
      ),
    ];

    if (sports.length === 0) {
      this.live.set([]);
      this.upcoming.set([]);
      this.recent.set([]);
      this.liveError.set(null);
      this.upcomingError.set(null);
      this.recentError.set(null);
      this.error.set(null);
      return null;
    }

    return { teamIds, sports };
  }

  private runSectionRequest(section: SectionKey, context: RefreshContext) {
    const request$ =
      section === 'live'
        ? this.api.getLiveGames(context.teamIds, context.sports)
        : section === 'upcoming'
          ? this.api.getUpcomingGames(context.teamIds, context.sports)
          : this.api.getRecentGames(context.teamIds, context.sports, 7);

    return request$.pipe(
      map(
        (response): SectionResult => ({
          section,
          ok: true,
          response,
        }),
      ),
      catchError((error: unknown) =>
        of({
          section,
          ok: false,
          message: this.toUserError(section, error),
        } as const),
      ),
    );
  }

  private applySectionResult(result: SectionResult): void {
    if (result.ok === false) {
      this.setSectionError(result.section, result.message);
      return;
    }

    if (result.section === 'live') {
      this.live.set(result.response.data);
      this.liveMeta.set(result.response.meta);
    } else if (result.section === 'upcoming') {
      this.upcoming.set(result.response.data);
      this.upcomingMeta.set(result.response.meta);
    } else {
      this.recent.set(result.response.data);
      this.recentMeta.set(result.response.meta);
    }

    this.setSectionError(result.section, null);
  }

  private setSectionLoading(section: SectionKey, value: boolean): void {
    if (section === 'live') {
      this.liveLoading.set(value);
    } else if (section === 'upcoming') {
      this.upcomingLoading.set(value);
    } else {
      this.recentLoading.set(value);
    }
  }

  private setSectionError(section: SectionKey, value: string | null): void {
    if (section === 'live') {
      this.liveError.set(value);
    } else if (section === 'upcoming') {
      this.upcomingError.set(value);
    } else {
      this.recentError.set(value);
    }
  }

  private toUserError(section: SectionKey, error: unknown): string {
    const label = section === 'live' ? "Today's" : section === 'upcoming' ? 'Upcoming' : 'Recent';
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as ApiErrorEnvelope | null;
      const backendMessage = payload?.error?.message;
      const backendCode = payload?.error?.code;
      const requestId = payload?.error?.requestId;

      console.warn(`[home] ${section} request failed`, {
        status: error.status,
        backendCode,
        backendMessage,
        requestId,
      });

      if (backendMessage) {
        return `${label} games: ${backendMessage}`;
      }
    } else {
      console.warn(`[home] ${section} request failed`, { cause: String(error) });
    }

    return `${label} games are unavailable right now.`;
  }

  private toLeagueKey(sport: string): LeagueKey | null {
    const key = sport.toLowerCase();
    if ((this.leagueOrder as readonly string[]).includes(key)) {
      return key as LeagueKey;
    }
    return SPORT_ALIASES[key] ?? null;
  }
}
