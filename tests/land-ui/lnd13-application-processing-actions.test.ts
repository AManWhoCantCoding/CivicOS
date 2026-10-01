import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function mockFetchOnce(
  handler: (url: string, init: Record<string, unknown>) => Response,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown, init: unknown) => {
      return handler(String(url), (init ?? {}) as Record<string, unknown>);
    }),
  );
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// LND-13 Red: screen-03 processing actions theo ticket AC + test-skeleton.
// Assertion source: T-LND-13 (AC-01/02/03),
// .scratch/land-module/ui/screen-03.md (action matrix, modal/error behavior),
// design-tokens.md (textual handoff; Stitch 0 rendered URL),
// LND-11/LND-12 API contract (If-Match-Version, {} body, 502 SYNC_FAILED,
// approve/reject, VERSION_CONFLICT). UI chỉ phản ánh API/policy.

describe('LND-13 officer sync/retry visibility follows assignment and state', () => {
  it('shows sync for assigned officer on in_review', async () => {
    const view = await import('@/components/land/application-view');
    const actions = view.resolveProcessingActions({
      roles: ['land_officer'],
      hasAssignment: true,
      sameOrganizationUnit: true,
      status: 'in_review',
    });
    expect(actions.showSync).toBe(true);
    expect(actions.showRetry).toBe(false);
    expect(actions.showApprove).toBe(false);
    expect(actions.showReject).toBe(false);
  });

  it('shows retry (not sync) for assigned officer on sync_failed', async () => {
    const view = await import('@/components/land/application-view');
    const actions = view.resolveProcessingActions({
      roles: ['land_officer'],
      hasAssignment: true,
      sameOrganizationUnit: true,
      status: 'sync_failed',
    });
    expect(actions.showRetry).toBe(true);
    expect(actions.showSync).toBe(false);
    expect(actions.showApprove).toBe(false);
    expect(actions.showReject).toBe(false);
  });

  it('hides sync/retry without assignment and flags assignment required', async () => {
    const view = await import('@/components/land/application-view');
    const actions = view.resolveProcessingActions({
      roles: ['land_officer'],
      hasAssignment: false,
      sameOrganizationUnit: true,
      status: 'in_review',
    });
    expect(actions.showSync).toBe(false);
    expect(actions.showRetry).toBe(false);
    expect(actions.needsAssignment).toBe(true);
  });

  it('sync seam sends If-Match-Version with {} and maps success to pending_approval', async () => {
    const api = await import('@/components/land/land-api');
    const seen: Array<{ url: string; init: Record<string, unknown> }> = [];
    mockFetchOnce((url, init) => {
      seen.push({ url, init });
      return jsonResponse(
        {
          application: { id: 'app-1', status: 'pending_approval', version: 4 },
          sync: { status: 'succeeded', failureCode: null, attempts: 1 },
        },
        200,
      );
    });
    const result = await api.postApplicationSync('app-1', 3);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('/api/land/applications/app-1/sync');
    const headers = seen[0].init['headers'] as Record<string, string>;
    expect(headers['If-Match-Version']).toBe('3');
    expect(seen[0].init['body']).toBe('{}');
    expect(result.application?.status).toBe('pending_approval');
    expect(result.error).toBeNull();
  });

  it('retry seam targets the retry endpoint with the version header', async () => {
    const api = await import('@/components/land/land-api');
    const seen: Array<{ url: string; init: Record<string, unknown> }> = [];
    mockFetchOnce((url, init) => {
      seen.push({ url, init });
      return jsonResponse(
        {
          application: { id: 'app-1', status: 'pending_approval', version: 5 },
          sync: { status: 'succeeded', failureCode: null, attempts: 2 },
        },
        200,
      );
    });
    const result = await api.postApplicationSyncRetry('app-1', 4);
    expect(seen[0].url).toBe('/api/land/applications/app-1/sync/retry');
    const headers = seen[0].init['headers'] as Record<string, string>;
    expect(headers['If-Match-Version']).toBe('4');
    expect(seen[0].init['body']).toBe('{}');
    expect(result.application?.status).toBe('pending_approval');
  });

  it('surfaces sync failure failureCode without request/response secrets', async () => {
    const api = await import('@/components/land/land-api');
    mockFetchOnce(() =>
      jsonResponse(
        {
          code: 'LAND_SYNC_FAILED',
          application: { id: 'app-1', status: 'sync_failed', version: 4 },
          sync: {
            status: 'failed',
            failureCode: 'NATIONAL_TIMEOUT',
            attempts: 1,
          },
        },
        502,
      ),
    );
    const result = await api.postApplicationSync('app-1', 3);
    expect(result.error?.code).toBe('LAND_SYNC_FAILED');
    expect(result.application?.status).toBe('sync_failed');
    expect(result.sync?.failureCode).toBe('NATIONAL_TIMEOUT');
    expect(JSON.stringify(result)).not.toContain('requestPayload');
    expect(JSON.stringify(result)).not.toContain('responsePayload');
  });
});

