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
