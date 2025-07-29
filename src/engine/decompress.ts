import { inflate } from "pako";

export function decompressBase64ZlibToUint32Array(base64: string): Uint32Array {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const decompressed = inflate(bytes);

  const buffer = decompressed.buffer;
  return new Uint32Array(buffer);
}
