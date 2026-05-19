import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { NCAAF_CONFERENCE_GROUP_IDS } from '../src/config.js';
import { MemoryCache } from '../src/lib/cache.js';
import { buildScoreboardUrl, buildStandingsUrl, buildTeamsUrl } from '../src/espn/urls.js';

/** Returns N days from today in ESPN YYYYMMDD format (UTC). */
function offsetEspn(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function rangeEspn(startOffsetDays: number, endOffsetDays: number): string {
  return `${offsetEspn(startOffsetDays)}-${offsetEspn(endOffsetDays)}`;
}

function liveRangeEspn(): string {
  return rangeEspn(-2, 1);
}

function upcomingRangeEspn(): string {
  return rangeEspn(0, 8);
}

function recentRangeEspn(days: number): string {
  return rangeEspn(-(days + 1), 0);
}

class QueueEspnClient {
  private values = new Map<string, Array<unknown>>();

  enqueue(url: string, ...responses: unknown[]) {
    this.values.set(url, responses);
  }

  async getJson<T>(url: string): Promise<T> {
    const queue = this.values.get(url);
    if (!queue || queue.length === 0) {
      throw new Error(`No mock response queued for ${url}`);
    }
    const next = queue.shift();
    if (next instanceof Error) {
      throw next;
    }
    return next as T;
  }
}

function makeEvent(id: string, state: string, homeId: string, awayId: string, date?: string) {
  return {
    id,
    date: date ?? new Date().toISOString(),
    status: { type: { state, description: state, detail: state } },
    competitions: [
      {
        competitors: [
          {
            homeAway: 'home',
            score: '17',
            team: {
              id: homeId,
              displayName: 'Home',
              abbreviation: 'HOM',
              logos: [{ href: 'home.png' }],
            },
            records: [{ summary: '1-0' }],
          },
          {
            homeAway: 'away',
            score: '10',
            team: {
              id: awayId,
              displayName: 'Away',
              abbreviation: 'AWY',
              logos: [{ href: 'away.png' }],
            },
            records: [{ summary: '0-1' }],
          },
        ],
        venue: { fullName: 'Test Stadium' },
      },
    ],
  };
}

describe('API integration', () => {
  it('returns 400 for invalid query params', async () => {
    const app = createApp({ espnClient: new QueueEspnClient(), cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_QUERY');
  });

  it('serves stale cache when upstream fails within ttl', async () => {
    const client = new QueueEspnClient();
    const cache = new MemoryCache();
    const url = buildScoreboardUrl('nfl', liveRangeEspn());
    const livePayload = { events: [makeEvent('e1', 'in', '1', '2')] };
    client.enqueue(url, livePayload, new Error('upstream down'));

    const app = createApp({ espnClient: client, cache });

    const first = await request(app).get('/api/games/live?teamIds=1&sports=nfl');
    expect(first.status).toBe(200);
    expect(first.body.meta.isStale).toBe(false);

    const second = await request(app).get('/api/games/live?teamIds=1&sports=nfl');
    expect(second.status).toBe(200);
    expect(second.body.meta.isStale).toBe(true);
    expect(second.body.meta.staleTtlMinutes).toBe(60);
  });

  it('returns 502 when upstream fails and no stale cache exists', async () => {
    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nfl', liveRangeEspn()), new Error('upstream down'));
    const app = createApp({ espnClient: client, cache: new MemoryCache() });

    const response = await request(app).get('/api/games/live?teamIds=1&sports=nfl');
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(response.body.error.details.endpoint).toBe('live');
    expect(response.body.error.details.failedSports).toEqual(['nfl']);
  });

  it('returns partial live data when one sport fails and another succeeds', async () => {
    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nfl', liveRangeEspn()), new Error('nfl down'));
    client.enqueue(buildScoreboardUrl('nba', liveRangeEspn()), {
      events: [makeEvent('nba-live', 'in', '1', '2')],
    });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live?teamIds=nba:1&sports=nfl,nba');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('nba-live');
    expect(response.body.meta.isStale).toBe(false);
  });

  it('returns partial upcoming data when one sport fails and another succeeds', async () => {
    const client = new QueueEspnClient();
    const upcomingRange = upcomingRangeEspn();
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    client.enqueue(buildScoreboardUrl('nfl', upcomingRange), new Error('nfl down'));
    client.enqueue(buildScoreboardUrl('nba', upcomingRange), {
      events: [makeEvent('nba-upcoming', 'pre', '1', '2', futureDate)],
    });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/upcoming?teamIds=nba:1&sports=nfl,nba');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('nba-upcoming');
  });

  it('returns partial recent data when one sport fails and another succeeds', async () => {
    const client = new QueueEspnClient();
    const recentRange = recentRangeEspn(7);
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    client.enqueue(buildScoreboardUrl('nfl', recentRange), new Error('nfl down'));
    client.enqueue(buildScoreboardUrl('nba', recentRange), {
      events: [makeEvent('nba-recent', 'post', '1', '2', recentDate)],
    });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/recent?teamIds=nba:1&sports=nfl,nba&days=7');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('nba-recent');
  });

  it('returns flattened teams schema across league buckets with conference names', async () => {
    const client = new QueueEspnClient();
    client.enqueue(buildTeamsUrl('nfl'), {
      sports: [
        {
          slug: 'football',
          leagues: [
            {
              teams: [
                {
                  team: {
                    id: '1',
                    displayName: 'Buffalo Bills',
                    abbreviation: 'BUF',
                    logos: [{ href: 'logo.png' }],
                  },
                },
              ],
            },
            {
              teams: [
                {
                  team: {
                    id: '2',
                    displayName: 'Ohio State Buckeyes',
                    abbreviation: 'OSU',
                    logos: [{ href: 'osu.png' }],
                    groups: [{ name: 'Big Ten' }],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/teams?sport=nfl');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.generatedAtUtc).toBeTruthy();
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      teamId: '1',
      displayName: 'Buffalo Bills',
      abbreviation: 'BUF',
    });
    expect(response.body.data[1]).toMatchObject({
      teamId: '2',
      displayName: 'Ohio State Buckeyes',
      conference: 'Big Ten',
    });
  });

  it('enriches ncaaf teams with conference names from standings', async () => {
    const client = new QueueEspnClient();

    for (const groupId of NCAAF_CONFERENCE_GROUP_IDS) {
      const teams =
        groupId === '8'
          ? [
              {
                team: {
                  id: '333',
                  displayName: 'Alabama Crimson Tide',
                  abbreviation: 'ALA',
                  logos: [{ href: 'ala.png' }],
                },
              },
            ]
          : groupId === '4'
            ? [
                {
                  team: {
                    id: '228',
                    displayName: 'Texas Longhorns',
                    abbreviation: 'TEX',
                    logos: [{ href: 'tex.png' }],
                  },
                },
              ]
            : // Duplicate Alabama in Top 25 payload to verify dedupe during merge.
              groupId === '80'
              ? [
                  {
                    team: {
                      id: '333',
                      displayName: 'Alabama Crimson Tide',
                      abbreviation: 'ALA',
                      logos: [{ href: 'ala.png' }],
                    },
                  },
                ]
              : [];

      client.enqueue(buildTeamsUrl('ncaaf', groupId), {
        sports: [
          {
            slug: 'football',
            leagues: [{ teams }],
          },
        ],
      });
    }

    client.enqueue(buildStandingsUrl('ncaaf'), {
      name: 'College Football',
      children: [
        {
          name: 'Southeastern Conference',
          standings: {
            entries: [{ team: { id: '333', displayName: 'Alabama Crimson Tide' } }],
          },
        },
        {
          name: 'Big 12 Conference',
          standings: {
            entries: [{ team: { id: '228', displayName: 'Texas Longhorns' } }],
          },
        },
      ],
    });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/teams?sport=ncaaf');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.find((team: any) => team.teamId === '333')).toMatchObject({
      conference: 'Southeastern Conference',
    });
    expect(response.body.data.find((team: any) => team.teamId === '228')).toMatchObject({
      conference: 'Big 12 Conference',
    });
  });

  it('normalizes tie outcome label', async () => {
    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentTiePayload = {
      events: [makeEvent('tie-event', 'post', '1', '2', yesterdayIso)],
    };
    // Override score to make it a tie
    recentTiePayload.events[0].competitions[0].competitors[0].score = '21';
    recentTiePayload.events[0].competitions[0].competitors[1].score = '21';

    const rangeKey = recentRangeEspn(7);

    const app = createApp({
      espnClient: {
        getJson: async (url: string) => {
          if (url.includes(`dates=${rangeKey}`)) {
            return recentTiePayload;
          }
          throw new Error(`unexpected url: ${url}`);
        },
      },
      cache: new MemoryCache(),
    });

    const response = await request(app).get('/api/games/recent?teamIds=1&sports=nfl&days=7');
    expect(response.status).toBe(200);
    expect(response.body.data[0].outcomeLabel).toBe('Tie');
  });

  it('live games excludes future pre-scheduled games (only today)', async () => {
    const liveRange = liveRangeEspn();
    // Game scheduled today (should appear)
    const todayGame = makeEvent('today-game', 'pre', '1', '2');
    // Game scheduled in the future (should be excluded from today's games even if ESPN returns it)
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const futureGame = makeEvent('future-game', 'pre', '1', '2', futureDate);
    const livePayload = { events: [todayGame, futureGame] };

    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nfl', liveRange), livePayload);

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live?teamIds=1&sports=nfl');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('today-game');
  });

  it('live games includes final games that happened today', async () => {
    const liveRange = liveRangeEspn();
    const todayFinalGame = makeEvent('today-final', 'post', '1', '2');
    const payload = { events: [todayFinalGame] };

    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nfl', liveRange), payload);

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live?teamIds=1&sports=nfl');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('today-final');
    expect(response.body.data[0].status).toBe('final');
  });

  it('live games keeps timezone-less today timestamps on the same UTC day', async () => {
    const liveRange = liveRangeEspn();
    const today = new Date();
    const y = today.getUTCFullYear();
    const m = String(today.getUTCMonth() + 1).padStart(2, '0');
    const d = String(today.getUTCDate()).padStart(2, '0');
    const noTimezoneTimestamp = `${y}-${m}-${d}T21:00`;
    const todayGameNoTimezone = makeEvent('today-no-tz', 'pre', '1', '2', noTimezoneTimestamp);
    const payload = { events: [todayGameNoTimezone] };

    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nfl', liveRange), payload);

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live?teamIds=1&sports=nfl&timezone=UTC');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('today-no-tz');
    expect(response.body.data[0].startTimeUtc).toBe(`${y}-${m}-${d}T21:00:00.000Z`);
  });

  it('live games includes in-progress games that started before today UTC', async () => {
    const liveRange = liveRangeEspn();
    const yesterdayLiveDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const inProgressFromYesterday = makeEvent('live-overnight', 'in', '1', '2', yesterdayLiveDate);
    const payload = { events: [inProgressFromYesterday] };

    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nba', liveRange), payload);

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live?teamIds=1&sports=nba&timezone=UTC');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('live-overnight');
    expect(response.body.data[0].status).toBe('live');
  });

  it('upcoming games returns pre-scheduled games in next 1-7 days', async () => {
    const rangeKey = upcomingRangeEspn();
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const futureGame = makeEvent('future-game', 'pre', '1', '2', futureDate);
    const upcomingPayload = { events: [futureGame] };

    const app = createApp({
      espnClient: {
        getJson: async (url: string) => {
          if (url.includes(`dates=${rangeKey}`)) {
            return upcomingPayload;
          }
          throw new Error(`unexpected url: ${url}`);
        },
      },
      cache: new MemoryCache(),
    });

    const response = await request(app).get('/api/games/upcoming?teamIds=1&sports=nfl');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('future-game');
    expect(response.body.data[0].status).toBe('pre');
  });

  it('filters favorites by sport when team ids collide across sports', async () => {
    const liveRange = liveRangeEspn();
    const nflGame = makeEvent('nfl-game', 'post', '1', '2');
    const nbaGame = makeEvent('nba-game', 'post', '1', '3');

    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nfl', liveRange), { events: [nflGame] });
    client.enqueue(buildScoreboardUrl('nba', liveRange), { events: [nbaGame] });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live?teamIds=nfl:1&sports=nfl,nba');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('nfl-game');
  });

  it('upcoming games returns only 9 closest games', async () => {
    const rangeKey = upcomingRangeEspn();
    const now = Date.now();
    const events = Array.from({ length: 12 }, (_, i) => {
      const dayOffset = Math.floor(i / 2) + 1; // 1..6 days ahead
      const hourOffset = i % 2; // two games per day
      return makeEvent(
        `upcoming-${i + 1}`,
        'pre',
        '1',
        '2',
        new Date(now + dayOffset * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000).toISOString(),
      );
    });

    const app = createApp({
      espnClient: {
        getJson: async (url: string) => {
          if (url.includes(`dates=${rangeKey}`)) {
            return { events };
          }
          throw new Error(`unexpected url: ${url}`);
        },
      },
      cache: new MemoryCache(),
    });

    const response = await request(app).get('/api/games/upcoming?teamIds=1&sports=nfl&timezone=UTC');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(9);
    expect(response.body.data[0].eventId).toBe('upcoming-1');
    expect(response.body.data[8].eventId).toBe('upcoming-9');
  });

  it('recent games returns only 9 closest past games', async () => {
    const rangeKey = recentRangeEspn(7);
    const now = Date.now();
    const events = Array.from({ length: 12 }, (_, i) => {
      const dayOffset = Math.floor(i / 2) + 1; // 1..6 days ago
      const hourOffset = i % 2; // two games per day
      return makeEvent(
        `recent-${dayOffset}-${hourOffset}`,
        'post',
        '1',
        '2',
        new Date(now - dayOffset * 24 * 60 * 60 * 1000 - hourOffset * 60 * 60 * 1000).toISOString(),
      );
    });

    const app = createApp({
      espnClient: {
        getJson: async (url: string) => {
          if (url.includes(`dates=${rangeKey}`)) {
            return { events };
          }
          throw new Error(`unexpected url: ${url}`);
        },
      },
      cache: new MemoryCache(),
    });

    const response = await request(app).get('/api/games/recent?teamIds=1&sports=nfl&days=7&timezone=UTC');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(9);
    expect(response.body.data[0].eventId).toBe('recent-1-0');
    expect(response.body.data[8].eventId).toBe('recent-5-0');
  });

  it('upcoming games excludes non-pre (final) games', async () => {
    const rangeKey = upcomingRangeEspn();
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    // Final game in the date range — should be excluded from upcoming
    const finalGame = makeEvent('final-future', 'post', '1', '2', futureDate);
    const payload = { events: [finalGame] };

    const app = createApp({
      espnClient: {
        getJson: async (url: string) => {
          if (url.includes(`dates=${rangeKey}`)) return payload;
          throw new Error(`unexpected url: ${url}`);
        },
      },
      cache: new MemoryCache(),
    });

    const response = await request(app).get('/api/games/upcoming?teamIds=1&sports=nfl');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it('upcoming games excludes games beyond 7 days even if upstream returns them', async () => {
    const rangeKey = upcomingRangeEspn();
    const outOfRangeDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const outOfRangeGame = makeEvent('future-day-8', 'pre', '1', '2', outOfRangeDate);
    const payload = { events: [outOfRangeGame] };

    const app = createApp({
      espnClient: {
        getJson: async (url: string) => {
          if (url.includes(`dates=${rangeKey}`)) return payload;
          throw new Error(`unexpected url: ${url}`);
        },
      },
      cache: new MemoryCache(),
    });

    const response = await request(app).get('/api/games/upcoming?teamIds=1&sports=nfl');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it('live games uses local-day bucketing by timezone', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-18T12:00:00.000Z'));

      const liveRange = liveRangeEspn();
      const event = makeEvent('late-utc', 'post', '1', '2', '2026-05-18T01:00:00.000Z');
      const payload = { events: [event] };

      const client = new QueueEspnClient();
      client.enqueue(buildScoreboardUrl('nfl', liveRange), payload, payload);
      const app = createApp({ espnClient: client, cache: new MemoryCache() });

      const utc = await request(app).get('/api/games/live?teamIds=1&sports=nfl&timezone=UTC');
      const la = await request(app).get(
        '/api/games/live?teamIds=1&sports=nfl&timezone=America/Los_Angeles',
      );

      expect(utc.status).toBe(200);
      expect(la.status).toBe(200);
      expect(utc.body.data).toHaveLength(1);
      expect(la.body.data).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
