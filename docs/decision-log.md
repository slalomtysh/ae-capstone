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

## Template
- Date:
- Decision:
- Context:
- Alternatives considered:
- Consequences:
