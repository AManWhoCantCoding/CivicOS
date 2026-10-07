import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { deepLinkFor } from '../../mobile/src/navigation/deepLinks';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const sessionContext = () => readSource('mobile/src/auth/SessionContext.tsx');
const loginScreen = () => readSource('mobile/src/auth/LoginScreen.tsx');
const navigator = () => readSource('mobile/src/navigation/AppNavigator.tsx');
const deepLinks = () => readSource('mobile/src/navigation/deepLinks.ts');
const states = () => readSource('mobile/src/components/States.tsx');
const writeGuard = () => readSource('mobile/src/components/WriteGuard.ts');

describe('T-011 mobile auth/shell', () => {
  it('checks session state destinations', () => {
    // SessionProvider keeps the locked loading/unauthenticated/expired
    // boundaries and the existing session seams.
    expect(sessionContext()).toContain("status: 'loading'");
    expect(sessionContext()).toContain("{ status: 'unauthenticated' }");
    expect(sessionContext()).toContain("{ status: 'expired' }");
    expect(sessionContext()).toContain('getSession()');
    expect(sessionContext()).toContain('onSessionExpired');
    expect(sessionContext()).toContain('logout()');
    expect(sessionContext()).toContain('SESSION_PROVIDER_REQUIRED');
    // The shell keeps one destination per session state: loading copy,
    // login for unauthenticated/expired, Settings/logout when authenticated.
    expect(navigator()).toContain("session.status === 'loading'");
    expect(navigator()).toContain('Đang tải phiên…');
    expect(navigator()).toContain("session.status !== 'authenticated'");
    expect(navigator()).toContain('<LoginScreen />');
    expect(navigator()).toContain('<SettingsScreen />');
    expect(navigator()).toContain('Đăng xuất');
    expect(navigator()).toContain('signOut');
    // Login keeps the existing session action and safe error copy.
    expect(loginScreen()).toContain('login(email, password)');
    expect(loginScreen()).toContain('refresh()');
    expect(loginScreen()).toContain('Đăng nhập thất bại. Vui lòng thử lại.');
    expect(loginScreen()).toContain('accessibilityLabel="Email"');
    expect(loginScreen()).toContain('accessibilityLabel="Mật khẩu"');
  });

  it('checks deep-link/back preservation', () => {
    // Executable: deepLinkFor keeps route mapping and every parameter.
    expect(deepLinkFor({ incidentId: 'inc-1' })).toEqual({
      route: 'Incident',
      params: expect.objectContaining({ incidentId: 'inc-1' }),
    });
    expect(
      deepLinkFor({
        relatedInfo: { entityType: 'RESIDENT', id: 'res-1' },
      }),
    ).toEqual({
      route: 'RelatedInfoDetail',
      params: expect.objectContaining({
        relatedInfo: { entityType: 'RESIDENT', id: 'res-1' },
      }),
    });
    expect(deepLinkFor({ resourceId: 'map-1' })).toEqual({
      route: 'Map',
      params: expect.objectContaining({ resourceId: 'map-1' }),
    });
    expect(deepLinkFor({ coordinates: { lat: 20.95, lng: 105.98 } })).toEqual({
      route: 'Map',
      params: expect.objectContaining({
        coordinates: { lat: 20.95, lng: 105.98 },
      }),
    });
    expect(deepLinkFor({})).toBeNull();
    // Route identifiers stay exactly the locked tab set.
    for (const route of [
      'Map',
      'RelatedInfo',
      'Alarms',
      'Dispatches',
      'Tasks',
      'Incident',
      'Land',
      'Settings',
    ]) {
      expect(navigator()).toContain(`'${route}'`);
    }
    expect(navigator()).not.toMatch(
      /'(Create|Update|CitizenIntake|Edit|Approve|Upload)'/,
    );
    // Previous-surface context survives tab/back/deep-link navigation:
    // deep links install params, map entries reuse the stored context, and
    // manual tabs switch routes without replacing the context object.
    expect(deepLinks()).toContain('incidentId');
    expect(deepLinks()).toContain('resourceId');
    expect(deepLinks()).toContain('coordinates');
    expect(deepLinks()).toContain('relatedInfo');
    expect(deepLinks()).toContain('assignmentSummary');
    expect(navigator()).toContain('setContext(link.params)');
    expect(navigator()).toContain('openMap(item, context)');
    expect(navigator()).toContain('openMap(undefined, context)');
    expect(navigator()).toContain('onOpenMap={openLandParcelOnMap}');
    expect(navigator()).toContain('onOpenLandDetail={openLandParcelDetail}');
  });

  it('checks state components and no new mutation controls', () => {
    // Auth/shell reuse the shared baseline: no hardcoded palette drift,
    // minimum 44px controls, no invented visual vocabulary.
    for (const source of [loginScreen(), navigator()]) {
      expect(source).toContain('mobileBaseline');
      expect(source).toContain('minHeight');
      expect(source).toContain('accessibilityRole="button"');
      expect(source).not.toMatch(/#000000|#000\b|gradient|neon|glow/i);
      expect(source).not.toContain('official');
      expect(source).not.toContain('certified');
    }
    // Shared state primitives keep safe copy, masking, offline and
    // accessibility behavior at the 390x844 boundary.
    expect(states()).toContain('StateMessage');
    expect(states()).toContain('MaskedValue');
    expect(states()).toContain('OfflineBanner');
    expect(states()).toContain('controlMin: 44');
    expect(states()).toContain('Đang ngoại tuyến');
    expect(states()).toContain(
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    );
    expect(states()).toContain('accessibilityLabel="Thử lại"');
    expect(states()).toContain('accessibilityLabel="offline-banner"');
    expect(states()).toContain("accessibilityLabel={masked ? 'masked-value'");
    expect(writeGuard()).toContain('READ_ONLY_MVP');
    expect(writeGuard()).toContain('MAP_OFFLINE_WRITE_BLOCKED');
    expect(writeGuard()).toContain("path === '/api/auth/session'");
    // No mobile create/edit/submit/approve/upload/public-intake capability
    // and no new API surface inside the auth/shell/state scope.
    for (const source of [
      sessionContext(),
      loginScreen(),
      navigator(),
      deepLinks(),
      states(),
      writeGuard(),
    ]) {
      expect(source).not.toMatch(/Tạo mới|submitOffline|public-intake/i);
      expect(source).not.toMatch(/CitizenIntake/i);
      expect(source).not.toMatch(/\bapprove\b|\bupload\b/i);
    }
    expect(loginScreen()).not.toContain("'/api/");
    expect(navigator()).not.toContain("'/api/");
    expect(deepLinks()).not.toContain("'/api/");
  });
});
