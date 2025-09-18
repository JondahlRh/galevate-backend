export abstract class Dto {
  abstract toText(): string;
  abstract toJson(): Record<string, unknown>;
}
