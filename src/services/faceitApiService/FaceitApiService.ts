import moment from "moment";
import { z } from "zod/v4";

import env from "../../env.js";
import CacheService from "../CacheService.js";
import FetchService from "../FetchService.js";
import {
  customCurrentMatchZodObject,
  customMatchDetailsZodObject,
  matchReturnZodObject,
  playerZodObject,
} from "./schemas.js";
import type { GetFaceitType, MatchReturn } from "./types.js";

moment.locale("de");

const FACEIT_API_BASE_URL = "https://open.faceit.com/data/v4/" as const;
const MATCHES_OFFSET = 100 as const;

export default class FaceitApiService {
  fetchServiceV4: FetchService;
  fetchServiceCustom: FetchService;

  private cacheService = new CacheService<MatchReturn["items"]>(60 * 60 * 1000);

  private constructor() {
    this.fetchServiceV4 = new FetchService(env.FACEIT_API_KEY);
    this.fetchServiceCustom = new FetchService();
  }

  static connect() {
    return new FaceitApiService();
  }

  async getPlayer(id: string, game = "cs2") {
    const isUUID = z.uuidv4().safeParse(id).success;
    if (isUUID) {
      const response = await this.fetchPlayerByUuid(id);
      if (!response.success) {
        return {
          success: false as const,
          error: "PLAYER_NOT_FOUND" as const,
        };
      }

      const zodResponse = playerZodObject.safeParse(response.data);
      if (!zodResponse.success) {
        return { success: false as const, error: "ZOD_ERROR" as const };
      }

      return { success: true as const, data: zodResponse.data };
    }

    const responseName = await this.fetchPlayerByName(id);
    if (responseName.success && responseName.data.games?.[game] !== undefined) {
      const zodResponse = playerZodObject.safeParse(responseName.data);
      if (!zodResponse.success) {
        return { success: false as const, error: "ZOD_ERROR" as const };
      }

      return { success: true as const, data: zodResponse.data };
    }

    const responseSearch = await this.fetchPlayerSearchByName(id);
    if (!responseSearch.success) {
      return {
        success: false as const,
        error: "PLAYER_NOT_FOUND" as const,
      };
    }

    const zodResponse = playerZodObject.safeParse(responseSearch.data);
    if (!zodResponse.success) {
      return { success: false as const, error: "ZOD_ERROR" as const };
    }

    return { success: true as const, data: zodResponse.data };
  }

  async getPosition(id: string, game: string, region: string, country: string) {
    const regionPosition = await this.fetchPlayerRanking(game, region, id);
    if (!regionPosition.success) {
      return {
        success: false as const,
        error: "PLAYER_DID_NOT_PLAY_YET" as const,
      };
    }

    const countryPosition = await this.fetchPlayerRanking(
      game,
      region,
      id,
      country,
    );
    if (!countryPosition.success) {
      return {
        success: false as const,
        error: "PLAYER_DID_NOT_PLAY_YET" as const,
      };
    }

    return {
      success: true as const,
      data: {
        region: regionPosition.data.position ?? 0,
        country: countryPosition.data.position ?? 0,
      },
    };
  }

  async getToday(id: string, game: string, currentElo: number) {
    const responseAllMatches = await this.fetchTodayMatches(id, game);
    if (!responseAllMatches.success) {
      return {
        success: false as const,
        error: "MATCHES_NOT_FOUND" as const,
      };
    }

    const lastIndex = responseAllMatches.data.length - 1;
    const oldestMatchId = responseAllMatches.data[lastIndex]?.match_id;
    if (oldestMatchId === undefined) {
      return {
        success: true as const,
        data: { matches: 0, hasWonArray: [], today: 0 },
      };
    }

    const responseMatchDetails =
      await this.fetchCustomMatchDetails(oldestMatchId);
    if (!responseMatchDetails.success) {
      return {
        success: false as const,
        error: "MATCH_DETAILS_NOT_FOUND" as const,
      };
    }

    let oldestMatchPlayer =
      responseMatchDetails.data.teams.faction1.roster.find((x) => x.id === id);
    if (oldestMatchPlayer === undefined) {
      oldestMatchPlayer = responseMatchDetails.data.teams.faction2.roster.find(
        (x) => x.id === id,
      );
    }

    if (oldestMatchPlayer === undefined) {
      return {
        success: false as const,
        error: "PLAYER_NOT_IN_MATCH" as const,
      };
    }

    const hasWonArray = responseAllMatches.data.map((x) => {
      const isFaction1 = x.teams?.faction1?.players?.some(
        (x) => x.player_id === id,
      );

      if (isFaction1 === undefined) return false;

      return isFaction1
        ? x.results?.winner === "faction1"
        : x.results?.winner === "faction2";
    });

    return {
      success: true as const,
      data: {
        matches: responseAllMatches.data.length,
        today: currentElo - oldestMatchPlayer.elo,
        hasWonArray,
      },
    };
  }

