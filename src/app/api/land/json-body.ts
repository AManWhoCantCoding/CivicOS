// Land EC-01 (F-01..F-04): every JSON mutation body is hard-capped at
// 1,048,576 bytes (exactly 1 MiB is allowed). The cap is enforced on the
// bytes actually read from the Request body stream; Content-Length is only
// an early-reject optimization for honestly declared oversized bodies. The
// stream is cancelled (never fully buffered) as soon as the cap is exceeded.
// All failures surface as Error('INVALID_REQUEST'), which the existing route
// error mapping already turns into 400 LAND_INVALID_REQUEST with no state
// change, matching invalid-JSON handling.

export const LAND_JSON_BODY_LIMIT_BYTES = 1_048_576;

export async function readLandJsonBody(request: Request): Promise<unknown> {
  const invalidRequest = () => new Error('INVALID_REQUEST');

  // Early reject on a declared length above the limit; actual-byte reading
  // below still enforces the cap when the header is absent or dishonest.
  const declaredBytes = Number(request.headers.get('content-length'));
  if (
    Number.isFinite(declaredBytes) &&
    declaredBytes > LAND_JSON_BODY_LIMIT_BYTES
  ) {
    if (request.body !== null) {
      await request.body.cancel().catch(() => undefined);
    }
    throw invalidRequest();
  }

  if (request.body === null) {
    // No body: JSON parsing cannot succeed, same as request.json() before.
    throw invalidRequest();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > LAND_JSON_BODY_LIMIT_BYTES) {
      await reader.cancel().catch(() => undefined);
      chunks.length = 0;
      throw invalidRequest();
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(merged));
  } catch {
    throw invalidRequest();
  }
}
