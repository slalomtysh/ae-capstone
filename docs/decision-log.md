# Decision Log

## 2026-05-17

- v1 sports scope includes NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.
- No auth in v1.
- Favorites persist in browser local storage.
- Favorites are capped at 20 teams.
- Live data refresh interval is 30 seconds.
- Timezone display is always user local.
- Empty-state primary copy is "choose your teams".
- During upstream outages, show stale cached data with timestamp when available.
- Stale cached data is only eligible for display up to 60 minutes from last successful refresh.
- Game View must render all available stat groups.
- Tie/canceled/postponed states use simplified labels: Tie, Canceled, Postponed.
- Backend will be Express REST.
- Runtime pinning is Angular 21 and Node.js v25.6.1.
- Delivery order is fixed: project-overview update first, then foundational docs, then feature specs, then implementation.

## 2026-05-18 — Home Screen Redesign

- Decision: Expand home screen from two sections (Live + Recent) to three sections (Live + Upcoming + Recent).
- Context: Future NFL pre-scheduled games were incorrectly appearing in the Live Games section because the backend filtered only on `status !== 'final'`, which captured all pre-scheduled games including those months in the future.
- Section definitions locked:
  - Live Games: all games for favorite teams on today's UTC date (any status: pre/live/final). Scoped by date, not by in-progress status.
  - Upcoming Games: pre-scheduled games for favorite teams in the next 1–7 days from today (today excluded). Status must be pre. Ordered ascending by start time.
  - Recent Games: final games for favorite teams in the 7 days before today (today excluded). Status must be final.
- Alternatives considered: Keep two sections but filter live to in-progress only — rejected because it would hide today's upcoming and completed games from the home view.
- Consequences: New backend endpoint GET /api/games/upcoming added. fetchLiveGames redesigned to use today's UTC date range instead of status-based filtering. Frontend gains a third section card group and a new ApiService method.

## Template

- Date:
- Decision:
- Context:
- Alternatives considered:
- Consequences:
