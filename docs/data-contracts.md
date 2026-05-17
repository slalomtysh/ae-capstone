# Data Contracts

## Frontend Local Storage
- Key: favorites.v1
- Value: array of objects with teamId, sport, teamName
- Constraint: maximum 20 teams

## API DTOs (Draft)

### GameSummaryDto
- eventId: string
- sport: string
- status: pre | live | final | delayed | postponed
- startTimeUtc: string
- homeTeam: TeamScoreDto
- awayTeam: TeamScoreDto
- venue: string | null

### ResponseMetaDto
- isStale: boolean
- lastSuccessfulRefreshUtc: string | null
- generatedAtUtc: string
- staleTtlMinutes: number (fixed at 60 in v1)

### TeamScoreDto
- teamId: string
- displayName: string
- abbreviation: string
- logoUrl: string | null
- score: number | null
- record: string | null

### GameDetailDto
- summary: GameSummaryDto
- teamStats: array
- playerStats: array

## Contract Governance
- Any DTO change requires update to this document and matching tests.
- API responses that include game lists/details must include ResponseMetaDto.
