import { FavoritesService } from './favorites.service';
import { vi } from 'vitest';

describe('FavoritesService', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let getItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
  });

  it('adds and removes favorites', () => {
    const service = new FavoritesService();
    service.setFavorites([
      { teamId: '1', sport: 'nfl', teamName: 'Team 1' },
      { teamId: '2', sport: 'nba', teamName: 'Team 2' },
    ]);

    expect(service.favorites().length).toBe(2);

    service.toggleFavorite({ teamId: '1', sport: 'nfl', teamName: 'Team 1' });

    expect(service.favorites().length).toBe(1);
    expect(service.isFavorite('2')).toBe(true);
    expect(service.isFavorite('1')).toBe(false);
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('enforces 20-team cap', () => {
    const service = new FavoritesService();
    const teams = Array.from({ length: 20 }, (_, i) => ({
      teamId: String(i + 1),
      sport: 'nfl',
      teamName: `Team ${i + 1}`,
    }));

    service.setFavorites(teams);
    expect(service.favorites().length).toBe(20);

    service.toggleFavorite({ teamId: '21', sport: 'nba', teamName: 'Team 21' });
    expect(service.favorites().length).toBe(20);
  });

  it('loads favorites from storage on startup', () => {
    getItemSpy.mockReturnValue(JSON.stringify([{ teamId: '7', sport: 'mlb', teamName: 'Team 7' }]));

    const service = new FavoritesService();
    expect(service.favorites().length).toBe(1);
    expect(service.favorites()[0].teamId).toBe('7');
  });

  it('normalizes legacy sport aliases loaded from storage', () => {
    getItemSpy.mockReturnValue(
      JSON.stringify([
        { teamId: '7', sport: 'football', teamName: 'Legacy Football Team' },
        { teamId: '8', sport: 'basketball', teamName: 'Legacy Basketball Team' },
      ]),
    );

    const service = new FavoritesService();
    expect(service.isFavorite('7', 'nfl')).toBe(true);
    expect(service.isFavorite('8', 'nba')).toBe(true);
  });

  it('normalizes malformed nlh alias loaded from storage', () => {
    getItemSpy.mockReturnValue(
      JSON.stringify([{ teamId: '10', sport: 'nlh', teamName: 'Legacy NHL Team' }]),
    );

    const service = new FavoritesService();
    expect(service.isFavorite('10', 'nhl')).toBe(true);
    expect(service.favorites()[0].sport).toBe('nhl');
  });

  it('treats same teamId in different sports as distinct favorites', () => {
    const service = new FavoritesService();

    service.setFavorites([
      { teamId: '1', sport: 'nfl', teamName: 'Bills' },
      { teamId: '1', sport: 'nba', teamName: 'Cavaliers' },
    ]);

    expect(service.isFavorite('1', 'nfl')).toBe(true);
    expect(service.isFavorite('1', 'nba')).toBe(true);

    service.toggleFavorite({ teamId: '1', sport: 'nfl', teamName: 'Bills' });

    expect(service.isFavorite('1', 'nfl')).toBe(false);
    expect(service.isFavorite('1', 'nba')).toBe(true);
    expect(service.favorites().length).toBe(1);
    expect(service.favorites()[0].teamName).toBe('Cavaliers');
  });
});
