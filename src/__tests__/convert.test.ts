import { describe, it, expect, vi, beforeEach } from "vitest";
import { convert } from "../convert";
import { HttpClient } from "../client";
import * as fs from "fs";
import * as path from "path";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  basename: vi.fn((p: string) => p.split("/").pop() ?? "upload"),
}));

function createMockClient() {
  return {
    post: vi.fn(),
    postJson: vi.fn(),
  } as unknown as HttpClient;
}

const mockConvertResult = {
  markdown: "# Converted",
  text: "Converted",
  metadata: {
    mimeType: "text/plain",
    extension: "txt",
    category: "plaintext",
    fileSizeBytes: 100,
    processingTimeMs: 50,
  },
};

describe("convert", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("direct upload (< 20MB)", () => {
    it("converts an ArrayBuffer input", async () => {
      const client = createMockClient();
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.resolve(mockConvertResult),
      });

      const buffer = new TextEncoder().encode("hello").buffer;
      const result = await convert(client, buffer, { fileName: "test.txt" });

      expect(result).toEqual(mockConvertResult);
      expect(client.post).toHaveBeenCalledWith("/v1/convert", expect.any(FormData));
    });

    it("converts a Blob input", async () => {
      const client = createMockClient();
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.resolve(mockConvertResult),
      });

      const blob = new Blob(["hello"], { type: "text/plain" });
      const result = await convert(client, blob);

      expect(result).toEqual(mockConvertResult);
    });

    it("converts a Buffer input", async () => {
      const client = createMockClient();
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.resolve(mockConvertResult),
      });

      const buf = Buffer.from("hello");
      const result = await convert(client, buf, { fileName: "doc.txt" });

      expect(result).toEqual(mockConvertResult);
    });

    it("reads file from path string", async () => {
      const client = createMockClient();
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.resolve(mockConvertResult),
      });

      const fakeBuffer = Buffer.from("file content");
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(fakeBuffer);

      const result = await convert(client, "/path/to/doc.pdf");

      expect(fs.readFileSync).toHaveBeenCalledWith("/path/to/doc.pdf");
      expect(result).toEqual(mockConvertResult);
    });

    it("uses fileName override", async () => {
      const client = createMockClient();
      const postMock = client.post as ReturnType<typeof vi.fn>;
      postMock.mockResolvedValue({
        json: () => Promise.resolve(mockConvertResult),
      });

      const buffer = new TextEncoder().encode("hello").buffer;
      await convert(client, buffer, { fileName: "custom.md" });

      const formData = postMock.mock.calls[0][1] as FormData;
      const file = formData.get("file") as File;
      expect(file.name).toBe("custom.md");
    });

    it("passes output mode in form data", async () => {
      const client = createMockClient();
      const postMock = client.post as ReturnType<typeof vi.fn>;
      postMock.mockResolvedValue({
        json: () => Promise.resolve(mockConvertResult),
      });

      const buffer = new TextEncoder().encode("hello").buffer;
      await convert(client, buffer, { output: "pdf", fileName: "f.txt" });

      const formData = postMock.mock.calls[0][1] as FormData;
      expect(formData.get("output")).toBe("pdf");
    });
  });

  describe("large file upload (> 20MB)", () => {
    it("uses upload-url flow for large files", async () => {
      const client = createMockClient();
      (client.postJson as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ uploadUrl: "https://storage.example.com/upload" })
        .mockResolvedValueOnce(mockConvertResult);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ storageId: "storage_abc" }),
        })
      );

      // Create a buffer > 20MB
      const largeBuffer = new ArrayBuffer(21 * 1024 * 1024);

      const result = await convert(client, largeBuffer, { fileName: "big.pdf" });

      expect(client.postJson).toHaveBeenCalledWith("/v1/upload-url", {});
      expect(fetch).toHaveBeenCalledWith(
        "https://storage.example.com/upload",
        expect.objectContaining({ method: "POST" })
      );
      expect(client.postJson).toHaveBeenCalledWith("/v1/convert-stored", {
        storageId: "storage_abc",
        fileName: "big.pdf",
        outputMode: "markdown",
      });
      expect(result).toEqual(mockConvertResult);
    });

    it("throws when storage upload fails", async () => {
      const client = createMockClient();
      (client.postJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        uploadUrl: "https://storage.example.com/upload",
      });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 })
      );

      const largeBuffer = new ArrayBuffer(21 * 1024 * 1024);

      await expect(
        convert(client, largeBuffer, { fileName: "big.pdf" })
      ).rejects.toThrow("Failed to upload file to storage");
    });
  });

  describe("input validation", () => {
    it("throws for unsupported input types", async () => {
      const client = createMockClient();

      await expect(
        convert(client, 42 as any)
      ).rejects.toThrow("Unsupported input type");
    });
  });
});
