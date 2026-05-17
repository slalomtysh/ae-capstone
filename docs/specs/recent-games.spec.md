# SPEC: Recent Games (Home)

## Goal
Show games from the last 7 days for the user's favorite teams.

## Inputs
- Favorite teams from local storage.
- Backend endpoint for recent games by team and sport.

## Functional Requirements
- Render recent games list on home screen below Live Games.
- Include final score, date/time, team records when available.
- Default window is rolling 7 days.
- Map outcome statuses to simplified labels where applicable: Tie, Canceled, Postponed.
- Display game dates/times in user local timezone.
- Clicking a game opens Game View.

## UX Requirements
- Distinct section header and visual separation from Live Games.
- Empty-state copy uses: "choose your teams" when no favorites are selected.
- Empty state message when no recent games for favorites.

## Error States
- API failure shows inline error with retry and stale cached list when available and cache age is <= 60 minutes.
- Missing fields use placeholders and keep layout stable.

## Acceptance Criteria
- For favorites with completed games in last 7 days, cards are shown.
- No games older than 7 days are shown.
- If upstream fails and stale data exists with cache age <= 60 minutes, stale results remain visible with stale indicator and timestamp.
- If stale cache age is > 60 minutes, stale results are not served and error state is shown.
- Selecting a recent game navigates to Game View.

## Dependencies
- Team Selection storage contract.
- Backend API contract for historical scores.

## Test Plan
- Unit: 7-day filtering and data mapping.
- E2E: verify recent list contents and navigation to Game View.
