'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ModuleSidebar } from '@/components/navigation/ModuleSidebar';
import {
  MODULES,
  activeFeatureId,
  visibleFeatures,
  type FeatureDef,
  type ModuleId,
} from '@/components/navigation/feature-registry';
import {
  ModuleEmptyState,
  ModuleErrorState,
  ModuleLoadingState,
  ModuleOfflineNotice,
} from '@/components/shell/ModuleStatus';
import { useModuleSession } from '@/components/shell/useModuleSession';

function useLocationHash(): string {
  const [hash, setHash] = useState<string>('');
  useEffect(() => {
    function sync() {
      setHash(window.location.hash);
    }
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return hash;
}

function readCollapsed(module: ModuleId): boolean {
  try {
    return (
      window.localStorage.getItem(`civicos:sidebar:${module}`) === 'collapsed'
    );
  } catch {
    return false;
  }
}

function useCollapsed(module: ModuleId): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    function sync() {
      setCollapsed(readCollapsed(module));
    }
    sync();
  }, [module]);
  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          `civicos:sidebar:${module}`,
          next ? 'collapsed' : 'open',
        );
      } catch {
        /* Storage is best-effort; the toggle still applies. */
      }
      return next;
    });
  }
  return [collapsed, toggle];
}

export function ModuleShell({
  module,
  children,
}: {
  module: ModuleId;
  children: React.ReactNode;
}) {
  const definition = MODULES[module];
  const pathname = usePathname() ?? '';
  const hash = useLocationHash();
  const { session, assignments, state, error, online, retry } =
    useModuleSession(module);
  const [collapsed, toggleCollapsed] = useCollapsed(module);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openedOnceRef = useRef(false);
  const suppressFocusRef = useRef(false);

  const features = useMemo(
    () => visibleFeatures(module, session, assignments),
    [module, session, assignments],
  );
  const activeId = useMemo(
    () => activeFeatureId(features, pathname, hash),
    [features, pathname, hash],
  );
  const activeFeature: FeatureDef | null =
    features.find((feature) => feature.id === activeId) ?? null;

  function closeDrawer(returnFocus: boolean) {
    suppressFocusRef.current = !returnFocus;
    setDrawerOpen(false);
  }

  function openDrawer() {
    openedOnceRef.current = true;
    setDrawerOpen(true);
  }

  useEffect(() => {
    function closeOnNavigate() {
      suppressFocusRef.current = true;
      setDrawerOpen(false);
    }
    closeOnNavigate();
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen && !suppressFocusRef.current && openedOnceRef.current) {
      menuButtonRef.current?.focus();
    }
    if (!drawerOpen) suppressFocusRef.current = false;
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (
      document.activeElement &&
      document.activeElement !== document.body &&
      dialog.contains(document.activeElement)
    )
      return;
    dialog
      .querySelector<HTMLElement>('nav a[href]')
      ?.focus({ preventScroll: true });
  }, [drawerOpen, state, features.length]);

  useEffect(() => {
    if (!drawerOpen) return;
    const dialog = drawerRef.current;
    if (!dialog) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer(true);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((element) => element.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  function sidebarBody(navId: string) {
    if (state === 'loading') {
      return <ModuleLoadingState label="điều hướng" />;
    }
    if (state === 'error') {
      return (
        <ModuleErrorState
          message={error ?? 'Không thể tải điều hướng.'}
          onRetry={retry}
          retryLabel="Thử tải lại điều hướng"
        />
      );
    }
    if (!session) {
      return (
        <p
          className="rounded-xl border p-4 text-sm leading-6"
          style={{
            borderColor: 'var(--civicos-border)',
            borderRadius: 'var(--civicos-radius-md)',
            color: 'var(--civicos-text-muted)',
            background: 'var(--civicos-surface)',
          }}
        >
          Đăng nhập để xem điều hướng theo phạm vi được giao.
        </p>
      );
    }
    if (!features.length) {
      return (
        <ModuleEmptyState message="Chưa có Feature nào trong phạm vi của tài khoản." />
      );
    }
    return (
      <ModuleSidebar
        navLabel={`Điều hướng ${definition.label}`}
        navId={navId}
        features={features}
        activeId={activeId}
        collapsed={navId === 'module-sidebar' && collapsed}
      />
    );
  }

  return (
    <div
      data-testid="module-shell"
      data-module={module}
      className="mt-8 flex flex-col gap-6 lg:flex-row"
    >
      <aside
        className={`hidden shrink-0 motion-safe:transition-all motion-safe:duration-150 lg:block ${collapsed ? 'lg:w-16' : 'lg:w-60'}`}
      >
        <div className="space-y-3 lg:sticky lg:top-6">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="module-sidebar"
            aria-label={collapsed ? 'Mở rộng điều hướng' : 'Thu gọn điều hướng'}
            className="hidden min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-xs lg:inline-flex"
            style={{
              borderColor: 'var(--civicos-border)',
              borderRadius: 'var(--civicos-radius-sm)',
              color: 'var(--civicos-text-muted)',
              background: 'var(--civicos-surface)',
            }}
          >
            {collapsed ? '»' : '«'}
            <span className={collapsed ? 'sr-only' : ''}>
              {collapsed ? 'Mở rộng' : 'Thu gọn'}
            </span>
          </button>
          {sidebarBody('module-sidebar')}
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <p
            className="font-mono text-xs tracking-[0.16em] uppercase"
            style={{ color: 'var(--civicos-accent)' }}
          >
            CivicOS / {definition.label}
          </p>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={openDrawer}
            aria-expanded={drawerOpen}
            aria-controls="module-drawer"
            aria-label={`Mở điều hướng ${definition.label}`}
            className="min-h-[44px] rounded-lg border px-4 py-2 text-sm"
            style={{
              borderColor: 'var(--civicos-border)',
              borderRadius: 'var(--civicos-radius-sm)',
              color: 'var(--civicos-accent)',
              background: 'var(--civicos-surface)',
            }}
          >
            Menu
          </button>
        </div>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            <li>
              <Link
                href="/"
                className="underline-offset-4 hover:underline"
                style={{ color: 'var(--civicos-text-muted)' }}
              >
                Trung tâm
              </Link>
            </li>
            <li aria-hidden="true" style={{ color: 'var(--civicos-border)' }}>
              /
            </li>
            {activeFeature ? (
              <>
                <li>
                  <Link
                    href={definition.homeHref}
                    className="underline-offset-4 hover:underline"
                    style={{ color: 'var(--civicos-text-muted)' }}
                  >
                    Phân hệ {definition.label}
                  </Link>
                </li>
                <li
                  aria-hidden="true"
                  style={{ color: 'var(--civicos-border)' }}
                >
                  /
                </li>
                <li>
                  <span
                    aria-current="page"
                    style={{ color: 'var(--civicos-text)' }}
                  >
                    {activeFeature.label}
                  </span>
                </li>
              </>
            ) : (
              <li>
                <span
                  aria-current="page"
                  style={{ color: 'var(--civicos-text)' }}
                >
                  Phân hệ {definition.label}
                </span>
              </li>
            )}
          </ol>
        </nav>
        {!online ? <ModuleOfflineNotice /> : null}
        {children}
      </div>
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => closeDrawer(true)}
            className="absolute inset-0"
            style={{ background: 'rgba(23, 32, 51, 0.5)' }}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Điều hướng ${definition.label}`}
            id="module-drawer"
            className="absolute top-0 left-0 flex h-full w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto border-r p-5"
            style={{
              borderColor: 'var(--civicos-border)',
              background: 'var(--civicos-surface)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <p
                className="font-mono text-xs tracking-[0.16em] uppercase"
                style={{ color: 'var(--civicos-accent)' }}
              >
                CivicOS / {definition.label}
              </p>
              <button
                type="button"
                onClick={() => closeDrawer(true)}
                aria-label="Đóng điều hướng"
                className="min-h-[44px] min-w-[44px] rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: 'var(--civicos-border)',
                  borderRadius: 'var(--civicos-radius-sm)',
                  color: 'var(--civicos-text)',
                  background: 'var(--civicos-surface)',
                }}
              >
                ✕
              </button>
            </div>
            <div onClick={() => closeDrawer(false)}>
              {sidebarBody('module-drawer-nav')}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
