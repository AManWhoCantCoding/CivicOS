import { describe, expect, it } from 'vitest';

import {
  assertMapWriteAllowed,
  maskMapMarker,
  resolveMapPermission,
  toMapMarker,
} from '@/modules/platform/map';

const marker = () =>
  toMapMarker({
    id: 'Incident:abc123',
    aggregateType: 'Incident',
    title: 'Danh tính thật',
    latitude: 20.95,
    longitude: 105.98,
    status: 'received',
    updatedAt: '',
  });

describe('map permission and offline guard', () => {
  it('masks the workspace when no session exists', () => {
    expect(resolveMapPermission(null)).toBe('masked');
  });

  it('grants map entry to business roles in the unit', () => {
    expect(
      resolveMapPermission({ id: 'user-1', roles: ['field_officer'] }),
    ).toBe('ok');
    expect(resolveMapPermission({ id: 'user-2', roles: ['commander'] })).toBe(
      'ok',
    );
  });

  it('denies map entry to roles without business scope', () => {
    expect(resolveMapPermission({ id: 'user-3', roles: ['supervisor'] })).toBe(
      'denied',
    );
    expect(
      resolveMapPermission({ id: 'user-4', roles: ['system_operator'] }),
    ).toBe('denied');
  });

  it('blocks offline writes with a clear error code', () => {
    expect(() => assertMapWriteAllowed(false)).toThrow(
      'MAP_OFFLINE_WRITE_BLOCKED',
    );
    expect(() => assertMapWriteAllowed(true)).not.toThrow();
  });

  it('masks marker titles without sensitive-read capability', () => {
    expect(maskMapMarker(marker(), false).title).toBe(
      'Dữ liệu đã che theo vai trò',
    );
    expect(maskMapMarker(marker(), true).title).toBe('Danh tính thật');
  });
});
