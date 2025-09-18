import { Dto } from "./Dto.js";

export class FaceitPlayerEloRankingDto extends Dto {
  name: string;
  rank: number;
  flag: string;

  constructor(name: string, rank: number) {
    super();

    this.name = name;
    this.rank = rank;

    const codePoints = this.name
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    this.flag = String.fromCodePoint(...codePoints);
  }

  toText() {
    return `Platz ${this.rank.toString()} ${this.flag}`;
  }

  toJson() {
    return { name: this.name, rank: this.rank, flag: this.flag };
  }
}

export class FaceitPlayerEloCurrentDto extends Dto {
  name: string;
  map: string | null;
  gain: number;
  loss: number;

  constructor(name: string, map: string | null, gain: number, loss: number) {
    super();

    this.name = name;
    this.map = map;
    this.gain = gain;
    this.loss = loss;
  }

  toText() {
    return `Current: +${this.gain.toString()}/-${this.loss.toString()}`;
  }

  toJson() {
    return { name: this.name, map: this.map, gain: this.gain, loss: this.loss };
  }
}

export class FaceitPlayerEloTodayDto extends Dto {
  matches: number;
  wins: number;
  loses: number;
  elo: number;
  lastMatches: string;

  constructor(matches: number, hasWonArray: boolean[], elo: number) {
    super();

    this.matches = matches;
    this.wins = hasWonArray.filter((x) => x).length;
    this.loses = hasWonArray.filter((x) => !x).length;
    this.elo = elo;
    this.lastMatches = hasWonArray
      .map((x) => (x ? "W" : "L"))
      .slice(0, 5)
      .reverse()
      .join("");
  }

  toText() {
    let todayElo = this.elo.toString();
    if (this.elo > 0) todayElo = `+${todayElo}`;

    let result = `Today: ${todayElo}`;
    if (this.matches > 0) result += ` (${this.lastMatches})`;

    return result;
  }

  toJson() {
    return {
      matches: this.matches,
      wins: this.wins,
      loses: this.loses,
      elo: this.elo,
      lastMatches: this.lastMatches,
    };
  }
}

export default class FaceitPlayerEloDto extends Dto {
  id?: string;
  name?: string;
  level?: number;
  elo?: number;

  country?: FaceitPlayerEloRankingDto;
  region?: FaceitPlayerEloRankingDto;
  current?: FaceitPlayerEloCurrentDto;
  today?: FaceitPlayerEloTodayDto;

  addId(id: string) {
    this.id = id;
    return this;
  }

  addName(name: string) {
    this.name = name;
    return this;
  }

  addLevel(level: number) {
    this.level = level;
    return this;
  }

  addElo(elo: number) {
    this.elo = elo;
    return this;
  }

  addCountry(country: FaceitPlayerEloRankingDto) {
    this.country = country;
    return this;
  }

  addRegion(region: FaceitPlayerEloRankingDto) {
    this.region = region;
    return this;
  }

  addCurrent(current: FaceitPlayerEloCurrentDto) {
    this.current = current;
    return this;
  }

  addToday(today: FaceitPlayerEloTodayDto) {
    this.today = today;
    return this;
  }

  toText() {
    const text: string[] = [];

    const level = this.level ?? 0;
    const elo = this.elo ?? 0;

    text.push(
      `${this.name ?? ""} ist FaceIT Level ${level.toString()}, Elo ${elo.toString()}`,
    );
    if (this.country !== undefined) text.push(this.country.toText());
    if (this.current !== undefined) text.push(this.current.toText());
    if (this.today !== undefined) text.push(this.today.toText());

    return text.join(" - ");
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      elo: this.elo,
      country: this.country !== undefined ? this.country.toJson() : undefined,
      region: this.region !== undefined ? this.region.toJson() : undefined,
      current: this.current !== undefined ? this.current.toJson() : undefined,
      today: this.today !== undefined ? this.today.toJson() : undefined,
    };
  }
}
