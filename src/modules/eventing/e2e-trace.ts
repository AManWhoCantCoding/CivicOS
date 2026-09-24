import { appendFileSync } from 'node:fs';

type TraceFields = Record<string, unknown>;

function redact(value: string): string {
  return value
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[redacted-id]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted-email]')
    .replace(
      /(?:password|secret|token|authorization|cookie|database_url)[=:][^\s,;]+/gi,
      '[redacted-secret]',
    )
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-database]')
    .slice(0, 240);
}

export function e2eTrace(fields: TraceFields): void {
  const path = process.env.CIVICOS_E2E_TRACE_FILE;
  if (!path) return;
  try {
    appendFileSync(
      path,
      `${JSON.stringify({
        recordedAt: new Date().toISOString(),
        runId: process.env.CIVICOS_E2E_TRACE_RUN_ID,
        ...fields,
      })}\n`,
      'utf8',
    );
  } catch {
    return;
  }
}

export function e2eTraceError(error: unknown): {
  errorCode: string;
  errorMessage: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const [errorCode] = message.split(':', 1);
  return {
    errorCode: redact(errorCode || 'UNKNOWN_ERROR'),
    errorMessage: redact(message),
  };
}
