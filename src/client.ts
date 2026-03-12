import type { FileAgentConfig } from "./types";

export class HttpClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: FileAgentConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://fileagent.dev/api").replace(/\/$/, "");

    if (!this.apiKey) {
      throw new Error("FileAgent API key is required");
    }
  }

  async post(
    path: string,
    body: BodyInit,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...headers,
      },
      body,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message =
        (errorBody as any).error ?? `HTTP ${res.status}: ${res.statusText}`;
      throw new FileAgentError(message, res.status);
    }

    return res;
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await this.post(path, JSON.stringify(body), {
      "Content-Type": "application/json",
    });
    return res.json() as Promise<T>;
  }
}

export class FileAgentError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "FileAgentError";
  }
}
