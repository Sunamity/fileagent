import { describe, it, expect } from "vitest";
import { FileAgent, FileAgentError, ProcessedDocument } from "../index";

describe("FileAgent class", () => {
  it("exposes convert, process, and processMany methods", () => {
    const fa = new FileAgent({
      apiKey: "fa_live_test",
      baseUrl: "https://example.com",
    });

    expect(typeof fa.convert).toBe("function");
    expect(typeof fa.process).toBe("function");
    expect(typeof fa.processMany).toBe("function");
  });

  it("throws on missing config", () => {
    expect(() => new FileAgent({ apiKey: "", baseUrl: "https://example.com" }))
      .toThrow("API key is required");
  });
});

describe("exports", () => {
  it("re-exports FileAgentError", () => {
    expect(FileAgentError).toBeDefined();
    expect(new FileAgentError("test", 400)).toBeInstanceOf(Error);
  });

  it("re-exports ProcessedDocument", () => {
    expect(ProcessedDocument).toBeDefined();
  });
});
