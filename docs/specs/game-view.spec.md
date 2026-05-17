# SPEC: Game View

## Goal
Provide detailed box score and player statistics for a selected game.

## Inputs
- Game/event ID from route param.
- Backend endpoint for game details.

## Functional Requirements
- Show matchup header: teams, logos, score, game status.
- Display simplified outcome labels where applicable: Tie, Canceled, Postponed.
- Show team-level box score and key stats.
- Show all available player/team stat groups provided by the backend response.
- Include Home navigation action.

## UX Requirements
- Fast path to return to Home.
- Readable stat tables on mobile and desktop.
- Clearly label unavailable stat categories.
- Display all game times in user local timezone.

## Error States
- Invalid game ID shows not found state with Home action.
- API failure shows retry and fallback message.

## Acceptance Criteria
- Navigating from home game card opens matching game details.
- Team and player stats render for supported events.
- For events with multiple stat groups, each available group is rendered.
- Home navigation is always visible and functional.

## Dependencies
- Live and Recent sections produce valid game/event IDs.
- Backend game details endpoint.

## Test Plan
- Unit: route handling and details mapping.
- E2E: open game from home and verify stats render.
- A11y: table headers and keyboard navigation.
