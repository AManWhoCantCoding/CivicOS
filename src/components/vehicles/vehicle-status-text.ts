export function describeVehicleCommandError(
  error: string,
  status: number,
): string {
  if (status === 401 || status === 403) return `Không được phép: ${error}`;
  if (error === 'STALE_OBSERVATION')
    return 'Dữ liệu đã cũ (STALE_OBSERVATION). Tải lại quan sát rồi thử lại.';
  if (error === 'MATCH_NOT_PENDING')
    return 'Match không còn chờ xác nhận (MATCH_NOT_PENDING). Tải lại quan sát.';
  return error;
}

export function describeOfflineQueueStatus(
  status: 'pending' | 'syncing' | 'failed' | 'rejected' | 'synced',
): string {
  if (status === 'synced') return 'Đã lưu và đồng bộ với máy chủ.';
  if (status === 'syncing') return 'Đang đồng bộ, chưa hoàn tất.';
  if (status === 'failed') return 'Đồng bộ thất bại, chờ thử lại.';
  if (status === 'rejected') return 'Máy chủ từ chối, cần kiểm tra lại.';
  return 'Đã lưu cục bộ, chờ đồng bộ (chưa gửi tới máy chủ).';
}
