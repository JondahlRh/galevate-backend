export abstract class Dto {
  abstract toString(): string;
  abstract toJson(): Record<string, unknown>;
}
