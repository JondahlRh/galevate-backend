export abstract class Dto {
  abstract toBotString(): string;
  abstract toJson(): Record<string, unknown>;
}
