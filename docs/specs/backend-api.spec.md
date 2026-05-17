# SPEC: Backend API (Express)

## Goal
Provide stable REST endpoints for frontend score views while isolating ESPN API details.

## Endpoints (v1)
- GET /api/teams?sport={sport}
- GET /api/games/live?teamIds={ids}&sports={sports}
- GET /api/games/recent?teamIds={ids}&sports={sports}&days=7
- GET /api/games/{eventId}

## Functional Requirements
- Normalize ESPN payloads into frontend-friendly DTOs.
- Validate query params and return typed error responses.
- Cache upstream responses briefly to reduce rate/latency impact.
- On upstream failure, return stale cached data only when cache age is <= 60 minutes, with stale metadata.
- Normalize upstream outcome states to simplified labels where applicable: Tie, Canceled, Postponed.

## Non-Functional Requirements
- Basic request logging and correlation ID.
- Timeouts and retry policy for ESPN upstream calls.
- CORS policy for frontend origin.
- Response metadata includes cache status and lastSuccessfulRefresh timestamp.
- Response metadata includes staleTtlMinutes set to 60.

## Acceptance Criteria
- Endpoints return consistent schema for supported sports.
- Invalid params return 400 with actionable error body.
- Upstream failure returns stale data only when cache age is <= 60 minutes; otherwise returns 502/503 with retry guidance.

## Test Plan
- Unit: mappers and validation.
- Integration: endpoint contracts using mocked ESPN responses.