describe('LND-13 leader approve/reject visibility hides both actions from officer', () => {
  it('shows approve/reject to same-OU leader on pending_approval', async () => {
    const view = await import('@/components/land/application-view');
    const actions = view.resolveProcessingActions({
      roles: ['commune_leader'],
      hasAssignment: false,
      sameOrganizationUnit: true,
      status: 'pending_approval',
    });
    expect(actions.showApprove).toBe(true);
    expect(actions.showReject).toBe(true);
    expect(actions.showSync).toBe(false);
    expect(actions.showRetry).toBe(false);
  });

  it('hides approve/reject from officer fixture on pending_approval', async () => {
    const view = await import('@/components/land/application-view');
    const actions = view.resolveProcessingActions({
      roles: ['land_officer'],
      hasAssignment: true,
      sameOrganizationUnit: true,
      status: 'pending_approval',
    });
    expect(actions.showApprove).toBe(false);
    expect(actions.showReject).toBe(false);
  });

  it('hides approve/reject from cross-OU leader', async () => {
    const view = await import('@/components/land/application-view');
    const actions = view.resolveProcessingActions({
      roles: ['commune_leader'],
      hasAssignment: false,
      sameOrganizationUnit: false,
      status: 'pending_approval',
    });
    expect(actions.showApprove).toBe(false);
    expect(actions.showReject).toBe(false);
  });

  it('rejects blank reject reasons before any API call', async () => {
    const view = await import('@/components/land/application-view');
    expect(view.isRejectReasonValid('')).toBe(false);
    expect(view.isRejectReasonValid('   ')).toBe(false);
    expect(view.isRejectReasonValid('Hồ sơ thiếu giấy tờ')).toBe(true);
  });

  it('reject seam sends trimmed reason with the version header', async () => {
    const api = await import('@/components/land/land-api');
    const seen: Array<{ url: string; init: Record<string, unknown> }> = [];
    mockFetchOnce((url, init) => {
      seen.push({ url, init });
      return jsonResponse(
        {
          application: { id: 'app-1', status: 'rejected', version: 6 },
          approval: { status: 'rejected' },
        },
        200,
      );
    });
    const result = await api.postApplicationReject(
      'app-1',
      5,
      '  Hồ sơ thiếu giấy tờ  ',
    );
    expect(seen[0].url).toBe('/api/land/applications/app-1/reject');
    const headers = seen[0].init['headers'] as Record<string, string>;
    expect(headers['If-Match-Version']).toBe('5');
    expect(seen[0].init['body']).toBe(
      JSON.stringify({ reason: 'Hồ sơ thiếu giấy tờ' }),
    );
    expect(result.application?.status).toBe('rejected');
  });

  it('approve seam sends the version header', async () => {
    const api = await import('@/components/land/land-api');
    const seen: Array<{ url: string; init: Record<string, unknown> }> = [];
    mockFetchOnce((url, init) => {
      seen.push({ url, init });
      return jsonResponse(
        {
          application: { id: 'app-1', status: 'completed', version: 6 },
          approval: { status: 'approved' },
        },
        200,
      );
    });
    const result = await api.postApplicationApprove('app-1', 5, null);
    expect(seen[0].url).toBe('/api/land/applications/app-1/approve');
    const headers = seen[0].init['headers'] as Record<string, string>;
    expect(headers['If-Match-Version']).toBe('5');
    expect(result.application?.status).toBe('completed');
  });
});

