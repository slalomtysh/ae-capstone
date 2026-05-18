# Purpose

Build a sports scoreboard dashboard that automatically updates and focuses on the user's favorite teams.

# Technical Overview

This application is a monorepo with:

- Angular 21 frontend
- Node.js v25.6.1 backend runtime
- Express REST API backend

External data source:

- ESPN public APIs documented at https://github.com/pseudo-r/Public-ESPN-API

Supported sports in v1:

- NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer

# Product Constraints (v1)

- No auth in v1.
- Favorite teams are stored in browser local storage.
- Favorite team limit is 20.
- Live data refresh interval is every 30 seconds.
- Time display is always in the user's local timezone.
- Primary empty-state copy is: "choose your teams".
- If upstream APIs fail, show stale cached data with timestamp when available.
- Stale cache can be shown for up to 60 minutes.
- Game outcome labels are simplified to: Tie, Canceled, Postponed.

# UI Design

- Use Material Design with a sporty visual direction.
- Theme should emphasize greens and whites inspired by field/grass aesthetics.
- Include sport-relevant icons where useful.
- Interface should feel like a modern scoreboard, not generic dashboard chrome.

# UX

## Views / Screens

- Home (Live Games + Upcoming Games + Recent Games):
  - Live Games section shows all games for favorite teams scheduled on today's UTC date (any status: pre, live, or final).
  - Upcoming Games section shows games for favorite teams scheduled in the next 1–7 days (pre-scheduled only, not today).
  - Recent Games section shows completed (final) games for favorite teams from the last 7 days (before today).
  - All sections support stale-data presentation with a visible timestamp when served from cache.
- Game View:
  - Opened by clicking a game card from Home.
  - Shows detailed box score and player/team statistics.
  - Must render all stat groups available from upstream data.
  - Includes a clear Home navigation action.
- Team Selection:
  - User selects and saves favorite teams.
  - Enforces maximum 20 selected teams.
  - Selection state persists in local storage.
