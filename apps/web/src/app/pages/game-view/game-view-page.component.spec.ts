import { convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { GameViewPageComponent } from './game-view-page.component';

function routeWithParams(params: Record<string, string | null>) {
  return {
    snapshot: {
      paramMap: convertToParamMap(params),
    },
  };
}

describe('GameViewPageComponent', () => {
  let apiSpy: { getGameDetail: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    apiSpy = {
      getGameDetail: vi.fn(),
    };

    apiSpy.getGameDetail.mockReturnValue(
      of({
        data: {
          summary: {
            eventId: 'evt-1',
            sport: 'nba',
            status: 'live',
            outcomeLabel: null,
            startTimeUtc: new Date().toISOString(),
            homeTeam: {
              teamId: '1',
              displayName: 'Cleveland Cavaliers',
              abbreviation: 'CLE',
              logoUrl: 'cle.png',
              score: 101,
              record: null,
            },
            awayTeam: {
              teamId: '2',
              displayName: 'Boston Celtics',
              abbreviation: 'BOS',
              logoUrl: 'bos.png',
              score: 98,
              record: null,
            },
            venue: 'Rocket Arena',
          },
          teamStats: [
            {
              title: 'Cleveland Cavaliers',
              rows: [{ label: 'FG%', value: '48.2' }],
            },
          ],
          playerStats: [
            {
              title: 'Boston Celtics - Starters',
              rows: [{ label: 'Jayson Tatum', value: 'PTS: 31 | REB: 8 | AST: 6' }],
            },
          ],
        },
        meta: {
          isStale: false,
          lastSuccessfulRefreshUtc: null,
          generatedAtUtc: new Date().toISOString(),
          staleTtlMinutes: 60,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [GameViewPageComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiSpy as unknown as ApiService },
        { provide: ActivatedRoute, useValue: routeWithParams({ sport: 'nba', eventId: 'evt-1' }) },
      ],
    }).compileComponents();
  });

  it('loads game detail from route params', () => {
    const fixture = TestBed.createComponent(GameViewPageComponent);
    const component = fixture.componentInstance;

    expect(apiSpy.getGameDetail).toHaveBeenCalledWith('nba', 'evt-1');
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.detail()?.summary.eventId).toBe('evt-1');
  });

  it('uses API-provided stat group labels for rendering', () => {
    const fixture = TestBed.createComponent(GameViewPageComponent);
    const component = fixture.componentInstance;

    expect(component.teamStatGroups().length).toBe(1);
    expect(component.teamStatGroups()[0].title).toBe('Cleveland Cavaliers');
    expect(component.teamStatGroups()[0].rows[0]).toEqual({ label: 'FG%', value: '48.2' });
    expect(component.playerStatGroups()[0].title).toBe('Boston Celtics - Starters');
  });

  it('shows not found state when route params are invalid', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GameViewPageComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiSpy as unknown as ApiService },
        { provide: ActivatedRoute, useValue: routeWithParams({ sport: null, eventId: null }) },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(GameViewPageComponent);
    const component = fixture.componentInstance;

    expect(component.notFound()).toBe(true);
    expect(component.error()).toBe('Game not found.');
    expect(apiSpy.getGameDetail).not.toHaveBeenCalled();
  });

  it('shows not found state on 404 response', () => {
    apiSpy.getGameDetail.mockReturnValue(throwError(() => ({ status: 404 })));

    const fixture = TestBed.createComponent(GameViewPageComponent);
    const component = fixture.componentInstance;

    expect(component.notFound()).toBe(true);
    expect(component.error()).toBe('Game not found.');
  });

  it('shows retry error on non-404 response', () => {
    apiSpy.getGameDetail.mockReturnValue(throwError(() => ({ status: 500 })));

    const fixture = TestBed.createComponent(GameViewPageComponent);
    const component = fixture.componentInstance;

    expect(component.notFound()).toBe(false);
    expect(component.error()).toBe('Unable to load game details.');
  });
});
