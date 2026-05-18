import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import type { GameDetailDto, ResponseMetaDto } from '../../core/models';

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
  readonly detail = signal<GameDetailDto | null>(null);
  readonly meta = signal<ResponseMetaDto | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const eventId = this.route.snapshot.paramMap.get('eventId');
    const sport = this.route.snapshot.paramMap.get('sport');

    if (!eventId || !sport) {
      this.loading.set(false);
      this.error.set('Invalid game route.');
      return;
    }

    this.api.getGameDetail(sport, eventId).subscribe({
      next: (response) => {
        this.detail.set(response.data);
        this.meta.set(response.meta);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load game details.');
        this.loading.set(false);
      },
    });
  }
}
