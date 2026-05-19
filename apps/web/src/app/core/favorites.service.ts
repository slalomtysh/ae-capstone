import { Injectable, signal } from '@angular/core';
import type { FavoriteTeam } from './models';

const STORAGE_KEY = 'favorites.v1';
const MAX_FAVORITES = 20;
const SUPPORTED_SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaam', 'soccer'] as const;

const SPORT_ALIASES: Record<string, (typeof SUPPORTED_SPORTS)[number]> = {
  football: 'nfl',
  basketball: 'nba',
  baseball: 'mlb',
  hockey: 'nhl',
  nlh: 'nhl',
};

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly favorites = signal<FavoriteTeam[]>(this.readInitialFavorites());
  readonly storageError = signal<string | null>(null);

  get maxFavorites(): number {
    return MAX_FAVORITES;
  }

  setFavorites(favorites: FavoriteTeam[]): void {
    const normalized = this.normalizeFavorites(favorites);
    this.favorites.set(normalized);
    this.persist();
  }

  isFavorite(teamId: string, sport?: string): boolean {
    const normalizedSport = sport ? this.normalizeSport(sport) : null;
    return this.favorites().some(
      (team) => team.teamId === teamId && (normalizedSport ? team.sport === normalizedSport : true),
    );
  }

  toggleFavorite(team: FavoriteTeam): { ok: boolean; reason?: string } {
    const normalizedTeam = { ...team, sport: this.normalizeSport(team.sport) };
    const current = this.favorites();
    const sameFavorite = (favorite: FavoriteTeam) =>
      favorite.teamId === normalizedTeam.teamId && favorite.sport === normalizedTeam.sport;
    const exists = current.some(sameFavorite);

    if (exists) {
      const next = current.filter((favorite) => !sameFavorite(favorite));
      this.favorites.set(next);
      this.persist();
      return { ok: true };
    }

    if (current.length >= MAX_FAVORITES) {
      return { ok: false, reason: `You can select up to ${MAX_FAVORITES} teams.` };
    }

    this.favorites.set(this.normalizeFavorites([...current, normalizedTeam]));
    this.persist();
    return { ok: true };
  }

  private readInitialFavorites(): FavoriteTeam[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as FavoriteTeam[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return this.normalizeFavorites(parsed);
    } catch {
      this.storageError.set('Local storage is unavailable. Favorites will not persist.');
      return [];
    }
  }

  private normalizeFavorites(favorites: FavoriteTeam[]): FavoriteTeam[] {
    const byKey = new Map<string, FavoriteTeam>();
    for (const favorite of favorites) {
      const normalized: FavoriteTeam = {
        ...favorite,
        sport: this.normalizeSport(favorite.sport),
      };
      const key = `${normalized.sport}:${normalized.teamId}`;
      byKey.set(key, normalized);
      if (byKey.size >= MAX_FAVORITES) {
        break;
      }
    }
    return Array.from(byKey.values());
  }

  private normalizeSport(sport: string): string {
    const key = sport.toLowerCase();
    if ((SUPPORTED_SPORTS as readonly string[]).includes(key)) {
      return key;
    }
    return SPORT_ALIASES[key] ?? key;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favorites()));
      this.storageError.set(null);
    } catch {
      this.storageError.set('Local storage is unavailable. Favorites will not persist.');
    }
  }
}
