# Product Requirements (v1)

## Scope
Build a sports score dashboard web app in a monorepo with Angular 21 frontend and Node.js v25.6.1 (Express REST) backend.

## Confirmed Decisions
- Sports in v1: NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.
- Auth: none in v1.
- Favorite teams: browser local storage only.
- Favorite teams limit: 20 teams maximum.
- Live refresh cadence: every 30 seconds.
- Timezone display: always user local timezone.
- Home screen: live games and recent games together.
- Recent games: favorite teams only, last 7 days.
- Empty state primary copy: "choose your teams".
- Game view depth: full box score and player stats.
- Game view stats scope: all available stats from upstream response.
- Backend: Express REST API.
- Outage behavior: show stale cached data with timestamp when upstream fails.
- Stale cache display TTL: 60 minutes maximum.
- Status label policy: use simplified labels for Tie, Canceled, and Postponed states.
- Quality gates: unit tests, E2E tests, lint/format checks, accessibility checks.

## Core User Stories
- As a user, I can save favorite teams and see games for those teams on the home screen.
- As a user, I can view live scores that refresh automatically.
- As a user, I can view recent game scores from the last 7 days.
- As a user, I can open a game details page with full box score and player stats.
- As a user, I can always navigate back to the home screen.

## Non-Functional Requirements
- Data freshness: live scores update every 30 seconds while home screen is open.
- Reliability: degraded UI state shown for network/API failures.
- Resilience: when upstream is unavailable, serve stale cache if available and label as stale.
- Cache freshness guard: do not serve stale data older than 60 minutes.
- Accessibility: keyboard navigable, color contrast checked, semantic landmarks.
- Performance: initial home screen render target under 2.5s on broadband.

## Out of Scope (v1)
- User accounts and cloud sync of favorites.
- Push notifications.
- Betting or fantasy integrations.

## Clarification Status
- No open product clarifications remain for v1 baseline implementation.
