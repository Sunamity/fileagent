export interface FileAgentConfig {
  apiKey: string;
  baseUrl?: string;
}

export type OutputMode = "markdown" | "pdf";

export interface ConvertOptions {
  output?: OutputMode;
  fileName?: string;
}

export interface ConvertResult {
  markdown?: string;
  text?: string;
  pdfUrl?: string;
  metadata: {
    mimeType: string;
    extension: string;
    category: string;
    fileSizeBytes: number;
    processingTimeMs: number;
  };
}

export type FileInput = string | Buffer | ArrayBuffer | Blob | File;
