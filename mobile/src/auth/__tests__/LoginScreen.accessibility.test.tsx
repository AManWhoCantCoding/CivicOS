import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mobileBaseline } from '../../components/States';

describe('Login accessibility contract', () => {
  it('keeps named fields and a named button with the measured touch target', () => {
    const source = readFileSync(join(__dirname, '../LoginScreen.tsx'), 'utf8');
    expect(source).toContain('accessibilityLabel="Email"');
    expect(source).toContain('accessibilityLabel="Mật khẩu"');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('Đăng nhập');
    expect(mobileBaseline.controlMin).toBe(44);
    expect(source).toContain('minHeight: mobileBaseline.controlMin + 1');
  });
});