describe('LND-13 terminal/conflict/offline lock mutations with retry guidance', () => {
  it('marks completed/rejected terminal read-only with no actions', async () => {
    const view = await import('@/components/land/application-view');
    expect(view.isTerminalApplicationStatus('completed')).toBe(true);
    expect(view.isTerminalApplicationStatus('rejected')).toBe(true);
    expect(view.isTerminalApplicationStatus('pending_approval')).toBe(false);
    for (const status of ['completed', 'rejected']) {
      const actions = view.resolveProcessingActions({
        roles: ['commune_leader'],
        hasAssignment: false,
        sameOrganizationUnit: true,
        status,
      });
      expect(actions.readOnly).toBe(true);
      expect(actions.showSync).toBe(false);
      expect(actions.showRetry).toBe(false);
      expect(actions.showApprove).toBe(false);
      expect(actions.showReject).toBe(false);
    }
  });

  it('maps version conflict to a reload message', async () => {
    const view = await import('@/components/land/application-view');
    expect(
      view.mapProcessingErrorToMessage('LAND_VERSION_CONFLICT', 409),
    ).toMatch(/tải lại/i);
  });

  it('maps offline transport to an offline message', async () => {
    const view = await import('@/components/land/application-view');
    expect(view.mapProcessingErrorToMessage(null, 0)).toMatch(/ngoại tuyến/i);
    expect(view.mapProcessingErrorToMessage(null, null)).toMatch(
      /ngoại tuyến/i,
    );
  });

  it('maps sync failure and assignment/forbidden without inventing success', async () => {
    const view = await import('@/components/land/application-view');
    expect(view.mapProcessingErrorToMessage('LAND_SYNC_FAILED', 502)).toMatch(
      /đồng bộ|thất bại/i,
    );
    expect(
      view.mapProcessingErrorToMessage('LAND_ASSIGNMENT_REQUIRED', 403),
    ).toMatch(/phân công/i);
    expect(view.mapProcessingErrorToMessage('LAND_FORBIDDEN', 403)).toMatch(
      /quyền|phạm vi/i,
    );
  });

  it('detail source locks controls on terminal/conflict/offline with retry', () => {
    const detailSource = readSource(
      'src/components/land/ApplicationDetail.tsx',
    );
    expect(detailSource).toContain('chỉ đọc');
    expect(detailSource).toMatch(/tải lại/);
    expect(detailSource).toContain('ngoại tuyến');
    expect(detailSource).toContain('Thử lại');
    expect(detailSource).toContain('role="status"');
    expect(detailSource).toContain('role="alert"');
    expect(detailSource).toContain('disabled');
  });
});

