import { Injectable, signal } from '@angular/core';
import type { FavoriteTeam } from './models';

const STORAGE_KEY = 'favorites.v1';
const MAX_FAVORITES = 20;

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly favorites = signal<FavoriteTeam[]>(this.readInitialFavorites());
  readonly storageError = signal<string | null>(null);

  get maxFavorites(): number {
    return MAX_FAVORITES;
  }

  setFavorites(favorites: FavoriteTeam[]): void {
    const normalized = favorites.slice(0, MAX_FAVORITES);
    this.favorites.set(normalized);
    this.persist();
  }

  isFavorite(teamId: string): boolean {
    return this.favorites().some((team) => team.teamId === teamId);
  }

  toggleFavorite(team: FavoriteTeam): { ok: boolean; reason?: string } {
    const current = this.favorites();
    const exists = current.some((favorite) => favorite.teamId === team.teamId);

    if (exists) {
      const next = current.filter((favorite) => favorite.teamId !== team.teamId);
      this.favorites.set(next);
      this.persist();
      return { ok: true };
    }

    if (current.length >= MAX_FAVORITES) {
      return { ok: false, reason: `You can select up to ${MAX_FAVORITES} teams.` };
    }

    this.favorites.set([...current, team]);
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
      return parsed.slice(0, MAX_FAVORITES);
    } catch {
      this.storageError.set('Local storage is unavailable. Favorites will not persist.');
      return [];
    }
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
