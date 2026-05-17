# Architecture Overview

## Runtime Baseline
- Frontend framework: Angular 21.
- Backend runtime: Node.js v25.6.1.
- Backend framework: Express REST API.

## Monorepo Layout (proposed)
- apps/web: Angular frontend.
- apps/api: Express backend.
- packages/shared: shared types/contracts.

## Runtime Flow
1. Angular app reads favorite team IDs from local storage.
2. Angular calls Express API endpoints.
3. Express calls ESPN public APIs and normalizes responses.
4. Angular renders live/recent/game detail views.

## Key Design Rules
- Frontend never calls ESPN directly.
- API returns stable DTOs independent of ESPN schema changes.
- Shared contracts are versioned in one place.
- On upstream failure, stale cached data may be served only when cache age is 60 minutes or less.

## Risks
- ESPN endpoint variability by sport.
- Upstream rate limits and data gaps.

## Mitigations
- Response mappers with sport-specific guards.
- Short-lived caching and retry/timeout policy.
- Fallback UI for partial data.
- Cache metadata includes stale state and last successful refresh timestamp for client rendering.
