import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  mobileBaseline,
  stateColor,
  stateIcon,
  stateLabel,
  type DataState,
} from '../States';

function statesSource(): string {
  return readFileSync(join(__dirname, '../States.tsx'), 'utf8');
}

describe('data state matrix', () => {
  it.each([
    ['loading', 'Đang tải'],
    ['empty', 'Chưa có dữ liệu'],
    ['error', 'Không thể tải dữ liệu'],
    ['forbidden', 'Bạn không có quyền xem dữ liệu này'],
    ['offline', 'Đang ngoại tuyến'],
    ['masked', 'Thông tin đã được che'],
    ['ready', 'Sẵn sàng'],
    ['warning', 'Cảnh báo'],
    ['stale', 'Dữ liệu có thể đã cũ'],
    [
      'simulated',
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    ],
  ] as const)('labels %s', (state: DataState, label: string) => {
    expect(stateLabel(state)).toBe(label);
  });

  it.each([
    'loading',
    'empty',
    'ready',
    'warning',
    'error',
    'forbidden',
    'offline',
    'simulated',
  ] as const)(
    'renders mobile semantic state %s with text and icon',
    (state) => {
      expect(stateLabel(state).length).toBeGreaterThan(0);
      expect(stateIcon(state).length).toBeGreaterThan(0);
      expect(stateColor(state)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    },
  );

  it('keeps warning and stale on the reload semantic with text and icon', () => {
    for (const state of ['warning', 'stale'] as const) {
      expect(stateIcon(state).length).toBeGreaterThan(0);
      expect(stateColor(state)).toBe(mobileBaseline.color.warning);
    }
    expect(statesSource()).toContain('Tải lại dữ liệu để xem bản mới nhất.');
  });

  it('uses approved Light/Blue values with native system fonts', () => {
    expect(mobileBaseline.color.canvas).toBe('#F8FAFC');
    expect(mobileBaseline.color.surface).toBe('#FFFFFF');
    expect(mobileBaseline.color.accent).toBe('#075985');
    expect(mobileBaseline.color.focus).toBe('#1D4ED8');
    expect(mobileBaseline.color.success).toBe('#166534');
    expect(mobileBaseline.color.warning).toBe('#854D0E');
    expect(mobileBaseline.color.danger).toBe('#B91C1C');
    expect(mobileBaseline.color.info).toBe('#1E40AF');
    expect(mobileBaseline.color.simulatedBg).toBe('#FFF7ED');
    expect(mobileBaseline.color.simulatedText).toBe('#9A3412');
    expect(mobileBaseline.font.mono).toBe('monospace');
    expect(mobileBaseline.controlMin).toBe(44);
    const source = statesSource();
    expect(source).toContain('sans-serif');
    expect(source).toContain('monospace');
  });

  it('keeps 44px touch targets and avoids banned presentation', () => {
    const source = statesSource();
    expect(source).toContain('minHeight');
    expect(source).toContain('minWidth');
    expect(source).not.toMatch(/#000000|#000\b|gradient|neon|glow/i);
  });
});
