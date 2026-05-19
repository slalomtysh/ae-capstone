import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../core/api.service';
import { FavoritesService } from '../../core/favorites.service';
import { TeamSelectionPageComponent } from './team-selection-page.component';

describe('TeamSelectionPageComponent', () => {
  let apiSpy: {
    getTeams: ReturnType<typeof vi.fn>;
  };
  let favoritesMock: {
    favorites: ReturnType<typeof signal>;
    maxFavorites: number;
    setFavorites: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiSpy = {
      getTeams: vi.fn(),
    };

    apiSpy.getTeams.mockReturnValue(
      of({
        data: [
          { teamId: '1', displayName: 'Buffalo Bills', abbreviation: 'BUF', sport: 'nfl', logoUrl: null },
          {
            teamId: '1',
            displayName: 'Cleveland Cavaliers',
            abbreviation: 'CLE',
            sport: 'nba',
            logoUrl: null,
          },
        ],
      }),
    );

    favoritesMock = {
      favorites: signal([
        { teamId: '1', sport: 'nfl', teamName: 'Buffalo Bills' },
        { teamId: '1', sport: 'nba', teamName: 'Cleveland Cavaliers' },
      ]),
      maxFavorites: 20,
      setFavorites: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TeamSelectionPageComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiSpy as unknown as ApiService },
        { provide: FavoritesService, useValue: favoritesMock },
      ],
    }).compileComponents();
  });

  it('preloads previously saved teams as selected by sport + teamId', () => {
    const fixture = TestBed.createComponent(TeamSelectionPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(
      component.isSelected({
        teamId: '1',
        displayName: 'Buffalo Bills',
        abbreviation: 'BUF',
        sport: 'nfl',
        logoUrl: null,
      }),
    ).toBe(true);
    expect(
      component.isSelected({
        teamId: '1',
        displayName: 'Cleveland Cavaliers',
        abbreviation: 'CLE',
        sport: 'nba',
        logoUrl: null,
      }),
    ).toBe(true);
  });

  it('saves existing selections plus newly added team without reselecting old teams', () => {
    const fixture = TestBed.createComponent(TeamSelectionPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.toggleTeam({
      teamId: '3',
      displayName: 'Seattle Seahawks',
      abbreviation: 'SEA',
      sport: 'nfl',
      logoUrl: null,
    });
    component.save();

    expect(favoritesMock.setFavorites).toHaveBeenCalledTimes(1);
    const saved = favoritesMock.setFavorites.mock.calls[0][0];
    expect(saved.some((team: { teamId: string; sport: string }) => team.teamId === '1' && team.sport === 'nfl')).toBe(true);
    expect(saved.some((team: { teamId: string; sport: string }) => team.teamId === '1' && team.sport === 'nba')).toBe(true);
    expect(saved.some((team: { teamId: string; sport: string }) => team.teamId === '3' && team.sport === 'nfl')).toBe(true);
  });

  it('persists canonical selectedSport key even if API team sport slug is generic', () => {
    const fixture = TestBed.createComponent(TeamSelectionPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.setSport('nfl');
    component.toggleTeam({
      teamId: '99',
      displayName: 'Alias Team',
      abbreviation: 'ALS',
      sport: 'football',
      logoUrl: null,
    });
    component.save();

    const saved = favoritesMock.setFavorites.mock.calls.at(-1)?.[0] ?? [];
    expect(saved.some((team: { teamId: string; sport: string }) => team.teamId === '99' && team.sport === 'nfl')).toBe(true);
  });

  it('groups NCAAF teams under conference headers', () => {
    apiSpy.getTeams.mockImplementation((sport: string) => {
      if (sport === 'ncaaf') {
        return of({
          data: [
            {
              teamId: '10',
              displayName: 'Ohio State Buckeyes',
              abbreviation: 'OSU',
              sport: 'football',
              conference: 'Big Ten',
              logoUrl: null,
            },
            {
              teamId: '11',
              displayName: 'Michigan Wolverines',
              abbreviation: 'MICH',
              sport: 'football',
              conference: 'Big Ten',
              logoUrl: null,
            },
            {
              teamId: '12',
              displayName: 'Georgia Bulldogs',
              abbreviation: 'UGA',
              sport: 'football',
              conference: 'SEC',
              logoUrl: null,
            },
          ],
        });
      }
      return of({ data: [] });
    });

    const fixture = TestBed.createComponent(TeamSelectionPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.setSport('ncaaf');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Big Ten');
    expect(text).toContain('SEC');
    expect(component.conferenceGroups().map((group) => group.conference)).toEqual(['Big Ten', 'SEC']);
  });
});
