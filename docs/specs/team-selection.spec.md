# SPEC: Team Selection

## Goal
Allow user to search/select favorite teams and persist choices locally.

## Inputs
- Supported sports/team catalog from backend.
- Existing favorites from local storage.

## Functional Requirements
- User can browse/filter teams by sport.
- User can add and remove favorites.
- User can select up to 20 favorite teams total.
- Save favorites to local storage and use them across app views.
- Expose clear action to return Home after saving.

## UX Requirements
- Multi-select interaction with clear selected state.
- Show count of selected teams.
- Show a visible selection cap indicator (for example, "12/20 selected").
- Fast save feedback.

## Error States
- Team catalog load failure with retry.
- Local storage unavailable fallback notification.

## Acceptance Criteria
- Saved favorites are reflected on Home after navigation.
- Favorites remain after browser refresh.
- Removing a team removes its games from Home feed.
- Attempting to select a 21st team is blocked with an inline limit message.

## Dependencies
- Sports/team catalog API.
- Shared local storage key contract.

## Test Plan
- Unit: selection logic and persistence adapter.
- E2E: select favorites, save, verify Home reflects changes.
