import { Router } from 'express';
import { MemoryCache } from '../lib/cache.js';
import { withStaleFallback } from '../lib/withStaleFallback.js';
import { parseDays, parseSports, requireSport, requireTeamIds } from '../lib/query.js';
import { buildTeamsUrl } from '../espn/urls.js';
import { mapTeams } from '../espn/mappers.js';
import { fetchGameDetail, fetchLiveGames, fetchRecentGames } from '../services/gamesService.js';
import type { EspnClient } from '../types.js';

export function createApiRouter(espnClient: EspnClient, cache: MemoryCache): Router {
  const router = Router();

  router.get('/teams', async (req, res, next) => {
    try {
      const sport = requireSport(req.query.sport);
      const cacheKey = `teams:${sport}`;
      const response = await withStaleFallback(cache, cacheKey, async () => {
        const payload = await espnClient.getJson<any>(buildTeamsUrl(sport));
        return mapTeams(payload);
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
      const cacheKey = `games:live:${sports.join('|')}:${teamIds.join('|')}`;
      const response = await withStaleFallback(cache, cacheKey, () => fetchLiveGames(espnClient, sports, teamIds));
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
      const cacheKey = `games:recent:${sports.join('|')}:${teamIds.join('|')}:${days}`;
      const response = await withStaleFallback(cache, cacheKey, () => fetchRecentGames(espnClient, sports, teamIds, days));
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
      const response = await withStaleFallback(cache, cacheKey, () => fetchGameDetail(espnClient, sport, eventId));
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
