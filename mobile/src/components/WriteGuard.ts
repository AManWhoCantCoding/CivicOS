export type WriteResult = {
  allowed: false;
  reason: 'MAP_OFFLINE_WRITE_BLOCKED' | 'READ_ONLY_MVP';
};
export function assertReadOnly(
  method: string,
  offline: boolean,
  path = '',
): WriteResult | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()))
    return null;
  if (
    path === '/api/auth/session' &&
    ['POST', 'DELETE'].includes(method.toUpperCase())
  )
    return null;
  return {
    allowed: false,
    reason: offline ? 'MAP_OFFLINE_WRITE_BLOCKED' : 'READ_ONLY_MVP',
  };
}
