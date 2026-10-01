// LND-09 pure view helpers cho screen-01 queue + screen-02 create.
// Nguồn: .scratch/land-module/ui/screen-01.md, screen-02.md,
// design-tokens.md (textual handoff; Stitch 0 rendered URL),
// api-contract GET/POST /api/land/applications, data-model change types.
// Không suy luận authorization: scope do server feature gate quyết định;
// client chỉ ánh xạ status/masked display đã lock.

export type ApplicationSummaryView = {
  id: string;
  applicationCode: string;
  organizationId: string;
  changeType: string;
  status: string;
  createdById: string;
  version: number;
  submittedAt: string;
  updatedAt: string;
  completedAt: string | null;
  rejectionReason: string | null;
};

export const LAND_APPLICATIONS_URL = '/api/land/applications';

export function applicationDetailUrl(applicationId: string): string {
  return `/api/land/applications/${encodeURIComponent(applicationId)}`;
}

export function applicationDetailPageUrl(applicationId: string): string {
  return `/land/applications/${encodeURIComponent(applicationId)}`;
}

// Nhãn trạng thái hồ sơ; chip luôn có text, không dùng màu đơn độc.
export function applicationStatusText(status: string): string {
  if (status === 'submitted') return 'Đã tiếp nhận';
  if (status === 'in_review') return 'Đang thẩm tra';
  if (status === 'sync_pending') return 'Chờ đồng bộ (mô phỏng)';
  if (status === 'sync_succeeded') return 'Đồng bộ thành công (mô phỏng)';
  if (status === 'sync_failed') return 'Đồng bộ thất bại';
  if (status === 'pending_approval') return 'Chờ phê duyệt';
  if (status === 'rejected') return 'Đã từ chối';
  if (status === 'completed') return 'Đã hoàn thành';
  return 'Không xác định';
}

// Nhãn loại biến động cho đúng bốn change type đã lock.
export function applicationChangeTypeText(changeType: string): string {
  if (changeType === 'transfer') return 'Chuyển nhượng';
  if (changeType === 'information_update') return 'Cập nhật thông tin';
  if (changeType === 'mortgage') return 'Thế chấp';
  if (changeType === 'parcel_split_merge') return 'Tách/Gộp thửa';
  return 'Không xác định';
}

export type ApplicationListFilters = {
  status: string;
  changeType: string;
  assignedTo: string;
  cursor: string | null;
};

// Dựng query cho GET /api/land/applications; chỉ dùng params đã lock
// (status, changeType, assignedTo, limit, cursor). Tìm theo mã hồ sơ
// lọc phía client, không gửi param lạ lên API.
export function buildApplicationListQuery(
  filters: ApplicationListFilters,
): string {
  const params = new URLSearchParams();
  params.set('limit', '20');
  if (filters.status) params.set('status', filters.status);
  if (filters.changeType) params.set('changeType', filters.changeType);
  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
  if (filters.cursor) params.set('cursor', filters.cursor);
  return `?${params.toString()}`;
}

// Lọc client-side theo mã hồ sơ (substring, không phân biệt hoa thường).
export function filterSummariesByCode<T extends { applicationCode: string }>(
  items: readonly T[],
  search: string,
): T[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) =>
    item.applicationCode.toLowerCase().includes(needle),
  );
}

function shareToCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const numeric = Number(value.trim());
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) return null;
  return Math.round(numeric * 100);
}

// Tổng tỷ lệ đề xuất phải bằng 100.00 đúng helper text screen-02.
export function isShareTotalValid(shares: readonly string[]): boolean {
  if (shares.length < 1) return false;
  let total = 0;
  for (const share of shares) {
    const cents = shareToCents(share);
    if (cents === null) return false;
    total += cents;
  }
  return total === 10000;
}

export function normalizeShareInput(value: string): string {
  const cents = shareToCents(value);
  if (cents === null) return value.trim();
  return (cents / 100).toFixed(2);
}

// Builder transfer: current/proposed holder links + shareChanges tổng 100.00,
// đúng một thửa subject theo DR-12.
export function buildTransferInput(input: {
  currentHolderPartyId: string;
  proposedHolders: Array<{ partyId: string; sharePercent: string }>;
  subjectParcelId: string;
}): {
  changeType: string;
  changePayload: Record<string, unknown>;
  parties: Array<{
    partyId: string;
    partyRole: string;
    sharePercent: string | null;
  }>;
  parcels: Array<{ parcelId: string; parcelRole: string }>;
} {
  const proposed = input.proposedHolders.map((entry) => ({
    partyId: entry.partyId,
    partyRole: 'proposed_holder',
    sharePercent: normalizeShareInput(entry.sharePercent),
  }));
  return {
    changeType: 'transfer',
    changePayload: {
      shareChanges: proposed.map((entry) => ({
        partyRole: 'proposed_holder',
        sharePercent: entry.sharePercent,
      })),
    },
    parties: [
      {
        partyId: input.currentHolderPartyId,
        partyRole: 'current_holder',
        sharePercent: null,
      },
      ...proposed,
    ],
    parcels: [{ parcelId: input.subjectParcelId, parcelRole: 'subject' }],
  };
}

