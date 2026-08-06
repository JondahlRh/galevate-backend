import fs from "fs";
import path from "path";

export default class JsonLoggerService {
  private fileName: string;

  private constructor(fileName: string) {
    this.fileName = fileName;
  }

  static connect(fileName: string) {
    return new JsonLoggerService(fileName);
  }

  log(key: string) {
    const json = this.readJson();
    json[key] = (json[key] ?? 0) + 1;
    this.writeJson(json);
  }

  private readJson() {
    try {
      const fileParh = path.join(process.cwd(), "log-data", this.fileName);
      const file = fs.readFileSync(fileParh, "utf8");
      return JSON.parse(file) as Record<string, number>;
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      if (error.code === "ENOENT") return {}; // eslint-disable-line @typescript-eslint/no-unsafe-member-access

      throw new Error("Failed to read player log file!");
    }
  }

  private writeJson(data: Record<string, number>) {
    const fileParh = path.join(process.cwd(), "log-data", this.fileName);
    const file = JSON.stringify(data, null, 2);
    fs.writeFileSync(fileParh, file);
  }
}
