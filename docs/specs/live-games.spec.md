# SPEC: Live Games (Home)

## Goal
Show live and in-progress games for the user's favorite teams with auto-refresh.

## Inputs
- Favorite teams from local storage.
- Backend endpoint for live games by team and sport.

## Functional Requirements
- Display cards for live games involving favorite teams.
- Auto-refresh data every 30 seconds.
- Show game status (pre, live, final, delayed) and clock/period when available.
- Map outcome statuses to simplified labels where applicable: Tie, Canceled, Postponed.
- Display start times in user local timezone.
- Clicking a game opens Game View.

## UX Requirements
- Home-first layout: Live Games section appears above Recent Games.
- Sports icon shown on each game card.
- Empty-state copy uses: "choose your teams" when no favorites are selected.
- Clear fallback for no live games when favorites exist.

## Error States
- API unavailable: show retry action and serve stale cached data with last successful refresh timestamp when available and cache age is <= 60 minutes.
- Partial data: render available fields and hide unavailable fields safely.

## Acceptance Criteria
- Given at least one favorite team with a live game, card appears within first fetch cycle.
- Data refreshes every 30 seconds without full page reload.
- If upstream fails and stale data exists with cache age <= 60 minutes, stale cards remain visible with stale indicator and timestamp.
- If stale cache age is > 60 minutes, stale cards are not served and error state is shown.
- Clicking a live game navigates to Game View for that event.

## Dependencies
- Team Selection storage contract.
- Backend API contract for live scores.

## Test Plan
- Unit: polling scheduler, DTO mapping, empty/error states.
- E2E: load home, verify live cards, verify periodic update behavior.
- A11y: keyboard focus order and contrast checks.
