# QA and Test Strategy

## Required Gates

- Lint and format checks pass.
- Unit tests pass.
- E2E tests pass.
- Accessibility checks pass.

## Verification Targets

- Runtime check: `node -v` must report `v25.6.1`.
- Frontend dependency check: Angular major version must be 21 in workspace dependencies.
- Lint target: monorepo lint command passes for frontend and backend.
- Unit target: monorepo unit test command passes for frontend and backend.
- E2E target: core journeys pass (favorites, home live/recent, game details).
- Accessibility target: automated checks plus keyboard traversal on primary views.

## Test Layers

- Frontend unit tests for components/services.
- Backend unit and integration tests for endpoints/mappers.
- E2E tests for key user journeys:
  - manage favorites
  - view live/recent games
  - open game details and return home

## Accessibility Baseline

- Keyboard-only navigation through all primary screens.
- Color contrast checks on scoreboard and status tags.
- Proper semantic headings and landmarks.

## Regression List

- Favorites persist after reload.
- Live games refresh every 30 seconds.
- Recent games always capped to 7-day window.
- Stale data appears only when cache age is 60 minutes or less.
- Tie/canceled/postponed statuses display as simplified labels.

## Deployment Guardrails (Phase 4)

- Runtime gate: `node -v` must equal `v25.6.1` before release packaging.
- API quality gate: `npm run test -w @ae/api -- test/api.integration.test.ts` must pass.
- Frontend quality gate: `npm run test -w @ae/web` must pass.
- User journey gate: `npm run e2e` must pass, including partial-category failure rendering on Home.
- Accessibility gate: `npm run a11y` must pass with zero critical violations.
- Lint gate: `npm run lint` must pass across all workspaces.
- Release approval requires all gates green in the same commit range.

## Post-Release Watchpoints (Phase 4)

- Home page failure signal:
  - Monitor client logs for `[home] live request failed`, `[home] upcoming request failed`, `[home] recent request failed`.
  - Alert threshold: sustained increase over baseline for any section over 15 minutes.
- API upstream degradation signal:
  - Monitor logs for `[gamesService] partial upstream failure on live games|upcoming games|recent games`.
  - Alert threshold: partial failure rate > 5% for 15 minutes.
- Hard-failure signal:
  - Track `UPSTREAM_UNAVAILABLE` 502 responses from `/api/games/live`, `/api/games/upcoming`, `/api/games/recent`.
  - Alert threshold: > 2% of games endpoint traffic for 10 minutes.
- Stale-data usage signal:
  - Track response metadata where `meta.isStale=true` and trend by endpoint.
  - Investigate if stale usage spikes above normal or remains elevated for > 30 minutes.
- Release rollback trigger recommendations:
  - Roll back if all three game endpoints show simultaneous elevated 5xx for > 10 minutes.
  - Roll back if Home page section errors persist for most sessions despite healthy API status.
