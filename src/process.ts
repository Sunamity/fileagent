import { HttpClient } from "./client";
import { convert } from "./convert";
import type { ConvertResult, FileInput, ConvertOptions } from "./types";

type TextPart = { type: "text"; text: string };
type FilePart = { type: "file"; data: ArrayBuffer; mimeType: string };
type ContentPart = TextPart | FilePart;

export class ProcessedDocument {
  public readonly markdown: string;
  public readonly text: string;
  public readonly pdfBuffer?: ArrayBuffer;
  public readonly pdfUrl?: string;
  public readonly metadata: ConvertResult["metadata"];

  constructor(result: ConvertResult, pdfBuffer?: ArrayBuffer) {
    this.markdown = result.markdown ?? "";
    this.text = result.text ?? result.markdown ?? "";
    this.pdfUrl = result.pdfUrl;
    this.pdfBuffer = pdfBuffer;
    this.metadata = result.metadata;
  }

  /**
   * Returns an AI SDK UserMessage-compatible object.
   * When the document was processed as PDF, sends it as a multimodal file part.
   * When processed as markdown, sends it as a text part wrapped in XML tags.
   */
  asMessage(prompt?: string): {
    role: "user";
    content: ContentPart[];
  } {
    const parts: ContentPart[] = [];

    if (this.pdfBuffer) {
      parts.push({
        type: "file" as const,
        data: this.pdfBuffer,
        mimeType: "application/pdf",
      });
    } else {
      parts.push({
        type: "text" as const,
        text: `<document>\n${this.markdown}\n</document>`,
      });
    }

    if (prompt) {
      parts.push({ type: "text" as const, text: prompt });
    }

    return { role: "user" as const, content: parts };
  }

  /**
   * Returns content parts array compatible with AI SDK.
   */
  asContent(): ContentPart[] {
    if (this.pdfBuffer) {
      return [
        {
          type: "file" as const,
          data: this.pdfBuffer,
          mimeType: "application/pdf",
        },
      ];
    }
    return [
      {
        type: "text" as const,
        text: `<document>\n${this.markdown}\n</document>`,
      },
    ];
  }

  /**
   * Returns the document wrapped in XML tags, suitable for system/user prompts.
   */
  asContext(): string {
    return `<document>\n${this.markdown}\n</document>`;
  }
}

export async function process(
  client: HttpClient,
  input: FileInput,
  options?: ConvertOptions
): Promise<ProcessedDocument> {
  const output = options?.output ?? "markdown";
  const result = await convert(client, input, { ...options, output });

  let pdfBuffer: ArrayBuffer | undefined;
  if (output === "pdf" && result.pdfUrl) {
    const res = await fetch(result.pdfUrl);
    pdfBuffer = await res.arrayBuffer();
  }

  return new ProcessedDocument(result, pdfBuffer);
}

export async function processMany(
  client: HttpClient,
  inputs: Array<{ file: FileInput; options?: ConvertOptions }>
): Promise<ProcessedDocument[]> {
  const results = await Promise.all(
    inputs.map(({ file, options }) => process(client, file, options))
  );
  return results;
}