  async getCurrent(id: string) {
    const responseCurrentMatch = await this.fetchCustomCurrentMatch(id);
    if (!responseCurrentMatch.success) {
      return {
        success: false as const,
        error: "NO_CURRENT_MATCH" as const,
      };
    }

    const responseMatchDetails = await this.fetchCustomMatchDetails(
      responseCurrentMatch.data,
    );
    if (!responseMatchDetails.success) {
      return {
        success: false as const,
        error: "NO_CURRENT_MATCH" as const,
      };
    }

    const isSuperMatch =
      responseMatchDetails.data.tags?.includes("super") ?? false;

    const { faction1, faction2 } = responseMatchDetails.data.teams;
    const isFaction1 = faction1.roster.some((x) => x.id === id);
    const isHub = faction1.stats === undefined;

    const faction1EloSum = faction1.roster.reduce((a, b) => a + b.elo, 0);
    const faction2EloSum = faction2.roster.reduce((a, b) => a + b.elo, 0);

    const faction1EloAvg = faction1EloSum / faction1.roster.length;
    const faction2EloAvg = faction2EloSum / faction2.roster.length;

    let gainLossData: { gain: number; loss: number };
    if (isHub) {
      gainLossData = FaceitApiService.calculateGainLossHub(
        isFaction1,
        faction1EloAvg,
        faction2EloAvg,
      );
    } else {
      gainLossData = FaceitApiService.calculateGainLoss(
        isSuperMatch,
        isFaction1,
        faction1.stats?.winProbability ?? 0.5,
      );
    }

    return {
      success: true as const,
      data: {
        name: responseMatchDetails.data.entity.name,
        map: responseMatchDetails.data.voting?.map.pick[0] ?? null,
        gain: gainLossData.gain,
        loss: gainLossData.loss,
      },
    };
  }

  async getTeamMatchesOfChampionship(teamId: string, championshipId: string) {
    const response = await this.getMatchesOfChampionship(championshipId);

    const matches = response.data
      .filter((x) => {
        const isFaction1 = x.teams.faction1.faction_id === teamId;
        const isFaction2 = x.teams.faction2.faction_id === teamId;
        return isFaction1 || isFaction2;
      })
      .map((x) => ({
        start: (x.scheduled_at ?? 0) * 1000,
        title: `${x.teams.faction1.name} vs ${x.teams.faction2.name}`,
        description: `DACHCS Match:\n ${x.teams.faction1.name} vs ${x.teams.faction2.name}`,
        duration: { hours: 2 },
        url: x.faceit_url.replace("{lang}", "en"),
      }));

    return { success: true as const, data: matches };
  }

  private async fetchPlayerByUuid(id: string) {
    const url = new URL(FACEIT_API_BASE_URL);
    url.pathname += `/players/${id}`;

    const response =
      await this.fetchServiceV4.fetch<GetFaceitType<"/players/{player_id}">>(
        url,
      );
    if (!response.success) return response;

    return { success: true as const, data: response.data };
  }

  private async fetchPlayerByName(name: string) {
    const url = new URL(FACEIT_API_BASE_URL);
    url.pathname += "/players";
    url.searchParams.append("nickname", name);

    const responseSearch =
      await this.fetchServiceV4.fetch<GetFaceitType<"/players">>(url);
    if (!responseSearch.success) return responseSearch;

    return { success: true as const, data: responseSearch.data };
  }

  private async fetchPlayerSearchByName(name: string) {
    const url = new URL(FACEIT_API_BASE_URL);
    url.pathname += "/search/players";
    url.searchParams.append("nickname", name);
    url.searchParams.append("limit", "1");

    const responseSearch =
      await this.fetchServiceV4.fetch<GetFaceitType<"/search/players">>(url);
    if (!responseSearch.success) return responseSearch;

    if (
      responseSearch.data.items === undefined ||
      responseSearch.data.items[0] === undefined ||
      responseSearch.data.items[0].player_id === undefined
    ) {
      return { success: false as const, error: "PLAYER NOT FOUND" as const };
    }

    const playerId = responseSearch.data.items[0].player_id;
    const response = await this.fetchPlayerByUuid(playerId);
    if (!response.success) return response;

    return { success: true as const, data: response.data };
  }

  private async fetchPlayerRanking(
    game: string,
    region: string,
    playerId: string,
    country?: string,
  ) {
    const url = new URL(FACEIT_API_BASE_URL);
    url.pathname += `rankings/games/${game}/regions/${region}/players/${playerId}`;
    if (country !== undefined) url.searchParams.append("country", country);

    const response =
      await this.fetchServiceV4.fetch<
        GetFaceitType<"/rankings/games/{game_id}/regions/{region}/players/{player_id}">
      >(url);
    if (!response.success) return response;

    const rankingPlayerData = response.data.items?.find(
      (x) => x.player_id === playerId,
    );
    if (rankingPlayerData === undefined) {
      return { success: false as const, error: "PLAYER NOT FOUND" as const };
    }

    return { success: true as const, data: rankingPlayerData };
  }

