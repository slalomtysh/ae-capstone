# SPEC: Upcoming Games (Home)

## Goal

Show pre-scheduled games for the user's favorite teams in the next 1–7 days (not today).

## Inputs

- Favorite teams from local storage.
- Backend endpoint for upcoming games by team and sport.

## Functional Requirements

- Display cards for games involving favorite teams where the game date (UTC) is between tomorrow and 7 days from today (inclusive).
- Only include games with pre-scheduled status (not live, not final).
- Do NOT include today's games (those belong in Live Games).
- Display game date and start time in user local timezone.
- Clicking a game opens Game View.
- Cards are ordered ascending by scheduled start time (soonest first).

## UX Requirements

- Section appears between Live Games and Recent Games on the home screen.
- Visually distinct from Live Games — use a lighter/future-oriented card style (e.g. calendar or clock indicator).
- Sports icon shown on each game card.
- Show opponent, scheduled date/time, and sport.
- Empty-state copy when favorites exist but no upcoming games: "No upcoming games in the next 7 days".
- Empty-state copy when no favorites are selected: "choose your teams".

## Error States

- API unavailable: show retry action and serve stale cached data with last successful refresh timestamp when available and cache age is <= 60 minutes.
- Partial data: render available fields and hide unavailable fields safely.

## Acceptance Criteria

- Given at least one favorite team with a pre-scheduled game in the next 1–7 days, card appears within first fetch cycle.
- Today's games are NOT shown in the Upcoming Games section.
- Games scheduled more than 7 days in the future are NOT shown.
- Only pre-scheduled games (status = pre) are shown; live or final games are excluded.
- Cards are sorted ascending by start time.
- If upstream fails and stale data exists with cache age <= 60 minutes, stale cards remain visible with stale indicator and timestamp.
- If stale cache age is > 60 minutes, stale cards are not served and error state is shown.
- Clicking an upcoming game navigates to Game View for that event.

## Dependencies

- Team Selection storage contract.
- Backend API contract (GET /api/games/upcoming).

## Test Plan

- Unit: +1 to +7 day date range filtering, pre-status filtering, sort order.
- Integration: verify today's game excluded, verify +3-day pre game included, verify final game excluded.
- E2E: load home with favorites, verify upcoming section presence and card order.
- A11y: keyboard focus order and contrast checks.
