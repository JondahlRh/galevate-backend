import type { DachcsMatch } from "./dachcsScraperService/types.js";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class CalenderService {
  static mapMatchEventData(data: {
    teamLeftName: string;
    teamRightName: string;
    scheduled_at: number | undefined;
    faceit_url: string;
    dachcsMatch: DachcsMatch | undefined;
  }) {
    const faceitMatchroomUrl = data.faceit_url.replace("{lang}", "en");

    let title = `${data.teamLeftName} vs ${data.teamRightName}`;
    const descriptionArray = [
      `DACHCS Masters Match:`,
      title,
      `Faceit Matchroom: ${faceitMatchroomUrl}`,
    ];
    let url = faceitMatchroomUrl;

    if (data.dachcsMatch !== undefined) {
      if (data.dachcsMatch.status === "CLAIMABLE") {
        title = `[BESTÄTIGT] ${title}`;
      } else if (data.dachcsMatch.status === "CLAIMED") {
        title = `[LIVE] ${title}`;
      }

      const dachcsMatchLink = `https://dachcs.de/coverage/match/${data.dachcsMatch.id.toString()}`;

      descriptionArray.push(`DACHCS Match: ${dachcsMatchLink}`);
      url = dachcsMatchLink;

      if (data.dachcsMatch.twitchChannelName !== undefined) {
        const twitchUrl = `https://twitch.tv/${data.dachcsMatch.twitchChannelName}`;
        descriptionArray.push(`Twitch: ${twitchUrl}`);

        url = twitchUrl;
      }
    }

    return {
      start: (data.scheduled_at ?? 0) * 1000,
      title,
      description: descriptionArray.join("\n"),
      duration: { hours: 2 },
      url,
    };
  }
}
