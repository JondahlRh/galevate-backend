import type { paths } from "./swaggerTypes.js";

export type GetFaceitType<T extends keyof paths> =
  paths[T]["get"]["responses"] extends {
    200?: { content?: { "application/json"?: infer K } };
  }
    ? K
    : never;
