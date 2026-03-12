import { HttpClient, FileAgentError } from "./client";
import { convert } from "./convert";
import {
  process,
  processMany,
  ProcessedDocument,
} from "./process";
import type {
  FileAgentConfig,
  ConvertOptions,
  ConvertResult,
  FileInput,
  OutputMode,
} from "./types";

export class FileAgent {
  private client: HttpClient;

  constructor(config: FileAgentConfig) {
    this.client = new HttpClient(config);
  }

  /**
   * Convert a file to markdown or PDF.
   */
  async convert(
    input: FileInput,
    options?: ConvertOptions
  ): Promise<ConvertResult> {
    return convert(this.client, input, options);
  }

  /**
   * Process a file and return a ProcessedDocument with AI SDK helpers.
   */
  async process(
    input: FileInput,
    options?: ConvertOptions
  ): Promise<ProcessedDocument> {
    return process(this.client, input, options);
  }

  /**
   * Process multiple files in parallel.
   */
  async processMany(
    inputs: Array<{ file: FileInput; options?: ConvertOptions }>
  ): Promise<ProcessedDocument[]> {
    return processMany(this.client, inputs);
  }
}

export { FileAgentError, ProcessedDocument };
export type {
  FileAgentConfig,
  ConvertOptions,
  ConvertResult,
  FileInput,
  OutputMode,
};
