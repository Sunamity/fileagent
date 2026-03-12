import { describe, it, expect } from "vitest";
import { ProcessedDocument } from "../process";
import type { ConvertResult } from "../types";

const mockResult: ConvertResult = {
  markdown: "# Hello\n\nThis is a test.",
  text: "Hello. This is a test.",
  metadata: {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    category: "office",
    fileSizeBytes: 1024,
    processingTimeMs: 42,
  },
};

describe("ProcessedDocument", () => {
  it("stores markdown, text, and metadata", () => {
    const doc = new ProcessedDocument(mockResult);
    expect(doc.markdown).toBe("# Hello\n\nThis is a test.");
    expect(doc.text).toBe("Hello. This is a test.");
    expect(doc.metadata.extension).toBe("docx");
  });

  it("falls back to markdown for text if text is missing", () => {
    const doc = new ProcessedDocument({
      ...mockResult,
      text: undefined,
    });
    expect(doc.text).toBe(doc.markdown);
  });

  it("defaults markdown to empty string if missing", () => {
    const doc = new ProcessedDocument({
      metadata: mockResult.metadata,
    });
    expect(doc.markdown).toBe("");
    expect(doc.text).toBe("");
  });

  describe("asMessage", () => {
    it("returns a UserMessage with document content", () => {
      const doc = new ProcessedDocument(mockResult);
      const msg = doc.asMessage();

      expect(msg.role).toBe("user");
      expect(msg.content).toHaveLength(1);
      expect(msg.content[0].type).toBe("text");
      expect(msg.content[0].text).toContain("<document>");
      expect(msg.content[0].text).toContain("# Hello");
      expect(msg.content[0].text).toContain("</document>");
    });

    it("appends prompt as second content part", () => {
      const doc = new ProcessedDocument(mockResult);
      const msg = doc.asMessage("Summarize this");

      expect(msg.content).toHaveLength(2);
      expect(msg.content[1].text).toBe("Summarize this");
    });
  });

  describe("asContent", () => {
    it("returns content parts array", () => {
      const doc = new ProcessedDocument(mockResult);
      const parts = doc.asContent();

      expect(parts).toHaveLength(1);
      expect(parts[0].type).toBe("text");
      expect(parts[0].text).toMatch(/^<document>\n.*\n<\/document>$/s);
    });
  });

  describe("asContext", () => {
    it("wraps markdown in XML document tags", () => {
      const doc = new ProcessedDocument(mockResult);
      const ctx = doc.asContext();

      expect(ctx).toBe("<document>\n# Hello\n\nThis is a test.\n</document>");
    });
  });
});
