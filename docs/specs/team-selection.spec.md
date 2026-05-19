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
- Saved favorites feed Home My Teams grouped display by league.
- Expose clear action to return Home after saving (button label: "Save My Teams").

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
- Home My Teams rail lists saved favorites grouped by league in Team Selection order.
- Favorites remain after browser refresh.
- Removing a team removes its games from Home feed.
- Attempting to select a 21st team is blocked with an inline limit message.
- Previously saved teams appear selected/highlighted when revisiting Team Selection.
- Users can add new teams without reselecting previously saved teams.

## Dependencies

- Sports/team catalog API.
- Shared local storage key contract.

## Test Plan

- Unit: selection logic and persistence adapter.
- E2E: select favorites, save, verify Home reflects changes.