// Builder information_update: field address/landUseType + newValue non-empty.
export function buildInformationUpdateInput(input: {
  applicantPartyId: string;
  subjectParcelId: string;
  field: string;
  newValue: string;
}): {
  changeType: string;
  changePayload: Record<string, unknown>;
  parties: Array<{
    partyId: string;
    partyRole: string;
    sharePercent: string | null;
  }>;
  parcels: Array<{ parcelId: string; parcelRole: string }>;
} {
  return {
    changeType: 'information_update',
    changePayload: { field: input.field, newValue: input.newValue },
    parties: [
      {
        partyId: input.applicantPartyId,
        partyRole: 'applicant',
        sharePercent: null,
      },
    ],
    parcels: [{ parcelId: input.subjectParcelId, parcelRole: 'subject' }],
  };
}

// Builder mortgage: register cần secured_party, release chỉ applicant.
export function buildMortgageInput(input: {
  action: string;
  securedPartyId: string | null;
  applicantPartyId: string | null;
  subjectParcelId: string;
}): {
  changeType: string;
  changePayload: Record<string, unknown>;
  parties: Array<{
    partyId: string;
    partyRole: string;
    sharePercent: string | null;
  }>;
  parcels: Array<{ parcelId: string; parcelRole: string }>;
} {
  const parties =
    input.action === 'register' && input.securedPartyId
      ? [
          {
            partyId: input.securedPartyId,
            partyRole: 'secured_party',
            sharePercent: null,
          },
        ]
      : input.applicantPartyId
        ? [
            {
              partyId: input.applicantPartyId,
              partyRole: 'applicant',
              sharePercent: null,
            },
          ]
        : [];
  return {
    changeType: 'mortgage',
    changePayload: { action: input.action },
    parties,
    parcels: [{ parcelId: input.subjectParcelId, parcelRole: 'subject' }],
  };
}

// Builder split/merge: source + result links, operation split/merge.
export function buildSplitMergeInput(input: {
  operation: string;
  applicantPartyId: string;
  sourceParcelIds: string[];
  resultParcelIds: string[];
}): {
  changeType: string;
  changePayload: Record<string, unknown>;
  parties: Array<{
    partyId: string;
    partyRole: string;
    sharePercent: string | null;
  }>;
  parcels: Array<{ parcelId: string; parcelRole: string }>;
} {
  return {
    changeType: 'parcel_split_merge',
    changePayload: { operation: input.operation },
    parties: [
      {
        partyId: input.applicantPartyId,
        partyRole: 'applicant',
        sharePercent: null,
      },
    ],
    parcels: [
      ...input.sourceParcelIds.map((parcelId) => ({
        parcelId,
        parcelRole: 'source',
      })),
      ...input.resultParcelIds.map((parcelId) => ({
        parcelId,
        parcelRole: 'result',
      })),
    ],
  };
}

// Chắn rò rỉ changePayload/PII/sync payload khỏi hàng đợi.
export function hasApplicationSensitiveLeak(value: unknown): boolean {
  const raw = JSON.stringify(value) ?? '';
  if (/changePayload/i.test(raw)) return true;
  if (/ciphertext/i.test(raw)) return true;
  if (/storagekey/i.test(raw)) return true;
  if (/identityNumber(?!Masked)/.test(raw)) return true;
  if (/requestPayload/i.test(raw)) return true;
  if (/responsePayload/i.test(raw)) return true;
  if (/"bytes"\s*:/.test(raw)) return true;
  return false;
}

// Thông điệp tiếng Việt cho lỗi tạo hồ sơ; giữ input để retry cùng key.
export function mapCreateErrorToMessage(
  code: string | null,
  status: number | null,
): string {
  if (status === null || status === 0)
    return 'Đang ngoại tuyến. Bản nháp đã được giữ lại trong phiên; cần kết nối để gửi hồ sơ.';
  if (code === 'LAND_IDEMPOTENCY_CONFLICT')
    return 'Khóa idempotency đã được dùng cho dữ liệu khác. Kiểm tra lại nội dung đã nhập (được giữ nguyên) rồi thử lại với cùng khóa hoặc tạo hồ sơ mới.';
  if (code === 'LAND_INVALID_REQUEST' || code === 'LAND_GEOMETRY_INVALID')
    return 'Dữ liệu chưa hợp lệ. Kiểm tra lại trường được đánh dấu và thử lại; nội dung đã nhập được giữ nguyên.';
  if (code === 'LAND_FORBIDDEN' || code === 'LAND_ASSIGNMENT_REQUIRED')
    return 'Tài khoản không có quyền tạo hồ sơ trong phạm vi này.';
  if (code === 'LAND_UNAUTHENTICATED') return 'Bạn cần đăng nhập để gửi hồ sơ.';
  if (code === 'LAND_PARTY_NOT_FOUND')
    return 'Không tìm thấy chủ thể đã chọn. Chọn lại chủ thể trong phạm vi và thử lại.';
  if (code === 'LAND_PARCEL_NOT_FOUND')
    return 'Không tìm thấy thửa đất đã chọn. Chọn lại thửa đất trong phạm vi và thử lại.';
  if (code === 'LAND_DUPLICATE_CODE')
    return 'Mã hồ sơ đã tồn tại. Thử lại để nhận mã mới; nội dung đã nhập được giữ nguyên.';
  return 'Không gửi được hồ sơ. Thử lại; nội dung đã nhập được giữ nguyên.';
}

// Khóa idempotency tạo một lần cho mỗi form, tái dùng khi retry.
export function generateIdempotencyKey(): string {
  try {
    const cryptoRef =
      typeof globalThis !== 'undefined'
        ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
        : undefined;
    if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  } catch {
    /* fallback bên dưới */
  }
  return `lnd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
