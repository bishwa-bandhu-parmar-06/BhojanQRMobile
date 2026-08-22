/**
 * Pulls the server's error message out of a failed *binary* response.
 *
 * Requests made with responseType 'arraybuffer' get an ArrayBuffer back even
 * when the server answered with JSON - axios honours the requested type, not
 * the one that came back - so `error.response.data.message` is undefined on
 * exactly the requests whose errors matter most, the file downloads. Decoding
 * it by hand is what turns "Download failed" into the server's actual reason
 * ("No items have been sold yet", "Restaurant not found").
 *
 * Returns null when the body is empty or is genuinely binary, which is the
 * caller's cue to fall back to a generic message.
 */
export const extractApiErrorMessage = (data: any): string | null => {
  if (!data || typeof data.byteLength !== 'number' || data.byteLength === 0) return null;
  try {
    const bytes = new Uint8Array(data);
    let text = '';
    // Chunked because String.fromCharCode is applied with a spread, and a
    // whole workbook's worth of bytes at once overflows the call stack.
    for (let i = 0; i < bytes.length; i += 8192) {
      text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const parsed = JSON.parse(text);
    return parsed.message || parsed.error || null;
  } catch {
    return null;
  }
};
