import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../core/api.service';
import { FavoritesService } from '../../core/favorites.service';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  let apiSpy: {
    getLiveGames: ReturnType<typeof vi.fn>;
    getUpcomingGames: ReturnType<typeof vi.fn>;
    getRecentGames: ReturnType<typeof vi.fn>;
  };
  let favoritesMock: { favorites: ReturnType<typeof signal> };

  beforeEach(async () => {
    apiSpy = {
      getLiveGames: vi.fn(),
      getUpcomingGames: vi.fn(),
      getRecentGames: vi.fn(),
    };

    apiSpy.getLiveGames.mockReturnValue(of({ data: [], meta: { isStale: false } as any }));
    apiSpy.getUpcomingGames.mockReturnValue(of({ data: [], meta: { isStale: false } as any }));
    apiSpy.getRecentGames.mockReturnValue(of({ data: [], meta: { isStale: false } as any }));

    favoritesMock = {
      favorites: signal([{ teamId: '1', sport: 'nfl', teamName: 'Team One' }]),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiSpy as unknown as ApiService },
        { provide: FavoritesService, useValue: favoritesMock },
      ],
    }).compileComponents();
  });

  it('refreshes all three sections on init', () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.componentInstance.refreshNow();

    expect(apiSpy.getLiveGames).toHaveBeenCalled();
    expect(apiSpy.getUpcomingGames).toHaveBeenCalled();
    expect(apiSpy.getRecentGames).toHaveBeenCalled();
  });

  it('sets error signal when refresh fails', () => {
    apiSpy.getLiveGames.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = TestBed.createComponent(HomePageComponent);
    const component = fixture.componentInstance;

    component.refreshNow();
    expect(component.error()).toContain('Unable to refresh games right now');
  });

  it('does not call api when favorites are empty', () => {
    favoritesMock.favorites.set([]);

    const fixture = TestBed.createComponent(HomePageComponent);
    const component = fixture.componentInstance;

    component.refreshNow();

    expect(apiSpy.getLiveGames).not.toHaveBeenCalled();
    expect(apiSpy.getUpcomingGames).not.toHaveBeenCalled();
    expect(apiSpy.getRecentGames).not.toHaveBeenCalled();
  });
});
