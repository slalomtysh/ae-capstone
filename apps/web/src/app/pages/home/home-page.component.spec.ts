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

    expect(apiSpy.getLiveGames).toHaveBeenCalledWith(['nfl:1'], ['nfl']);
    expect(apiSpy.getUpcomingGames).toHaveBeenCalled();
    expect(apiSpy.getRecentGames).toHaveBeenCalled();
  });

  it('sets error signal when refresh fails', () => {
    apiSpy.getLiveGames.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = TestBed.createComponent(HomePageComponent);
    const component = fixture.componentInstance;

    component.refreshNow();
    expect(component.error()).toBeNull();
    expect(component.liveError()).toContain("Today's games");
  });

  it('sets global error only when all sections fail', () => {
    apiSpy.getLiveGames.mockReturnValue(throwError(() => new Error('boom-live')));
    apiSpy.getUpcomingGames.mockReturnValue(throwError(() => new Error('boom-upcoming')));
    apiSpy.getRecentGames.mockReturnValue(throwError(() => new Error('boom-recent')));

    const fixture = TestBed.createComponent(HomePageComponent);
    const component = fixture.componentInstance;

    component.refreshNow();

    expect(component.error()).toContain('Unable to refresh games right now');
    expect(component.liveError()).toContain("Today's games");
    expect(component.upcomingError()).toContain('Upcoming games');
    expect(component.recentError()).toContain('Recent games');
  });

  it('keeps successful sections when one section fails', () => {
    apiSpy.getLiveGames.mockReturnValue(
      of({
        data: [
          {
            eventId: 'evt-1',
            sport: 'nfl',
            status: 'live',
            outcomeLabel: null,
            startTimeUtc: '2026-05-19T00:00:00.000Z',
            homeTeam: {
              teamId: 'h1',
              displayName: 'Home',
              abbreviation: 'H',
              logoUrl: null,
              score: 7,
              record: null,
            },
            awayTeam: {
              teamId: 'a1',
              displayName: 'Away',
              abbreviation: 'A',
              logoUrl: null,
              score: 3,
              record: null,
            },
            venue: null,
          },
        ],
        meta: { isStale: false } as any,
      }),
    );
    apiSpy.getUpcomingGames.mockReturnValue(throwError(() => new Error('boom-upcoming')));
    apiSpy.getRecentGames.mockReturnValue(of({ data: [], meta: { isStale: false } as any }));

    const fixture = TestBed.createComponent(HomePageComponent);
    const component = fixture.componentInstance;

    component.refreshNow();

    expect(component.error()).toBeNull();
    expect(component.live().length).toBe(1);
    expect(component.upcomingError()).toContain('Upcoming games');
    expect(component.recentError()).toBeNull();
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

  it("renders Today's Games and My Teams when favorites exist", () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain("Today's Games");
    expect(text).toContain('Upcoming Games');
    expect(text).toContain('Recent Games');
    expect(text).toContain('My Teams');
  });

  it('groups favorites by league in team-selection order', () => {
    favoritesMock.favorites.set([
      { teamId: '5', sport: 'soccer', teamName: 'Sounders FC' },
      { teamId: '2', sport: 'nba', teamName: 'Bulls' },
      { teamId: '1', sport: 'nfl', teamName: 'Bills' },
      { teamId: '3', sport: 'nhl', teamName: 'Kraken' },
    ]);

    const fixture = TestBed.createComponent(HomePageComponent);
    const component = fixture.componentInstance;

    expect(component.favoriteGroups().map((group) => group.sport)).toEqual([
      'nfl',
      'nba',
      'nhl',
      'soccer',
    ]);
  });

  it('renders edit teams link inside My Teams when favorites are empty', () => {
    favoritesMock.favorites.set([]);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('.my-teams-empty-link');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('edit teams');
  });

  it('maps malformed nlh favorites to nhl requests', () => {
    favoritesMock.favorites.set([{ teamId: '10', sport: 'nlh', teamName: 'Canadiens' }]);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.componentInstance.refreshNow();

    expect(apiSpy.getLiveGames).toHaveBeenCalledWith(['nhl:10'], ['nhl']);
  });
});
