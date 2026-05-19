# SPEC: Today's Games (Home)

## Goal

Show all games for the user's favorite teams that are scheduled on today's local date, regardless of status, and keep currently in-progress carryover games visible.

## Inputs

- Favorite teams from local storage.
- Backend endpoint for today's games by team and sport.

## Functional Requirements

- Display cards for games involving favorite teams where the game date (in the user's local timezone) equals today.
- Include games that are currently in progress (live) even if the scheduled game date is the previous local date.
- Include games with any status: pre-scheduled, in-progress (live), and final.
- Do NOT include games scheduled on future dates (those belong in Upcoming Games).
- Auto-refresh data every 30 seconds.
- Show game status (pre, live, final, delayed) and clock/period when available.
- Map outcome statuses to simplified labels where applicable: Tie, Canceled, Postponed.
- Display start times in user local timezone.
- Clicking a game opens Game View.

## UX Requirements

- Home-first layout: Today's Games section appears above Upcoming Games and Recent Games.
- Sports icon shown on each game card.
- Empty-state copy uses: "choose your teams" when no favorites are selected.
- Clear fallback for no games today when favorites exist.

## Error States

- API unavailable: show retry action and serve stale cached data with last successful refresh timestamp when available and cache age is <= 60 minutes.
- Partial data: render available fields and hide unavailable fields safely.

## Acceptance Criteria

- Given at least one favorite team with a game today (local date), card appears within first fetch cycle.
- Future pre-scheduled games (tomorrow or later) are NOT shown in the Today's Games section.
- In-progress games that started on the previous local date remain visible in Today's Games while status is live.
- Data refreshes every 30 seconds without full page reload.
- If upstream fails and stale data exists with cache age <= 60 minutes, stale cards remain visible with stale indicator and timestamp.
- If stale cache age is > 60 minutes, stale cards are not served and error state is shown.
- Clicking a game navigates to Game View for that event.

## Dependencies

- Team Selection storage contract.
- Backend API contract for live scores.

## Test Plan

- Unit: today-local-date filtering, polling scheduler, DTO mapping, empty/error states.
- Integration: verify future-dated pre games are excluded; verify today's pre/live/final games are included; verify previous-day in-progress games are included.
- E2E: load home, verify live cards, verify periodic update behavior.
- A11y: keyboard focus order and contrast checks.
