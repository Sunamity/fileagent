import { HttpClient } from "./client";
import type { ConvertOptions, ConvertResult, FileInput } from "./types";
import { readFileSync } from "fs";
import { basename } from "path";

const DIRECT_UPLOAD_LIMIT = 20 * 1024 * 1024; // 20MB

export async function convert(
  client: HttpClient,
  input: FileInput,
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const { buffer, fileName } = await resolveInput(input, options.fileName);
  const output = options.output ?? "markdown";

  if (buffer.byteLength > DIRECT_UPLOAD_LIMIT) {
    return convertLargeFile(client, buffer, fileName, output);
  }

  return convertDirectUpload(client, buffer, fileName, output);
}

async function convertDirectUpload(
  client: HttpClient,
  buffer: ArrayBuffer,
  fileName: string,
  output: string
): Promise<ConvertResult> {
  const form = new FormData();
  form.append("file", new Blob([buffer]), fileName);
  form.append("output", output);

  const res = await client.post("/v1/convert", form);
  return res.json() as Promise<ConvertResult>;
}

async function convertLargeFile(
  client: HttpClient,
  buffer: ArrayBuffer,
  fileName: string,
  output: string
): Promise<ConvertResult> {
  // Step 1: Get upload URL
  const { uploadUrl } = await client.postJson<{ uploadUrl: string }>(
    "/v1/upload-url",
    {}
  );

  // Step 2: Upload file to Convex storage
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload file to storage");
  }

  const { storageId } = (await uploadRes.json()) as { storageId: string };

  // Step 3: Convert from storage
  return client.postJson<ConvertResult>("/v1/convert-stored", {
    storageId,
    fileName,
    outputMode: output,
  });
}

async function resolveInput(
  input: FileInput,
  fileNameOverride?: string
): Promise<{ buffer: ArrayBuffer; fileName: string }> {
  // String → file path
  if (typeof input === "string") {
    const buffer = readFileSync(input);
    const fileName = fileNameOverride ?? basename(input);
    return { buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), fileName };
  }

  // Buffer (Node.js)
  if (Buffer.isBuffer(input)) {
    return {
      buffer: input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer,
      fileName: fileNameOverride ?? "upload",
    };
  }

  // ArrayBuffer
  if (input instanceof ArrayBuffer) {
    return { buffer: input, fileName: fileNameOverride ?? "upload" };
  }

  // File (has name property)
  if (typeof File !== "undefined" && input instanceof File) {
    const buffer = await input.arrayBuffer();
    return { buffer, fileName: fileNameOverride ?? input.name };
  }

  // Blob
  if (input instanceof Blob) {
    const buffer = await input.arrayBuffer();
    return { buffer, fileName: fileNameOverride ?? "upload" };
  }

  throw new Error("Unsupported input type. Pass a file path, Buffer, ArrayBuffer, Blob, or File.");
}
