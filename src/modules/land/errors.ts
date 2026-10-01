// Stable LAND_* API error with Vietnamese message.
export type LandApiError = {
  status: number;
  code: string;
  error: string;
};

const LAND_ERRORS: Record<string, LandApiError> = {
  UNAUTHENTICATED: {
    status: 401,
    code: 'LAND_UNAUTHENTICATED',
    error: 'Bạn cần đăng nhập để thực hiện thao tác này.',
  },
  FORBIDDEN: {
    status: 403,
    code: 'LAND_FORBIDDEN',
    error: 'Bạn không có quyền thực hiện thao tác này.',
  },
  ASSIGNMENT_REQUIRED: {
    status: 403,
    code: 'LAND_ASSIGNMENT_REQUIRED',
    error: 'Bạn chưa được phân công xử lý hồ sơ này.',
  },
  INVALID_REQUEST: {
    status: 400,
    code: 'LAND_INVALID_REQUEST',
    error: 'Dữ liệu yêu cầu không hợp lệ.',
  },
  LOOKUP_QUERY_INVALID: {
    status: 400,
    code: 'LAND_LOOKUP_QUERY_INVALID',
    error: 'Cần cung cấp chính xác một mã hồ sơ hoặc mã thửa.',
  },
  GEOMETRY_INVALID: {
    status: 400,
    code: 'LAND_GEOMETRY_INVALID',
    error: 'Hình học thửa đất không hợp lệ.',
  },
  DUPLICATE_CODE: {
    status: 409,
    code: 'LAND_DUPLICATE_CODE',
    error: 'Mã dữ liệu đã tồn tại.',
  },
  PARCEL_NOT_FOUND: {
    status: 404,
    code: 'LAND_PARCEL_NOT_FOUND',
    error: 'Thửa đất không tồn tại.',
  },
  APPLICATION_NOT_FOUND: {
    status: 404,
    code: 'LAND_APPLICATION_NOT_FOUND',
    error: 'Không tìm thấy hồ sơ biến động.',
  },
  LOOKUP_NOT_FOUND: {
    status: 404,
    code: 'LAND_LOOKUP_NOT_FOUND',
    error: 'Không tìm thấy kết quả tra cứu.',
  },
  PARTY_NOT_FOUND: {
    status: 404,
    code: 'LAND_PARTY_NOT_FOUND',
    error: 'Không tìm thấy chủ thể đất đai.',
  },
  IDEMPOTENCY_CONFLICT: {
    status: 409,
    code: 'LAND_IDEMPOTENCY_CONFLICT',
    error: 'Khóa idempotency đã được dùng cho dữ liệu khác.',
  },
  VERSION_CONFLICT: {
    status: 409,
    code: 'LAND_VERSION_CONFLICT',
    error: 'Phiên bản hồ sơ đã thay đổi, vui lòng tải lại.',
  },
  INVALID_TRANSITION: {
    status: 409,
    code: 'LAND_INVALID_TRANSITION',
    error: 'Trạng thái hồ sơ không cho phép thực hiện thao tác này.',
  },
  SYNC_FAILED: {
    status: 502,
    code: 'LAND_SYNC_FAILED',
    error: 'Đồng bộ mô phỏng Cơ sở dữ liệu quốc gia thất bại.',
  },
  RATE_LIMITED: {
    status: 429,
    code: 'LAND_RATE_LIMITED',
    error: 'Bạn đã vượt quá số lần tra cứu cho phép; hãy thử lại sau.',
  },
};

function internalCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  )
    return 'DUPLICATE_CODE';
  const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
  const token = message.includes(':') ? message.split(':')[0] : message;
  return token.trim().split(/\s+/).pop() ?? 'INVALID_REQUEST';
}

// Map any thrown error to a stable LAND_* response.
export function toLandApiError(error: unknown): LandApiError {
  return LAND_ERRORS[internalCode(error)] ?? LAND_ERRORS.INVALID_REQUEST;
}
