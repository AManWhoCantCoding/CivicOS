// LND-05 pure view helpers cho screen-04 parcel/party workspace.
// Nguồn: .scratch/land-module/ui/screen-04.md (textual handoff; Stitch report
// 0 rendered URL), design-tokens.md, api-contract GET parcels/{parcelId}.
// Không suy luận authorization: mọi quyết định scope thuộc server policy;
// client chỉ ánh xạ status/masked display đã lock.

export type WorkspaceBanner =
  'denied' | 'error' | 'not-found' | 'offline' | null;

export type ParcelGeometryView = {
  type: string;
  coordinates: number[][][];
};

export type ParcelView = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  areaSqm: string;
  landUseType: string;
  address: string;
  communeCode: string;
  organizationId: string;
  geometry: ParcelGeometryView;
  nationalRecordRef: string | null;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PartyView = {
  id: string;
  referenceCode: string;
  partyType: string;
  displayName: string;
  identityNumberMasked: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type RightView = {
  id: string;
  parcelId: string;
  partyId: string;
  rightType: string;
  sharePercent: string;
  status: string;
  validFrom: string;
  validTo: string | null;
  sourceApplicationId: string | null;
};

export type EncumbranceView = {
  id: string;
  parcelId: string;
  securedPartyId: string | null;
  encumbranceType: string;
  status: string;
  externalReference: string | null;
  registeredAt: string;
  releasedAt: string | null;
  sourceApplicationId: string;
};

export type ParcelDetailView = {
  parcel: ParcelView;
  rights: RightView[];
  encumbrances: EncumbranceView[];
};

// Ánh xạ HTTP status sang banner UI. 401/403 fail-closed về denied và không
// kèm dữ liệu; offline ưu tiên trước error để giữ input và chặn mutation.
export function mapLandApiStatus(
  status: number | null,
  online: boolean,
): WorkspaceBanner {
  if (!online) return 'offline';
  if (status === null) return 'error';
  if (status === 401 || status === 403) return 'denied';
  if (status === 404) return 'not-found';
  if (status >= 200 && status < 300) return null;
  return 'error';
}

// Nhãn trạng thái thửa đất; proposed/retired luôn chỉ đọc theo screen-04.
export function parcelStatusText(status: string): string {
  if (status === 'active') return 'Đang sử dụng';
  if (status === 'proposed') return 'Đề xuất (chỉ đọc)';
  if (status === 'retired') return 'Đã ngừng (chỉ đọc)';
  return 'Không xác định';
}

// Nhãn vòng đời quyền sử dụng đất.
export function rightStatusText(status: string): string {
  if (status === 'active') return 'Đang hiệu lực';
  if (status === 'ended') return 'Đã kết thúc';
  return 'Không xác định';
}

// Nhãn vòng đời ràng buộc thế chấp.
export function encumbranceStatusText(status: string): string {
  if (status === 'active') return 'Đang hiệu lực';
  if (status === 'released') return 'Đã giải tỏa';
  return 'Không xác định';
}

// Nhãn chủ thể đã che: reference + masked, không bao giờ lộ plaintext identity.
export function maskedPartyLabel(
  party:
    | {
        referenceCode: string;
        identityNumberMasked: string | null;
        displayName: string;
      }
    | null
    | undefined,
  fallbackPartyId: string,
): string {
  if (!party) return `Mã chủ thể ${fallbackPartyId}`;
  const masked = party.identityNumberMasked ?? 'chưa có số định danh';
  return `${party.referenceCode} · ${masked} (đã che)`;
}

// Mô tả preview hình học nội bộ; không tái sử dụng cho tra cứu công khai.
export function geometryPreviewText(geometry: ParcelGeometryView): string {
  const ring = geometry.coordinates[0] ?? [];
  return `Xem trước nội bộ ${geometry.type} · ${ring.length} điểm · không dùng cho tra cứu công khai`;
}

// Copy placeholder Evidence metadata: chỉ metadata theo policy nội bộ.
export function evidencePlaceholderCopy(): string {
  return 'Chưa có siêu dữ liệu Evidence trong phạm vi này. Evidence gắn với thửa đất sẽ hiển thị tại đây theo đúng policy nội bộ, không phơi bày công khai hay trên mobile.';
}

// Chắn rò rỉ internals nhạy cảm khỏi payload render (ciphertext/storageKey).
export function hasSensitiveLeak(value: unknown): boolean {
  const raw = JSON.stringify(value) ?? '';
  if (/ciphertext/i.test(raw)) return true;
  if (/storagekey/i.test(raw)) return true;
  if (/"bytes"\s*:/.test(raw)) return true;
  return false;
}
