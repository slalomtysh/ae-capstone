import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { FavoritesService } from '../../core/favorites.service';
import type { FavoriteTeam, TeamDto } from '../../core/models';

interface ConferenceGroup {
  conference: string;
  teams: TeamDto[];
}

@Component({
  selector: 'app-team-selection-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './team-selection-page.component.html',
  styleUrl: './team-selection-page.component.scss',
})
export class TeamSelectionPageComponent {
  private readonly api = inject(ApiService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly router = inject(Router);

  readonly sports = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaam', 'soccer'];
  readonly selectedSport = signal('nfl');
  readonly teams = signal<TeamDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly limitMessage = signal<string | null>(null);
  readonly saveMessage = signal<string | null>(null);
  readonly selected = signal<Map<string, FavoriteTeam>>(new Map());

  readonly favorites = this.favoritesService.favorites;
  readonly isConferenceSport = computed(() => this.selectedSport() === 'ncaaf' || this.selectedSport() === 'ncaam');
  readonly conferenceGroups = computed<ConferenceGroup[]>(() => {
    if (!this.isConferenceSport()) {
      return [];
    }

    const groups = new Map<string, TeamDto[]>();
    for (const team of this.teams()) {
      const conference = this.normalizeConference(team.conference);
      if (!groups.has(conference)) {
        groups.set(conference, []);
      }
      groups.get(conference)?.push(team);
    }

    const sortedConferences = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Other') {
        return 1;
      }
      if (b === 'Other') {
        return -1;
      }
      return a.localeCompare(b);
    });

    return sortedConferences.map((conference) => ({
      conference,
      teams: (groups.get(conference) ?? []).slice().sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }));
  });

  constructor() {
    effect(() => {
      const map = new Map<string, FavoriteTeam>();
      for (const favorite of this.favorites()) {
        map.set(this.keyFor(favorite.teamId, favorite.sport), favorite);
      }
      this.selected.set(map);
    });

    this.loadTeams();
  }

  setSport(sport: string): void {
    this.selectedSport.set(sport);
    this.loadTeams();
  }

  loadTeams(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getTeams(this.selectedSport()).subscribe({
      next: (response) => {
        this.teams.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load teams right now.');
      },
    });
  }

  isSelected(team: TeamDto): boolean {
    return this.selected().has(this.keyFor(team.teamId, this.selectedSport()));
  }

  toggleTeam(team: TeamDto): void {
    const next = new Map(this.selected());
    const key = this.keyFor(team.teamId, this.selectedSport());

    if (next.has(key)) {
      next.delete(key);
      this.limitMessage.set(null);
      this.selected.set(next);
      return;
    }

    if (next.size >= this.favoritesService.maxFavorites) {
      this.limitMessage.set('You can select up to 20 teams.');
      return;
    }

    next.set(key, {
      teamId: team.teamId,
      sport: this.selectedSport(),
      teamName: team.displayName,
    });
    this.limitMessage.set(null);
    this.selected.set(next);
  }

  save(): void {
    this.favoritesService.setFavorites(Array.from(this.selected().values()));
    this.saveMessage.set('Favorites saved.');
    setTimeout(() => this.router.navigate(['/']), 250);
  }

  private keyFor(teamId: string, sport: string): string {
    return `${sport.toLowerCase()}:${teamId}`;
  }

  private normalizeConference(conference: string | null | undefined): string {
    const value = conference?.trim();
    return value && value.length > 0 ? value : 'Other';
  }
}