describe('LND-13 screen-03 detail source follows the locked handoff', () => {
  const detailSource = readSource('src/components/land/ApplicationDetail.tsx');
  const detailPage = readSource(
    'src/app/land/applications/[applicationId]/page.tsx',
  );

  it('renders header/status/timeline/detail projection with simulated label', () => {
    expect(detailSource).toContain('applicationCode');
    expect(detailSource).toContain('applicationStatusText');
    expect(detailSource).toContain('applicationChangeTypeText');
    expect(detailSource).toContain('Mô phỏng');
    expect(detailSource).toContain('version');
    expect(detailSource).toContain('organizationId');
    expect(detailSource).toContain('createdById');
    expect(detailSource).toContain('submittedAt');
    expect(detailSource).toContain('rejectionReason');
    expect(detailSource).toContain('occurredAt');
    expect(detailSource).toContain('eventType');
    expect(detailSource).toContain('changePayload');
    expect(detailSource).toContain('font-mono');
  });

  it('wires sync/retry/approve/reject with If-Match-Version and role gates', () => {
    const apiSource = readSource('src/components/land/land-api.ts');
    const viewSource = readSource('src/components/land/application-view.ts');
    expect(apiSource).toContain('If-Match-Version');
    expect(viewSource).toContain('commune_leader');
    expect(viewSource).toContain('land_officer');
    expect(detailSource).toContain('detail.version');
    expect(detailSource).toContain('postApplicationSync');
    expect(detailSource).toContain('postApplicationSyncRetry');
    expect(detailSource).toContain('postApplicationApprove');
    expect(detailSource).toContain('postApplicationReject');
    expect(detailSource).toContain('Đồng bộ mô phỏng');
    expect(detailSource).toContain('Thử lại');
    expect(detailSource).toContain('Duyệt');
    expect(detailSource).toContain('Từ chối');
    expect(detailSource).toContain('resolveProcessingActions');
    expect(detailSource).toContain('land_review');
    expect(detailSource).toContain('Lý do từ chối');
    expect(detailSource).not.toContain('LAND_MOCK_SYNC_OUTCOME');
  });

  it('keeps sync failure display free of request/response secrets', () => {
    expect(detailSource).toContain('failureCode');
    expect(detailSource).not.toContain('requestPayload');
    expect(detailSource).not.toContain('responsePayload');
    expect(detailSource).not.toContain('storageKey');
    expect(detailSource).not.toContain('ciphertext');
  });

  it('announces loading/empty/forbidden states with accessible retry', () => {
    expect(detailSource).toContain('role="status"');
    expect(detailSource).toContain('role="alert"');
    expect(detailSource).toContain('Đang tải chi tiết hồ sơ');
    expect(detailSource).toContain('min-h-[44px]');
  });

  it('gates the detail route through the queue entry inside ModuleShell', () => {
    expect(detailPage).toContain('canEnterEntry');
    expect(detailPage).toContain('land-application-queue');
    expect(detailPage).toContain('ModuleShell');
    expect(detailPage).toContain('module="land"');
    expect(detailPage).toContain('AccessDenied');
    expect(detailPage).toContain('Mô phỏng');
    expect(detailPage).toContain('ApplicationDetail');
  });
});

// REVIEW-REPAIR regression: sau mutation thành công, screen-03 phải thấy
// EventRecord/approval/rejection/completed mới mà không cần reload tay.
// Patch thủ công { status, version } giữ timeline/provenance cũ trong memory,
// vi phạm screen-03 detail/timeline behavior.
describe('LND-13 REVIEW-REPAIR successful mutations refresh detail and timeline', () => {
  const detailSource = readSource('src/components/land/ApplicationDetail.tsx');

  function actionBody(action: string, nextAction: string): string {
    const start = detailSource.indexOf(`async function ${action}()`);
    const end = detailSource.indexOf(`async function ${nextAction}()`, start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return detailSource.slice(start, end);
  }

  it('re-fetches the complete detail and timeline after every successful mutation', () => {
    const refreshStart = detailSource.indexOf(
      'async function refreshDetailTimeline',
    );
    const refreshEnd = detailSource.indexOf(
      'async function runSync',
      refreshStart,
    );
    const refreshBody = detailSource.slice(refreshStart, refreshEnd);

    expect(refreshBody).toContain('fetchApplicationDetail(applicationId)');
    expect(refreshBody).toContain('fetchApplicationTimeline(applicationId)');
    expect(refreshBody).toContain('setDetail(detailResult.detail)');
    expect(refreshBody).toContain(
      'setEvents(sortTimelineAscending(timelineResult.events))',
    );

    for (const [action, nextAction] of [
      ['runSync', 'runRetry'],
      ['runRetry', 'runApprove'],
      ['runApprove', 'runReject'],
    ] as const) {
      expect(actionBody(action, nextAction)).toMatch(
        /else if \(result\.application\) \{\s*await refreshDetailTimeline\(\);/,
      );
    }
    const rejectBody = detailSource.slice(
      detailSource.indexOf('async function runReject()'),
    );
    expect(rejectBody).toMatch(
      /else if \(result\.application\) \{\s*await refreshDetailTimeline\(\);/,
    );
    expect(detailSource).not.toContain('applyRefreshed');
  });

  it('issues exactly one mutation POST per action without duplicate calls', () => {
    for (const call of [
      'postApplicationSync(',
      'postApplicationSyncRetry(',
      'postApplicationApprove(',
      'postApplicationReject(',
    ]) {
      const occurrences = detailSource.split(call).length - 1;
      expect(occurrences).toBe(1);
    }
  });
});
