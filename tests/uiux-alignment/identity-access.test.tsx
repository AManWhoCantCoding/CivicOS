import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const pages = () => [
  readSource('src/app/login/page.tsx'),
  readSource('src/app/identity/page.tsx'),
  readSource('src/app/users/page.tsx'),
  readSource('src/app/assignments/page.tsx'),
];

const components = () => [
  readSource('src/components/identity/LoginForm.tsx'),
  readSource('src/components/identity/SessionControls.tsx'),
  readSource('src/components/identity/AccessDenied.tsx'),
  readSource('src/components/identity/AssignmentWorkspace.tsx'),
  readSource('src/components/identity/CreateUserForm.tsx'),
  readSource('src/components/identity/UserPicker.tsx'),
  readSource('src/components/identity/OrganizationUnitPicker.tsx'),
];

const scoped = () => [...pages(), ...components()];

describe('T-004 identity/access', () => {
  it('keeps scoped identity presentation on Light/Blue semantic tokens', () => {
    for (const source of scoped()) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toContain('shadow-black');
      expect(source).not.toMatch(
        /(text|bg|border|accent)-(slate|cyan|rose|emerald)-\d+/,
      );
      expect(source).not.toMatch(/focus:(border|ring)-(cyan|rose|emerald)/);
    }
  });

  it('preserves login/session endpoints, methods, payloads and redirects', () => {
    const login = readSource('src/components/identity/LoginForm.tsx');
    expect(login).toContain("fetch('/api/auth/session'");
    expect(login).toContain("method: 'POST'");
    expect(login).toContain('JSON.stringify({ email, password })');
    expect(login).toContain("router.push('/')");
    expect(login).toContain('router.refresh()');
    expect(login).toContain('Email hoặc mật khẩu không hợp lệ.');
    expect(login).toContain('Phiên đăng nhập chưa được tạo. Vui lòng thử lại.');
    expect(login).toContain(
      'Không thể kết nối máy chủ xác thực. Vui lòng thử lại.',
    );

    const session = readSource('src/components/identity/SessionControls.tsx');
    expect(session).toContain(
      "fetch('/api/auth/session', { cache: 'no-store' })",
    );
    expect(session).toContain("method: 'DELETE'");
    expect(session).toContain("router.push('/login')");
    expect(session).toContain('router.refresh()');
    expect(session).toContain('parseSessionUser');
    expect(session).toContain('INVALID_SESSION_RESPONSE');
    expect(session).toContain('SESSION_FAILED');
    expect(session).toContain('LOGOUT_FAILED');
    expect(session).toContain('Không thể kiểm tra phiên đăng nhập.');
    expect(session).toContain('Không thể đăng xuất. Vui lòng thử lại.');
  });

  it('preserves server-gated identity/users/assignments visibility and route destinations', () => {
    const identity = readSource('src/app/identity/page.tsx');
    expect(identity).toContain('await getCurrentUser()');
    expect(identity).toContain(
      "canEnterEntry(current, ['identity-assignments'])",
    );
    expect(identity).toContain("canEnterEntry(current, ['identity-users'])");
    expect(identity).toContain('href="/"');
    expect(identity).toContain('href="/assignments"');
    expect(identity).toContain('href="/users"');
    expect(identity).toContain('<ModuleShell module="identity">');

    const users = readSource('src/app/users/page.tsx');
    expect(users).toContain('await getCurrentUser()');
    expect(users).toContain("canEnterEntry(current, ['identity-users'])");
    expect(users).toContain('listIdentityUsers(current)');
    expect(users).toContain('listOrganizationUnits(current)');
    expect(users).toContain('Chỉ Trưởng Công an xã được quản lý User.');
    expect(users).toContain('href="/"');
    expect(users).toContain('<CreateUserForm />');

    const assignments = readSource('src/app/assignments/page.tsx');
    expect(assignments).toContain('await getCurrentUser()');
    expect(assignments).toContain(
      "canEnterEntry(current, ['identity-assignments'])",
    );
    expect(assignments).toContain('href="/"');
    expect(assignments).toContain('<AssignmentWorkspace />');

    const workspace = readSource(
      'src/components/identity/AssignmentWorkspace.tsx',
    );
    expect(workspace).toContain(
      "'/api/identity/assignments?includeRevoked=true'",
    );
    expect(workspace).toContain("fetch('/api/identity/users'");
    expect(workspace).toContain("fetch('/api/identity/organization-units'");
    expect(workspace).toContain("method: 'POST'");
    expect(workspace).toContain("method: 'DELETE'");
    expect(workspace).toContain('assigneeUserIds');
    expect(workspace).toContain('organizationId: organizationId.trim()');
    expect(workspace).toContain('assignmentId');
    expect(workspace).toContain('reason: revokeReason.trim()');

    const create = readSource('src/components/identity/CreateUserForm.tsx');
    expect(create).toContain("fetch('/api/identity/users'");
    expect(create).toContain("method: 'POST'");
    expect(create).toContain('JSON.stringify({ email, name, role, password })');
    expect(create).toContain('USER_PROVISIONING_ROLES');
    expect(create).toContain('minLength={8}');
  });

  it('keeps forbidden/masked/empty/loading/error copy without raw disclosure', () => {
    const denied = readSource('src/components/identity/AccessDenied.tsx');
    expect(denied).toContain('Không có quyền truy cập');

    const workspace = readSource(
      'src/components/identity/AssignmentWorkspace.tsx',
    );
    expect(workspace).toContain(
      'Tài khoản hiện tại không được quản lý Assignment.',
    );
    expect(workspace).toContain('Không thể tải danh sách Assignment.');
    expect(workspace).toContain('Chưa có Assignment nào.');
    expect(workspace).toContain('Đang tải Assignment…');
    expect(workspace).toContain('Thử tải lại');
    expect(workspace).toContain('Lý do thu hồi:');
    expect(workspace).toContain('revoked · đã thu hồi');
    expect(workspace).toContain('role="alert"');
    expect(workspace).toContain('role="status"');

    const picker = readSource('src/components/identity/UserPicker.tsx');
    expect(picker).toContain(
      'Tài khoản hiện tại không được xem danh sách cán bộ.',
    );
    expect(picker).toContain('Không thể tải danh sách cán bộ.');
    expect(picker).toContain('Chưa có cán bộ hoạt động trong danh bạ.');
    expect(picker).toContain('Đang tải danh sách cán bộ…');

    const units = readSource(
      'src/components/identity/OrganizationUnitPicker.tsx',
    );
    expect(units).toContain(
      'Tài khoản hiện tại không được xem OrganizationUnit.',
    );
    expect(units).toContain('Không thể tải danh sách OrganizationUnit.');
    expect(units).toContain('Chọn OrganizationUnit');

    const create = readSource('src/components/identity/CreateUserForm.tsx');
    expect(create).toContain('Tài khoản hiện tại không được tạo User.');
    expect(create).toContain(
      'Không thể tạo User. Kiểm tra dữ liệu và thử lại.',
    );
    expect(create).toContain('Đã tạo User.');

    // No raw PII/API payload disclosure in scoped presentation.
    for (const source of scoped()) {
      expect(source).not.toContain('console.');
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toContain('innerHTML');
    }
  });

  it('keeps 44px controls, labels, focus, motion and long-label wrapping', () => {
    for (const source of scoped()) {
      if (
        /<(button|input|select|textarea|a|Link|label)/.test(source) &&
        !source.includes('export function AccessDenied')
      ) {
        expect(source).toContain('min-h-[44px]');
      }
    }
    for (const source of [
      readSource('src/components/identity/LoginForm.tsx'),
      readSource('src/components/identity/AssignmentWorkspace.tsx'),
      readSource('src/components/identity/CreateUserForm.tsx'),
      readSource('src/components/identity/OrganizationUnitPicker.tsx'),
    ]) {
      expect(source).toContain('<label');
      expect(source).toContain('focus:border-[var(--civicos-accent)]');
      expect(source).toContain('focus:ring-[var(--civicos-focus)]');
      expect(source).toContain('break-words');
    }
    // UserPicker options are checkboxes: token accent, labelled rows, and the
    // shared global :focus-visible ring carry keyboard focus.
    const userPicker = readSource('src/components/identity/UserPicker.tsx');
    expect(userPicker).toContain('<label');
    expect(userPicker).toContain('accent-[var(--civicos-accent)]');
    expect(userPicker).toContain('break-words');
    expect(readSource('src/app/globals.css')).toContain(':focus-visible');
    // Long directory rows wrap inside a bounded scroller.
    expect(readSource('src/components/identity/UserPicker.tsx')).toContain(
      'truncate',
    );
    expect(readSource('src/components/identity/UserPicker.tsx')).toContain(
      'overflow-y-auto',
    );
    expect(readSource('src/app/users/page.tsx')).toContain('overflow-x-auto');
    // Reduced motion stays governed by the shared global rule.
    expect(readSource('src/app/globals.css')).toContain(
      'prefers-reduced-motion',
    );
  });
});
