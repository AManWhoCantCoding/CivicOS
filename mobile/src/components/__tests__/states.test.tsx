import { stateLabel, type DataState } from '../States';

describe('data state matrix', () => {
  it.each([
    ['loading', 'Đang tải'],
    ['empty', 'Chưa có dữ liệu'],
    ['error', 'Không thể tải dữ liệu'],
    ['forbidden', 'Bạn không có quyền xem dữ liệu này'],
    ['offline', 'Đang ngoại tuyến'],
  ] as const)('labels %s', (state: DataState, label: string) => {
    expect(stateLabel(state)).toBe(label);
  });
});
