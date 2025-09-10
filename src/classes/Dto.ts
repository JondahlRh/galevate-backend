export abstract class Dto {
  abstract toNightbotString(): string;
  abstract toJson(): Record<string, unknown>;
}
