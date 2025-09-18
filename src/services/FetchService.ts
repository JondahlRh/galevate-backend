type FetchErrorTypes = "FETCH FAILED" | "UNKNOWN ERROR";

class FetchError {
  success = false as const;
  error: FetchErrorTypes;

  constructor(error: FetchErrorTypes) {
    this.error = error;
  }
}

class FetchSuccess<T> {
  success = true as const;
  data: T;

  constructor(data: T) {
    this.data = data;
  }
}

export default class FetchService {
  private authHeader?: string;

  constructor(apiKey?: string) {
    if (apiKey !== undefined) this.authHeader = `Bearer ${apiKey}`;
  }

  async fetch<T>(url: URL) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        return new FetchError("FETCH FAILED");
      }

      const data = await response.json();
      return new FetchSuccess(data as T);
    } catch (error) {
      console.error(error);
      return new FetchError("UNKNOWN ERROR");
    }
  }
}
