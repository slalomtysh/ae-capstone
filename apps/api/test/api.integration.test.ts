import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryCache } from '../src/lib/cache.js';
import { buildScoreboardUrl, buildTeamsUrl } from '../src/espn/urls.js';

/** Returns today's date in ESPN YYYYMMDD format (UTC). */
function todayEspn(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Returns N days from today in ESPN YYYYMMDD format (UTC). */
function offsetEspn(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
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
    const today = todayEspn();
    const url = buildScoreboardUrl('nfl', today);
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
    const today = todayEspn();
    client.enqueue(buildScoreboardUrl('nfl', today), new Error('upstream down'));
    const app = createApp({ espnClient: client, cache: new MemoryCache() });

    const response = await request(app).get('/api/games/live?teamIds=1&sports=nfl');
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('returns consistent teams schema', async () => {
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
          ],
        },
      ],
    });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/teams?sport=nfl');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.generatedAtUtc).toBeTruthy();
    expect(response.body.data[0]).toMatchObject({
      teamId: '1',
      displayName: 'Buffalo Bills',
      abbreviation: 'BUF',
    });
  });

  it('normalizes tie outcome label', async () => {
    const recentTiePayload = {
      events: [makeEvent('tie-event', 'post', '1', '2')],
    };
    // Override score to make it a tie
    recentTiePayload.events[0].competitions[0].competitors[0].score = '21';
    recentTiePayload.events[0].competitions[0].competitors[1].score = '21';

    const yesterday = offsetEspn(-1);
    const sevenDaysAgo = offsetEspn(-7);
    const rangeKey = `${sevenDaysAgo}-${yesterday}`;

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
    const today = todayEspn();
    // Game scheduled today (should appear)
    const todayGame = makeEvent('today-game', 'pre', '1', '2');
    // Game scheduled 3 days from now (should NOT appear in live — it would come from a different URL)
    const livePayload = { events: [todayGame] };

    const client = new QueueEspnClient();
    client.enqueue(buildScoreboardUrl('nfl', today), livePayload);

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/games/live?teamIds=1&sports=nfl');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].eventId).toBe('today-game');
  });

  it('upcoming games returns pre-scheduled games in next 1-7 days', async () => {
    const start = offsetEspn(1);
    const end = offsetEspn(7);
    const rangeKey = `${start}-${end}`;
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

  it('upcoming games excludes non-pre (final) games', async () => {
    const start = offsetEspn(1);
    const end = offsetEspn(7);
    const rangeKey = `${start}-${end}`;
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
});
