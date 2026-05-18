import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function mockApi(page: import('@playwright/test').Page) {
  await page.route('**/api/teams?sport=**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            teamId: '1',
            displayName: 'Buffalo Bills',
            abbreviation: 'BUF',
            sport: 'nfl',
            logoUrl: null,
          },
        ],
        meta: {
          isStale: false,
          lastSuccessfulRefreshUtc: null,
          generatedAtUtc: new Date().toISOString(),
          staleTtlMinutes: 60,
        },
      }),
    });
  });

  await page.route('**/api/games/live**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            eventId: 'evt-live-1',
            sport: 'nfl',
            status: 'live',
            outcomeLabel: null,
            startTimeUtc: new Date().toISOString(),
            homeTeam: {
              teamId: '1',
              displayName: 'Buffalo Bills',
              abbreviation: 'BUF',
              logoUrl: null,
              score: 20,
              record: '1-0',
            },
            awayTeam: {
              teamId: '2',
              displayName: 'Miami Dolphins',
              abbreviation: 'MIA',
              logoUrl: null,
              score: 17,
              record: '0-1',
            },
            venue: 'Mock Stadium',
          },
        ],
        meta: {
          isStale: false,
          lastSuccessfulRefreshUtc: null,
          generatedAtUtc: new Date().toISOString(),
          staleTtlMinutes: 60,
        },
      }),
    });
  });

  await page.route('**/api/games/upcoming**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        meta: {
          isStale: false,
          lastSuccessfulRefreshUtc: null,
          generatedAtUtc: new Date().toISOString(),
          staleTtlMinutes: 60,
        },
      }),
    });
  });

  await page.route('**/api/games/recent**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        meta: {
          isStale: false,
          lastSuccessfulRefreshUtc: null,
          generatedAtUtc: new Date().toISOString(),
          staleTtlMinutes: 60,
        },
      }),
    });
  });

  await page.route('**/api/games/evt-live-1?sport=nfl', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          summary: {
            eventId: 'evt-live-1',
            sport: 'nfl',
            status: 'live',
            outcomeLabel: null,
            startTimeUtc: new Date().toISOString(),
            homeTeam: {
              teamId: '1',
              displayName: 'Buffalo Bills',
              abbreviation: 'BUF',
              logoUrl: null,
              score: 20,
              record: '1-0',
            },
            awayTeam: {
              teamId: '2',
              displayName: 'Miami Dolphins',
              abbreviation: 'MIA',
              logoUrl: null,
              score: 17,
              record: '0-1',
            },
            venue: 'Mock Stadium',
          },
          teamStats: [{ key: 'yards', value: 300 }],
          playerStats: [{ key: 'passingYards', value: 240 }],
        },
        meta: {
          isStale: false,
          lastSuccessfulRefreshUtc: null,
          generatedAtUtc: new Date().toISOString(),
          staleTtlMinutes: 60,
        },
      }),
    });
  });
}

test('favorites -> home -> game detail -> home navigation', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'choose your teams' }).click();

  await expect(page.getByRole('heading', { name: 'Team Selection' })).toBeVisible();
  await page.getByRole('button', { name: 'Buffalo Bills' }).click();
  await page.getByRole('button', { name: 'Save & Home' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Live Games' })).toBeVisible();
  await page.getByRole('button').filter({ hasText: 'BUF' }).first().click();

  await expect(page).toHaveURL(/\/games\/nfl\/evt-live-1/);
  await expect(page.locator('.game-page .home-link')).toBeVisible();
  await page.locator('.game-page .home-link').click();
  await expect(page).toHaveURL('/');
});

test('@a11y home screen has no critical accessibility violations', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  const critical = results.violations.filter((violation) => violation.impact === 'critical');
  expect(critical).toEqual([]);
});