  private async fetchTodayMatches(id: string, game: string) {
    const url = new URL(FACEIT_API_BASE_URL);
    url.pathname += `/players/${id}/history`;
    url.searchParams.append("game", game);

    const now = moment();
    if (now.get("hours") > 4) {
      const todayFourOclock = now
        .set("hours", 4)
        .set("minutes", 0)
        .set("seconds", 0);
      url.searchParams.append("from", todayFourOclock.unix().toString());
    } else {
      const yesterdayFourOclock = now
        .set("hours", 4)
        .set("minutes", 0)
        .set("seconds", 0)
        .subtract(1, "days");
      url.searchParams.append("from", yesterdayFourOclock.unix().toString());
    }

    const response =
      await this.fetchServiceV4.fetch<
        GetFaceitType<"/players/{player_id}/history">
      >(url);
    if (!response.success || response.data.items === undefined) {
      return { success: false as const, error: "UNKNOWN_ERROR" as const };
    }

    return { success: true as const, data: response.data.items };
  }

  private async fetchCustomMatchDetails(matchId: string) {
    const url = new URL(`https://www.faceit.com/api/match/v2/match/${matchId}`);
    const response = await this.fetchServiceCustom.fetch(url);
    if (!response.success) return response;

    const zodResponse = customMatchDetailsZodObject.safeParse(response.data);
    if (!zodResponse.success) {
      return { success: false as const, error: "ZOD_ERROR" as const };
    }

    return { success: true as const, data: zodResponse.data.payload };
  }

  private async fetchCustomCurrentMatch(playerId: string) {
    const url = new URL(
      `https://www.faceit.com/api/match/v1/matches/groupByState?userId=${playerId}`,
    );
    const response = await this.fetchServiceCustom.fetch(url);
    if (!response.success) return response;

    const zodResponse = customCurrentMatchZodObject.safeParse(response.data);
    if (!zodResponse.success) {
      return { success: false as const, error: "ZOD_ERROR" as const };
    }

    let matchId: string | undefined;
    if (zodResponse.data.payload.ONGOING !== undefined) {
      matchId = zodResponse.data.payload.ONGOING[0]?.id;
    } else if (zodResponse.data.payload.READY !== undefined) {
      matchId = zodResponse.data.payload.READY[0]?.id;
    }

    if (matchId === undefined) {
      return { success: false as const, error: "NO_CURRENT_MATCH" as const };
    }

    return { success: true as const, data: matchId };
  }

  private async getMatchesOfChampionship(championshipId: string) {
    const cached = this.cacheService.get(championshipId);
    if (cached !== undefined) return { success: true as const, data: cached };

    const url = new URL(FACEIT_API_BASE_URL);
    url.pathname += `championships/${championshipId}/matches`;
    url.searchParams.set("type", "all");
    url.searchParams.set("limit", MATCHES_OFFSET.toString());
    url.searchParams.set("offset", "0");

    const matches: MatchReturn["items"] = [];
    let offset = 0;
    let hasMore = true;
    do {
      const response =
        await this.fetchServiceV4.fetch<
          GetFaceitType<"/championships/{championship_id}/matches">
        >(url);
      if (!response.success) break;

      const zodResponse = matchReturnZodObject.safeParse(response.data);
      if (!zodResponse.success) break;

      matches.push(...zodResponse.data.items);

      offset += MATCHES_OFFSET;
      url.searchParams.set("offset", offset.toString());

      hasMore = zodResponse.data.items.length === MATCHES_OFFSET;
    } while (hasMore);

    this.cacheService.set(championshipId, matches);

    return { success: true as const, data: matches };
  }

  private static calculateGainLoss(
    isSuperMatch: boolean,
    isFaction1: boolean,
    winProbability: number,
  ) {
    const MAX_ELO = isSuperMatch ? 60 : 50;
    const faction1Gain = Math.round(MAX_ELO - winProbability * MAX_ELO);

    if (isFaction1) return { gain: faction1Gain, loss: MAX_ELO - faction1Gain };
    return { gain: MAX_ELO - faction1Gain, loss: faction1Gain };
  }

  private static calculateGainLossHub(
    isFaction1: boolean,
    faction1EloAvg: number,
    faction2EloAvg: number,
  ) {
    const MAX_ELO = 50;

    const difFactor = Math.pow(10, (faction2EloAvg - faction1EloAvg) / 400);
    const faction1Gain = Math.round(MAX_ELO * (1 - 1 / (1 + difFactor)));

    if (isFaction1) return { gain: faction1Gain, loss: MAX_ELO - faction1Gain };
    return { gain: MAX_ELO - faction1Gain, loss: faction1Gain };
  }
}
