/**
 * Decodes base64-encoded RLE tile layer into a Uint32Array.
 * Format: [value, runLength, value, runLength, ...]
 */
export function decodeBase64RLEToUint32Array(base64: string): Uint32Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }

  const total = bytes.reduce((sum, _, i) => (i % 2 ? sum + bytes[i] : sum), 0);
  const output = new Uint32Array(total);

  let outIndex = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const value = bytes[i];
    const run = bytes[i + 1];
    for (let j = 0; j < run; j++) {
      output[outIndex++] = value;
    }
  }

  return output;
}
