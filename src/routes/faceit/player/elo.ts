import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";

import FaceitPlayerEloDto, {
  FaceitPlayerEloCurrentDto,
  FaceitPlayerEloRankingDto,
  FaceitPlayerEloTodayDto,
} from "../../../classes/FaceitPlayerEloDto.js";
import type FaceitApiService from "../../../services/faceitApiService/FaceitApiService.js";
import type JsonLoggerService from "../../../services/jsonLoggerService/jsonLoggerService.js";

type Config = {
  faceitApiService: FaceitApiService;
  loggerServicePlayerIds: JsonLoggerService;
  loggerServiceUsers: JsonLoggerService;
  loggerServiceBots: JsonLoggerService;
};

export default function elo(app: FastifyInstance, options: { config: Config }) {
  const {
    faceitApiService,
    loggerServicePlayerIds,
    loggerServiceUsers,
    loggerServiceBots,
  } = options.config;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "",
    schema: {
      params: z.object({ id: z.string() }),
      querystring: z
        .object({
          format: z.enum(["json", "text"]),
          nickname: z.string(),
          game: z.enum(["cs2", "csgo"]),

          minimal: z.stringbool(),

          position: z.stringbool(),
          today: z.stringbool(),
          current: z.stringbool(),
        })
        .partial(),
      response: { 200: z.any() },
    },
    handler: async (req, res) => {
      const {
        format = "text",
        nickname,
        game = "cs2",
        minimal = false,
        position = false,
        today = false,
        current = false,
      } = req.query;

      const returnData = new FaceitPlayerEloDto();

      let id = nickname;
      if (id === undefined || id.length === 0) {
        id = req.params.id;
      }

      const player = await faceitApiService.getPlayer(id, game);
      if (
        player === undefined ||
        player.player_id === undefined ||
        player.nickname === undefined
      ) {
        return res.code(200).send("player not found");
      }

      returnData.addId(player.player_id).addName(player.nickname);

      // get player elo
      const gameData = player.games?.[game];
      if (
        gameData === undefined ||
        gameData.skill_level === undefined ||
        gameData.faceit_elo === undefined
      ) {
        return res.code(200).send(`player did not play ${game} yet`);
      }
      returnData.addLevel(gameData.skill_level).addElo(gameData.faceit_elo);

      // get player position
      if (!minimal || position) {
        if (gameData.region === undefined || player.country === undefined) {
          return res.code(200).send(`player did not play ${game} yet`);
        }

        const response = await faceitApiService.getPosition(
          player.player_id,
          game,
          gameData.region,
          player.country,
        );
        if (
          !response.success ||
          response.data.country.position === undefined ||
          response.data.region.position === undefined
        ) {
          return res.code(200).send(`player did not play ${game} yet`);
        }

        returnData.addCountry(
          new FaceitPlayerEloRankingDto(
            player.country,
            response.data.country.position,
          ),
        );
        returnData.addRegion(
          new FaceitPlayerEloRankingDto(
            gameData.region,
            response.data.region.position,
          ),
        );
      }

      // get player today elo
      if (!minimal || today) {
        const response = await faceitApiService.getToday(
          player.player_id,
          game,
          gameData.faceit_elo,
        );

        if (response.error === "NO_MATCHES") {
          returnData.addToday(new FaceitPlayerEloTodayDto(0, 0, 0, 0, "No Game played today"));
        }

        if (response.success) {
          returnData.addToday(
            new FaceitPlayerEloTodayDto(
              response.data.matches,
              response.data.wins,
              response.data.loses,
              response.data.today,
            ),
          );
        }
      }

      // get player current elo
      if (!minimal || current) {
        const response = await faceitApiService.getCurrent(player.player_id);
        if (response.success) {
          returnData.addCurrent(
            new FaceitPlayerEloCurrentDto(
              response.data.name,
              response.data.map,
              response.data.gain,
              response.data.loss,
            ),
          );
        }
      }

      loggerServicePlayerIds.log(player.player_id);

      const userAgentHeader = req.headers["user-agent"];
      if (userAgentHeader !== undefined) {
        loggerServiceBots.log(userAgentHeader);
      }

      const nightBotHeader = req.headers["nightbot-channel"];
      if (nightBotHeader !== undefined && typeof nightBotHeader === "string") {
        const params = new URLSearchParams(nightBotHeader);
        const twitchName = params.get("name");

        if (twitchName !== null) loggerServiceUsers.log(twitchName);
      }

      if (format === "json") {
        return res.code(200).send(returnData.toJson());
      }
      return res.code(200).send(returnData.toBotString());
    },
  });
}
