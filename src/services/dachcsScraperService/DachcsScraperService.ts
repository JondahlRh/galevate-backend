import moment from "moment";
import puppeteer, { Browser } from "puppeteer";

import env from "../../env.js";
import type { DachcsMatch } from "./types.js";

moment.locale("de");

export default class DachcsScraperService {
  private browser;
  matches: Map<string, DachcsMatch> = new Map();

  private constructor(browser: Browser) {
    this.browser = browser;
  }

  static async init() {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    return new DachcsScraperService(browser);
  }

  async main() {
    const loginResult = await this.login();
    if (!loginResult.success) return;

    const matchIds = await this.getMatchIds();

    for (const id of matchIds) {
      const match = await this.getMatchDetails(id);
      if (match === null) continue;

      this.matches.set(match.faceitId, match);
    }

    const twoDaysAgo = moment().subtract(8, "days");
    for (const [id, match] of this.matches) {
      if (moment(match.date, "DD.MM.YYYY HH:mm").isBefore(twoDaysAgo)) {
        this.matches.delete(id);
      }
    }
  }

  private async login() {
    const page = await this.browser.newPage();

    await page.goto("https://user.dachcs.de/login.php");

    const inputNickname = await page.$("#inputNickname");
    if (inputNickname === null) {
      return { success: false, error: "NICKNAME_NOT_FOUND" };
    }
    await inputNickname.type(env.DACHCS_USERNAME);

    const inputPassword = await page.$("#inputPassword3");
    if (inputPassword === null) {
      return { success: false, error: "PASSWORD_NOT_FOUND" };
    }
    await inputPassword.type(env.DACHCS_PASSWORD);

    const submitButton = await page.$('button[type="submit"]');
    if (submitButton === null) {
      return { success: false, error: "SUBMIT_BUTTON_NOT_FOUND" };
    }
    await submitButton.click();

    await page.waitForNavigation();

    await page.close();

    return { success: true };
  }

  private async getMatchIds() {
    const page = await this.browser.newPage();
    await page.goto(`https://user.dachcs.de/orga/${env.DACHCS_ORGANIZATION}`);
    const rawMatches = await page.$$(
      ".row.text-white.d-flex.align-items-center",
    );

    const matchIds: number[] = [];
    for (const rawMatch of rawMatches) {
      const isDone = await rawMatch.evaluate((el) => {
        const htmlEl = el.children[3]?.children[0];
        return htmlEl instanceof HTMLElement && htmlEl.innerText !== "-";
      });
      if (isDone) continue;

      const id = await rawMatch.evaluate((el) => {
        const htmlEL = el.children[6]?.children[0];
        return htmlEL instanceof HTMLAnchorElement
          ? htmlEL.href.split("/").pop()
          : undefined;
      });
      if (id === undefined || isNaN(parseInt(id))) continue;

      matchIds.push(parseInt(id));
    }

    await page.close();

    return matchIds;
  }

  private async getMatchDetails(id: number) {
    const page = await this.browser.newPage();
    await page.goto(`https://user.dachcs.de/match/${id.toString()}`);

    await page.waitForSelector("#contentcontainer");
    const matchDetails = await page.$("#contentcontainer");
    if (matchDetails === null) return null;

    const faceitId = await matchDetails.evaluate((el) => {
      const anchor = el.querySelector('a[href^="https://www.faceit.com/"]');
      if (anchor !== null && anchor instanceof HTMLAnchorElement) {
        return anchor.href.split("/").pop();
      }
    });
    if (faceitId === undefined) return null;

    let [teamLeftName, teamRightName] = await matchDetails.evaluate((el) => {
      const anchorList = el.querySelectorAll('a[href^="team/"]');

      return Array.from(anchorList).map((anchor) =>
        anchor instanceof HTMLAnchorElement ? anchor.innerText : "",
      );
    });
    if (teamLeftName === undefined || teamRightName === undefined) return null;

    if (
      teamRightName.startsWith("FL - ") ||
      teamRightName === "FruchtLabor" ||
      teamRightName === "FruchtLabor X"
    ) {
      const tmp = teamLeftName;
      teamLeftName = teamRightName;
      teamRightName = tmp;
    }

    let twitchChannelUrl: URL | undefined = undefined;
    const twitchRaw = await page.$("#twitch-container");
    if (twitchRaw !== null) {
      const twitchLink = await twitchRaw.evaluate((el) => {
        const htmlEl = el.children[0]?.children[0];
        if (htmlEl instanceof HTMLIFrameElement) return htmlEl.src;
      });
      twitchChannelUrl = new URL(twitchLink ?? "");
    }

    const dateRaw = await matchDetails.evaluate((el) => {
      const container =
        el.children[0]?.children[0]?.children[1]?.children[0]?.children[1]
          ?.children[3];
      const date = container?.children[0];
      const time = container?.children[1];

      if (date instanceof HTMLElement && time instanceof HTMLElement) {
        return [date.innerText, time.innerText];
      }

      return ["", ""];
    });

    const dateDay = dateRaw[0] ?? "";
    const dateTime = dateRaw[1] ?? "";
    const date = moment(`${dateDay} ${dateTime}`, "DD.MM.YYYY HH:mm");

    const matchReady = (await page.$("#cast")) !== null;
    let status: DachcsMatch["status"];
    if (matchReady) {
      status = "CLAIMABLE";
    } else if (twitchChannelUrl !== undefined) {
      status = "CLAIMED";
    } else {
      status = "NOT_READY";
    }

    const twitchChannelName =
      twitchChannelUrl?.searchParams.get("channel") ?? undefined;

    await page.close();

    return {
      id,
      faceitId,
      status,
      teamLeftName,
      teamRightName,
      twitchChannelName,
      date: date.format("DD.MM.YYYY, HH:mm [Uhr]"),
    };
  }
}
