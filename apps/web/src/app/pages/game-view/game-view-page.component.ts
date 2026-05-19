import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import type { GameDetailDto, ResponseMetaDto } from '../../core/models';

interface StatRow {
  label: string;
  value: string;
}

interface StatGroupView {
  title: string;
  rows: StatRow[];
}

@Component({
  selector: 'app-game-view-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './game-view-page.component.html',
  styleUrl: './game-view-page.component.scss',
})
export class GameViewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly detail = signal<GameDetailDto | null>(null);
  readonly meta = signal<ResponseMetaDto | null>(null);
  readonly teamStatGroups = computed(() => this.normalizeStatGroups(this.detail()?.teamStats ?? [], 'Team'));
  readonly playerStatGroups = computed(() =>
    this.normalizeStatGroups(this.detail()?.playerStats ?? [], 'Player'),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);

    const eventId = this.route.snapshot.paramMap.get('eventId');
    const sport = this.route.snapshot.paramMap.get('sport');

    if (!eventId || !sport) {
      this.loading.set(false);
      this.notFound.set(true);
      this.error.set('Game not found.');
      return;
    }

    this.api.getGameDetail(sport, eventId).subscribe({
      next: (response) => {
        this.detail.set(response.data);
        this.meta.set(response.meta);
        this.loading.set(false);
      },
      error: (err: { status?: number }) => {
        if (err?.status === 404) {
          this.notFound.set(true);
          this.error.set('Game not found.');
        } else {
          this.error.set('Unable to load game details.');
        }
        this.loading.set(false);
      },
    });
  }

  private normalizeStatGroups(rawGroups: unknown[], fallbackPrefix: string): StatGroupView[] {
    return rawGroups.map((group, index) => this.normalizeStatGroup(group, `${fallbackPrefix} Group ${index + 1}`));
  }

  private normalizeStatGroup(rawGroup: unknown, fallbackTitle: string): StatGroupView {
    const group = (rawGroup ?? {}) as Record<string, unknown>;
    const title = this.valueToString(
      group['displayName'] ?? group['name'] ?? group['title'] ?? group['type'] ?? fallbackTitle,
      fallbackTitle,
    );

    const statsCandidate = Array.isArray(group['statistics'])
      ? group['statistics']
      : Array.isArray(group['stats'])
        ? group['stats']
        : null;

    if (statsCandidate) {
      return {
        title,
        rows: statsCandidate.map((stat, index) => this.normalizeStatRow(stat, index + 1)),
      };
    }

    if (Array.isArray(rawGroup)) {
      return {
        title,
        rows: rawGroup.map((entry, index) => this.normalizeStatRow(entry, index + 1)),
      };
    }

    const scalarRows = Object.entries(group)
      .filter(([key, value]) => {
        if (['statistics', 'stats', 'displayName', 'name', 'title', 'type'].includes(key)) {
          return false;
        }
        return typeof value !== 'object' || value === null;
      })
      .map(([key, value]) => ({
        label: this.humanizeKey(key),
        value: this.valueToString(value),
      }));

    return {
      title,
      rows:
        scalarRows.length > 0
          ? scalarRows
          : [
              {
                label: 'Value',
                value: this.valueToString(rawGroup),
              },
            ],
    };
  }

  private normalizeStatRow(rawStat: unknown, fallbackIndex: number): StatRow {
    const stat = (rawStat ?? {}) as Record<string, unknown>;
    const label = this.valueToString(
      stat['label'] ??
        stat['displayName'] ??
        stat['name'] ??
        stat['abbreviation'] ??
        stat['key'] ??
        `Stat ${fallbackIndex}`,
      `Stat ${fallbackIndex}`,
    );
    const value = this.valueToString(
      stat['displayValue'] ?? stat['formatted'] ?? stat['value'] ?? stat['summary'] ?? '-',
    );
    return { label, value };
  }

  private humanizeKey(value: string): string {
    return value
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^./, (char) => char.toUpperCase())
      .trim();
  }

  private valueToString(value: unknown, fallback = '-'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
}
