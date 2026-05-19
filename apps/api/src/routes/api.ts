import { Router } from 'express';
import { NCAAF_CONFERENCE_GROUP_IDS } from '../config.js';
import { MemoryCache } from '../lib/cache.js';
import { withStaleFallback } from '../lib/withStaleFallback.js';
import { parseDays, parseSports, parseTimeZone, requireSport, requireTeamIds } from '../lib/query.js';
import { buildStandingsUrl, buildTeamsUrl } from '../espn/urls.js';
import { mapConferenceByTeamIdFromStandings, mapTeams } from '../espn/mappers.js';
import {
  fetchGameDetail,
  fetchLiveGames,
  fetchRecentGames,
  fetchUpcomingGames,
} from '../services/gamesService.js';
import type { EspnClient } from '../types.js';

export function createApiRouter(espnClient: EspnClient, cache: MemoryCache): Router {
  const router = Router();

  router.get('/teams', async (req, res, next) => {
    try {
      const sport = requireSport(req.query.sport);
      const cacheKey = `teams:${sport}`;
      const response = await withStaleFallback(cache, cacheKey, async () => {
        const payload =
          sport === 'ncaaf'
            ? await fetchNcaafTeamsByConferenceGroups(espnClient)
            : await espnClient.getJson<any>(buildTeamsUrl(sport));
        const isCollegeSport = sport === 'ncaaf' || sport === 'ncaam';
        if (!isCollegeSport) {
          return mapTeams(payload);
        }

        try {
          const standingsPayload = await espnClient.getJson<any>(buildStandingsUrl(sport));
          const conferenceByTeamId = mapConferenceByTeamIdFromStandings(standingsPayload);
          return mapTeams(payload, conferenceByTeamId);
        } catch {
          return mapTeams(payload);
        }
      });
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  router.get('/games/live', async (req, res, next) => {
    try {
      const teamIds = requireTeamIds(req.query.teamIds);
      const sports = parseSports(req.query.sports);
      const timeZone = parseTimeZone(req.query.timezone);
      const cacheKey = `games:live:${sports.join('|')}:${teamIds.join('|')}:${timeZone}`;
      const response = await withStaleFallback(cache, cacheKey, () =>
        fetchLiveGames(espnClient, sports, teamIds, timeZone),
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  router.get('/games/upcoming', async (req, res, next) => {
    try {
      const teamIds = requireTeamIds(req.query.teamIds);
      const sports = parseSports(req.query.sports);
      const timeZone = parseTimeZone(req.query.timezone);
      const cacheKey = `games:upcoming:${sports.join('|')}:${teamIds.join('|')}:${timeZone}`;
      const response = await withStaleFallback(cache, cacheKey, () =>
        fetchUpcomingGames(espnClient, sports, teamIds, timeZone),
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  router.get('/games/recent', async (req, res, next) => {
    try {
      const teamIds = requireTeamIds(req.query.teamIds);
      const sports = parseSports(req.query.sports);
      const days = parseDays(req.query.days, 7);
      const timeZone = parseTimeZone(req.query.timezone);
      const cacheKey = `games:recent:${sports.join('|')}:${teamIds.join('|')}:${days}:${timeZone}`;
      const response = await withStaleFallback(cache, cacheKey, () =>
        fetchRecentGames(espnClient, sports, teamIds, days, timeZone),
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  router.get('/games/:eventId', async (req, res, next) => {
    try {
      const eventId = req.params.eventId;
      const sport = requireSport(req.query.sport);
      const cacheKey = `games:detail:${sport}:${eventId}`;
      const response = await withStaleFallback(cache, cacheKey, () =>
        fetchGameDetail(espnClient, sport, eventId),
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function fetchNcaafTeamsByConferenceGroups(espnClient: EspnClient): Promise<any> {
  const payloads = await Promise.all(
    NCAAF_CONFERENCE_GROUP_IDS.map((groupId) => espnClient.getJson<any>(buildTeamsUrl('ncaaf', groupId))),
  );

  const firstSport = payloads[0]?.sports?.[0] ?? {};
  const mergedLeagues = payloads.flatMap((payload) => payload?.sports?.[0]?.leagues ?? []);

  return {
    sports: [
      {
        ...firstSport,
        leagues: mergedLeagues,
      },
    ],
  };
}
