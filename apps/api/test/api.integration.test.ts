import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryCache } from '../src/lib/cache.js';
import { buildScoreboardUrl, buildTeamsUrl } from '../src/espn/urls.js';

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

const livePayload = {
  events: [
    {
      id: 'event-live-1',
      date: '2026-05-17T12:00:00Z',
      status: { type: { state: 'in', description: 'In Progress', detail: 'Q2 10:10' } },
      competitions: [
        {
          competitors: [
            {
              homeAway: 'home',
              score: '17',
              team: { id: '1', displayName: 'Home', abbreviation: 'HOM', logos: [{ href: 'home.png' }] },
              records: [{ summary: '1-0' }]
            },
            {
              homeAway: 'away',
              score: '10',
              team: { id: '2', displayName: 'Away', abbreviation: 'AWY', logos: [{ href: 'away.png' }] },
              records: [{ summary: '0-1' }]
            }
          ],
          venue: { fullName: 'Test Stadium' }
        }
      ]
    }
  ]
};

const recentTiePayload = {
  events: [
    {
      id: 'event-final-tie',
      date: '2026-05-16T12:00:00Z',
      status: { type: { state: 'post', description: 'Final', detail: 'Final' } },
      competitions: [
        {
          competitors: [
            {
              homeAway: 'home',
              score: '21',
              team: { id: '1', displayName: 'Home', abbreviation: 'HOM' },
              records: [{ summary: '1-0-1' }]
            },
            {
              homeAway: 'away',
              score: '21',
              team: { id: '2', displayName: 'Away', abbreviation: 'AWY' },
              records: [{ summary: '1-0-1' }]
            }
          ],
          venue: { fullName: 'Tie Field' }
        }
      ]
    }
  ]
};

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
    const url = buildScoreboardUrl('nfl');
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
    client.enqueue(buildScoreboardUrl('nfl'), new Error('upstream down'));
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
                    logos: [{ href: 'logo.png' }]
                  }
                }
              ]
            }
          ]
        }
      ]
    });

    const app = createApp({ espnClient: client, cache: new MemoryCache() });
    const response = await request(app).get('/api/teams?sport=nfl');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.generatedAtUtc).toBeTruthy();
    expect(response.body.data[0]).toMatchObject({
      teamId: '1',
      displayName: 'Buffalo Bills',
      abbreviation: 'BUF'
    });
  });

  it('normalizes tie outcome label', async () => {
    const app = createApp({
      espnClient: {
        getJson: async (url: string) => {
        if (url.includes('/scoreboard?dates=')) {
          return recentTiePayload;
        }
        throw new Error('unexpected url');
        }
      },
      cache: new MemoryCache()
    });

    const response = await request(app).get('/api/games/recent?teamIds=1&sports=nfl&days=7');
    expect(response.status).toBe(200);
    expect(response.body.data[0].outcomeLabel).toBe('Tie');
  });
});
