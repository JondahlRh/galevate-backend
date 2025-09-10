import moment from "moment";
import { z } from "zod/v4";

import env from "../../env.js";
import FetchService from "../FetchService.js";
import type { GetFaceitType } from "./types.js";

moment.locale("de");

const FACEIT_API_BASE_URL = "https://open.faceit.com/data/v4/" as const;

export default class FaceitApiService {
  fetchServiceV4: FetchService;
  fetchServiceCustom: FetchService;

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
      if (response.success) return response.data;
      return undefined;
    }

    const response = await this.fetchPlayerByName(id);
    if (response.success) {
      const gameData = response.data.games?.[game];
      if (gameData !== undefined) return response.data;
    }

    const responseSearch = await this.fetchPlayerSearchByName(id);
    if (responseSearch.success) return responseSearch.data;

    return undefined;
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
      data: { region: regionPosition.data, country: countryPosition.data },
    };
  }

  async getToday(id: string, game: string, currentElo: number) {
    const responseAllMatches = await this.fetchTodayMatches(id, game);
    if (!responseAllMatches.success) return responseAllMatches;

    const oldestMatchId =
      responseAllMatches.data[responseAllMatches.data.length - 1]?.match_id;
    if (oldestMatchId === undefined) {
      return {
        success: true as const,
        data: { matches: 0, wins: 0, loses: 0, today: 0 , lastMatches: "No game played yet"},
      };
    }

    const responseMatchDetails =
      await this.fetchCustomMatchDetails(oldestMatchId);
    if (!responseMatchDetails.success) return responseMatchDetails;

    let oldestMatchElo: number | undefined;
    const findFaction1 = responseMatchDetails.data.teams.faction1.roster.find(
      (x) => x.id === id,
    );
    if (findFaction1 !== undefined) oldestMatchElo = findFaction1.elo;

    const findFaction2 = responseMatchDetails.data.teams.faction2.roster.find(
      (x) => x.id === id,
    );
    if (findFaction2 !== undefined) oldestMatchElo = findFaction2.elo;

    if (oldestMatchElo === undefined) {
      return { success: false as const, error: "PLAYER_NOT_IN_MATCH" as const };
    }

    const mappedAllMatches = responseAllMatches.data.map((x) => {
      const isFaction1 = x.teams?.faction1?.players?.some(
        (x) => x.player_id === id,
      );

      if (isFaction1 === undefined) return false;

      return isFaction1
        ? x.results?.winner === "faction1"
        : x.results?.winner === "faction2";
    });

    const lastMatches = mappedAllMatches.map((win) => win ? "W" : "L").join("");

    return {
      success: true as const,
      data: {
        matches: responseAllMatches.data.length,
        wins: mappedAllMatches.filter((x) => x).length,
        loses: mappedAllMatches.filter((x) => !x).length,
        today: currentElo - oldestMatchElo,
        lastMatches: lastMatches
      },
    };
  }

  async getCurrent(id: string) {
    const responseCurrentMatch = await this.fetchCustomCurrentMatch(id);
    if (!responseCurrentMatch.success) {
      return responseCurrentMatch;
    }

    if (responseCurrentMatch.data === undefined) {
      return { success: false as const, error: "NO_CURRENT_MATCH" as const };
    }

    const responseMatchDetails = await this.fetchCustomMatchDetails(
      responseCurrentMatch.data,
    );
    if (!responseMatchDetails.success) return responseMatchDetails;

    const isSuperMatch = responseMatchDetails.data.tags.includes("super");

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
    if (!response.success) return response;

    if (response.data.items === undefined || response.data.items.length === 0) {
      return { success: false as const, error: "NO_MATCHES" as const };
    }

    return { success: true as const, data: response.data.items };
  }

  private async fetchCustomMatchDetails(matchId: string) {
    const url = new URL(`https://www.faceit.com/api/match/v2/match/${matchId}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.fetchServiceCustom.fetch<any>(url);
    if (!response.success) return response;

    const factionZodObject = z.object({
      roster: z.array(z.object({ id: z.string(), elo: z.number() })),
      stats: z.object({ winProbability: z.number() }).optional(),
    });
    const matchZodObject = z.object({
      payload: z.object({
        teams: z.object({
          faction1: factionZodObject,
          faction2: factionZodObject,
        }),
        tags: z.array(z.string()),
        entity: z.object({ name: z.string() }),
        voting: z
          .object({ map: z.object({ pick: z.array(z.string()) }) })
          .optional(),
      }),
    });

    const zodResponse = matchZodObject.safeParse(response.data);
    if (!zodResponse.success) {
      return { success: false as const, error: "UNKNOWN ERROR" as const };
    }

    return { success: true as const, data: zodResponse.data.payload };
  }

  private async fetchCustomCurrentMatch(playerId: string) {
    const url = new URL(
      `https://www.faceit.com/api/match/v1/matches/groupByState?userId=${playerId}`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.fetchServiceCustom.fetch<any>(url);
    if (!response.success) return response;

    const matchZodObject = z.object({
      payload: z.record(z.string(), z.array(z.object({ id: z.string() }))),
    });
    const zodResponse = matchZodObject.safeParse(response.data);
    if (!zodResponse.success) {
      return { success: false as const, error: "NO_CURRENT_MATCH" as const };
    }

    let matchId: string | undefined;
    if (zodResponse.data.payload.ONGOING !== undefined) {
      matchId = zodResponse.data.payload.ONGOING[0]?.id;
    } else if (zodResponse.data.payload.READY !== undefined) {
      matchId = zodResponse.data.payload.READY[0]?.id;
    }

    return { success: true as const, data: matchId };
  }

  private static calculateGainLoss(
    isSuperMatch: boolean,
    isFaction1: boolean,
    winProbability: number,
  ) {
    const maxElo = isSuperMatch ? 60 : 50;
    const faction1Gain = Math.round(maxElo - winProbability * maxElo);

    if (isFaction1) return { gain: faction1Gain, loss: maxElo - faction1Gain };
    return { gain: maxElo - faction1Gain, loss: faction1Gain };
  }

  private static calculateGainLossHub(
    isFaction1: boolean,
    faction1EloAvg: number,
    faction2EloAvg: number,
  ) {
    const difFactor = Math.pow(10, (faction2EloAvg - faction1EloAvg) / 400);
    const faction1Gain = Math.round(50 * (1 - 1 / (1 + difFactor)));

    if (isFaction1) return { gain: faction1Gain, loss: 50 - faction1Gain };
    return { gain: 50 - faction1Gain, loss: faction1Gain };
  }
}
