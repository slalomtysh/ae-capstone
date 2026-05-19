# Progress Log

## 2026-05-17

- Captured product requirements for v1.
- Defined feature SPEC documents.
- Established architecture, contracts, QA strategy, and roadmap docs.
- Locked delivery order and runtime pinning policy (Angular 21, Node.js v25.6.1).
- Completed Phase 2 update of project-overview with finalized v1 constraints and UX behavior.
- Completed Phase 3 foundational documentation pass:
  - product requirements aligned to finalized decisions
  - architecture updated with runtime and stale-cache policy
  - data contracts updated with response metadata requirements
  - QA strategy updated with verification targets
  - roadmap and decision log aligned to fixed delivery order
  - README updated with runtime requirements
- Completed Phase 4 feature spec alignment pass:
  - live/recent specs updated with simplified outcome labels and stale TTL rules
  - game view spec updated for simplified outcome labels
  - backend API spec updated for strict stale TTL enforcement and metadata
- Completed Phase 5 repository setup and scaffolding:
  - initialized npm workspaces for apps and packages
  - pinned runtime via .nvmrc to Node.js v25.6.1 and engines in root package
  - scaffolded Angular web app in apps/web and aligned to Angular 21
  - scaffolded Express TypeScript API app in apps/api with health endpoint
  - scaffolded shared TypeScript package in packages/shared
  - added root scripts for targeted and aggregate workspace dev/build/lint/test
- Completed Phase 6 backend implementation:
  - implemented Express API routes for teams, live games, recent games, and game detail
  - added ESPN client with timeout and retry behavior
  - added DTO mapping with simplified outcome label normalization (Tie, Canceled, Postponed)
  - added in-memory stale-cache fallback with strict 60-minute TTL enforcement
  - added request context/logging middleware and typed error handling
  - added integration tests with mocked ESPN payloads; build and tests passing
- Completed Phase 7 frontend implementation:
  - added Angular routes and shell navigation for Home, Team Selection, and Game View
  - implemented Team Selection workflow with favorites.v1 persistence and 20-team limit enforcement
  - implemented Home screen with Live + Recent sections, 30-second auto-refresh, local-time rendering, stale indicators, and retry states
  - implemented Game View with detailed summary, simplified outcome labels, stat-group rendering, and Home navigation
  - integrated frontend API client with backend endpoints and local dev URL
  - frontend production build passing
- Completed Phase 8 hardening and quality gates (2026-05-18):
  - added ESLint rules to all workspaces (replaced placeholder lint scripts with real eslint enforcement)
  - added Prettier integration with .prettierignore
  - stabilized and enhanced unit tests: favorites service (20-cap enforcement, persistence), API service (param validation), home page (refresh lifecycle and empty states)
  - added Playwright E2E framework with core-journeys test covering team selection → home → game detail → home navigation
  - added accessibility checks via axe-core/playwright; no critical violations detected on home screen
  - all quality gates passing: npm run lint ✓, npm run format:check ✓, npm run test (20/20 passing) ✓, npm run e2e ✓, npm run a11y ✓

## 2026-05-19

- Completed reliability hardening phases for games loading:
  - Phase 1 baseline captured for API-down, query validation, and stale-fallback behavior.
  - Phase 2 frontend resilience implemented with section-isolated loading/errors and per-section retry.
  - Phase 3 backend resilience implemented with per-sport fault isolation, env-tunable upstream policy, and richer upstream error metadata.
- Completed Phase 4 verification and release guardrails:
  - updated core E2E journey selector to match current Home UX (`edit teams` entry point)
  - added E2E coverage for partial-category failure behavior on Home (one category fails, others still render)
  - validated quality gates after updates:
    - `npm run lint` ✓
    - `npm run test` ✓ (web + api)
    - `npm run e2e` ✓ (3/3)
    - `npm run a11y` ✓
  - documented deployment gates and post-release watchpoints in QA strategy.
- Open environment note:
  - local runtime check returned Node.js `v24.14.0`; release gate remains pinned to `v25.6.1`.

## Update Template

- Date:
- Completed:
- In Progress:
- Blockers:
- Next:
