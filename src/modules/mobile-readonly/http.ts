import { NextResponse } from 'next/server';

export function mobileErrorResponse(error: unknown): NextResponse {
  const code = error instanceof Error ? error.message : 'MOBILE_READ_FAILED';
  const status =
    code === 'FORBIDDEN'
      ? 403
      : code === 'UNAUTHENTICATED'
        ? 401
        : code.startsWith('INVALID_')
          ? 400
          : code.endsWith('_NOT_FOUND')
            ? 404
            : 500;
  return NextResponse.json({ error: code }, { status });
}
