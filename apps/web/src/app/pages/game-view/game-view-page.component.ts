import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import type { GameDetailDto, GameStatGroupDto, ResponseMetaDto } from '../../core/models';

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
  readonly teamStatGroups = computed<GameStatGroupDto[]>(() => this.detail()?.teamStats ?? []);
  readonly playerStatGroups = computed<GameStatGroupDto[]>(() => this.detail()?.playerStats ?? []);

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
}
