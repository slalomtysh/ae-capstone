import { describe, expect, it } from 'vitest';
import { mapGameDetail, toUtcIsoString } from '../src/espn/mappers.js';

describe('toUtcIsoString', () => {
  it('treats timezone-less ISO timestamps as UTC', () => {
    const result = toUtcIsoString('2026-05-18T21:00');
    expect(result).toBe('2026-05-18T21:00:00.000Z');
  });

  it('normalizes date-only values to UTC midnight', () => {
    const result = toUtcIsoString('2026-05-18');
    expect(result).toBe('2026-05-18T00:00:00.000Z');
  });

  it('does not default to current time when parsing fails', () => {
    const result = toUtcIsoString('not-a-date');
    expect(result).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('mapGameDetail', () => {
  it('maps team stats with team display names as group titles', () => {
    const rawSummary = {
      id: 'evt-1',
      date: '2026-05-19T00:00:00.000Z',
      status: { type: { state: 'in', description: 'In Progress', detail: 'Q3' } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '98', team: { id: '1', displayName: 'Home Team', abbreviation: 'HOM' } },
            { homeAway: 'away', score: '95', team: { id: '2', displayName: 'Away Team', abbreviation: 'AWY' } },
          ],
        },
      ],
    };

    const rawDetail = {
      boxscore: {
        teams: [
          {
            team: { displayName: 'Home Team' },
            statistics: [{ displayName: 'FG%', displayValue: '48.2' }],
          },
          {
            team: { displayName: 'Away Team' },
            statistics: [{ name: '3PT%', value: '41.1' }],
          },
        ],
      },
    };

    const detail = mapGameDetail(rawSummary, rawDetail, 'nba');

    expect(detail.teamStats).toEqual([
      {
        title: 'Home Team',
        rows: [{ label: 'FG%', value: '48.2' }],
      },
      {
        title: 'Away Team',
        rows: [{ label: '3PT%', value: '41.1' }],
      },
    ]);
  });

  it('maps player stats with team and category names', () => {
    const rawSummary = {
      id: 'evt-2',
      date: '2026-05-19T00:00:00.000Z',
      status: { type: { state: 'post', description: 'Final', detail: 'Final' } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '120', team: { id: '1', displayName: 'Home Team', abbreviation: 'HOM' } },
            { homeAway: 'away', score: '110', team: { id: '2', displayName: 'Away Team', abbreviation: 'AWY' } },
          ],
        },
      ],
    };

    const rawDetail = {
      boxscore: {
        players: [
          {
            team: { displayName: 'Home Team' },
            statistics: [
              {
                displayName: 'Starters',
                labels: ['PTS', 'REB', 'AST'],
                athletes: [
                  {
                    athlete: { displayName: 'Player One' },
                    stats: ['31', '8', '6'],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const detail = mapGameDetail(rawSummary, rawDetail, 'nba');

    expect(detail.playerStats).toEqual([
      {
        title: 'Home Team - Starters',
        rows: [{ label: 'Player One', value: 'PTS: 31 | REB: 8 | AST: 6' }],
      },
    ]);
  });
});
