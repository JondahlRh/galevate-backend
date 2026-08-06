import z from "zod/v4";

import FetchService from "./FetchService.js";

const VOLANTA_CURRENT_FLIGHTS_URL =
  "https://webassets.volanta.app/volanta-flight-positions.json";

export const volantaZodObject = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      networkUserName: z.string(),
    }),
  ),
});

export default class VolantaService {
  fetchService: FetchService;

  constructor() {
    this.fetchService = new FetchService();
  }

  static connect() {
    return new VolantaService();
  }

  async getCurrentFlight(username: string) {
    const url = new URL(VOLANTA_CURRENT_FLIGHTS_URL);
    const response = await this.fetchService.fetch(url);
    if (!response.success) return;

    const zodResponse = volantaZodObject.safeParse(response.data);
    if (!zodResponse.success) return;

    const found = zodResponse.data.data.find(
      (x) =>
        x.networkUserName.toLocaleLowerCase() === username.toLocaleLowerCase(),
    );
    if (found === undefined) return;

    console.log(found);

    return `https://fly.volanta.app/flights/${found.id}/details`;
  }
}
