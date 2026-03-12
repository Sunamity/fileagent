import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClient, FileAgentError } from "../client";

describe("HttpClient", () => {
  it("throws if apiKey is missing", () => {
    expect(() => new HttpClient({ apiKey: "", baseUrl: "https://example.com" }))
      .toThrow("API key is required");
  });

  it("throws if baseUrl is missing", () => {
    expect(() => new HttpClient({ apiKey: "fa_live_test", baseUrl: "" }))
      .toThrow("baseUrl is required");
  });

  it("strips trailing slash from baseUrl", () => {
    const client = new HttpClient({
      apiKey: "fa_live_test",
      baseUrl: "https://example.com/",
    });
    // Access private field via any to verify
    expect((client as any).baseUrl).toBe("https://example.com");
  });

  describe("post", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("sends Authorization header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const client = new HttpClient({
        apiKey: "fa_live_abc",
        baseUrl: "https://api.example.com",
      });

      await client.post("/v1/convert", "body");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/v1/convert",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer fa_live_abc",
          }),
        }),
      );
    });

    it("throws FileAgentError on non-ok response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "Invalid API key" }),
      }));

      const client = new HttpClient({
        apiKey: "fa_live_bad",
        baseUrl: "https://api.example.com",
      });

      await expect(client.post("/v1/convert", "body"))
        .rejects
        .toThrow(FileAgentError);

      await expect(client.post("/v1/convert", "body"))
        .rejects
        .toMatchObject({ status: 401, message: "Invalid API key" });
    });

    it("handles non-JSON error bodies gracefully", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      }));

      const client = new HttpClient({
        apiKey: "fa_live_test",
        baseUrl: "https://api.example.com",
      });

      await expect(client.post("/test", "body"))
        .rejects
        .toMatchObject({ status: 500, message: "HTTP 500: Internal Server Error" });
    });
  });

  describe("postJson", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("sends JSON content type and body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: "ok" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const client = new HttpClient({
        apiKey: "fa_live_test",
        baseUrl: "https://api.example.com",
      });

      const result = await client.postJson("/test", { key: "value" });

      expect(result).toEqual({ result: "ok" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          body: JSON.stringify({ key: "value" }),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });
});

describe("FileAgentError", () => {
  it("has name, message, and status", () => {
    const err = new FileAgentError("something failed", 422);
    expect(err.name).toBe("FileAgentError");
    expect(err.message).toBe("something failed");
    expect(err.status).toBe(422);
    expect(err).toBeInstanceOf(Error);
  });
});
