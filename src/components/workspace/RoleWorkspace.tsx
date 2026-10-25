'use client';

import { useMemo, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { DemoCenter } from '@/components/demo/DemoCenter';
import type { DemoTargetGuardResult } from '@/modules/demo/target-guard';
import type {
  AssignmentScope,
  SessionScope,
} from '@/components/navigation/feature-registry';
import {
  buildWorkspaceProjection,
  type WorkspaceProjection,
} from '@/components/navigation/workspace-registry';
import {
  ModuleErrorState,
  ModuleLoadingState,
  ModuleOfflineNotice,
} from '@/components/shell/ModuleStatus';
import { useWorkspaceSession } from '@/components/shell/useWorkspaceSession';

// Presentation-only selection: the first permitted module is the initial tab.
// Selecting a tab only swaps the visible feature list; it never grants entry
// permission. Direct routes keep their existing server authorization.
export function resolveActiveModuleId(
  modules: WorkspaceProjection['modules'],
  selectedId: string | null,
): string | null {
  if (selectedId && modules.some((entry) => entry.module.id === selectedId)) {
    return selectedId;
  }
  return modules[0]?.module.id ?? null;
}

export type RoleWorkspaceViewProps = {
  session: SessionScope;
  assignments: readonly AssignmentScope[];
  sessionState: 'loading' | 'ready' | 'error';
  assignmentState: 'loading' | 'ready' | 'error';
  online: boolean;
  onRetry: () => void;
  // Server-computed sanitized demo target; absent keeps the normal app mode.
  demoTarget?: DemoTargetGuardResult;
};

export function RoleWorkspaceView({
  session,
  assignments,
  sessionState,
  assignmentState,
  online,
  onRetry,
  demoTarget,
}: RoleWorkspaceViewProps) {
  const projection = useMemo(
    () => buildWorkspaceProjection(session, assignments),
    [session, assignments],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (sessionState === 'loading') {
    return (
      <section data-testid="workspace-session-loading" className="mt-8">
        <div
          role="status"
          aria-busy="true"
          className="flex min-h-[44px] items-center gap-2 rounded-xl border p-4"
          style={{
            background: 'var(--civicos-surface-muted)',
            borderColor: 'var(--civicos-border)',
            color: 'var(--civicos-info)',
            borderRadius: 'var(--civicos-radius-md)',
          }}
        >
          <span aria-hidden="true">◌</span>
          <span className="text-sm">Đang kiểm tra phiên…</span>
        </div>
      </section>
    );
  }

  if (sessionState === 'error') {
    return (
      <section data-testid="workspace-session-error" className="mt-8">
        <ModuleErrorState
          message="Không thể kiểm tra phiên đăng nhập."
          onRetry={onRetry}
          retryLabel="Thử lại"
        />
      </section>
    );
  }

  if (!session) {
    return (
      <section data-testid="workspace-login-required" className="mt-8">
        <p
          className="rounded-xl border p-5 text-sm leading-6 break-words"
          style={{
            borderColor: 'var(--civicos-border)',
            borderLeft: '3px solid var(--civicos-info)',
            borderRadius: 'var(--civicos-radius-md)',
            color: 'var(--civicos-text-muted)',
            background: 'var(--civicos-surface)',
          }}
        >
          <span
            aria-hidden="true"
            style={{ color: 'var(--civicos-info)' }}
          >
            ℹ{' '}
          </span>
          Đăng nhập để xem điều hướng theo phạm vi được giao.
        </p>
      </section>
    );
  }

  // Fail closed: no projected feature renders until the assignment read
  // succeeds, even for roles that bypass task gates.
  if (assignmentState === 'loading') {
    return (
      <section data-testid="workspace-assignments-loading" className="mt-8">
        <ModuleLoadingState label="điều hướng" />
      </section>
    );
  }

  if (assignmentState === 'error') {
    return (
      <section data-testid="workspace-assignments-error" className="mt-8">
        <ModuleErrorState
          message="Không thể tải điều hướng."
          onRetry={onRetry}
          retryLabel="Thử tải lại điều hướng"
        />
      </section>
    );
  }

  if (projection.modules.length === 0) {
    return (
      <section data-testid="workspace-access-denied" className="mt-8">
        <AccessDenied />
      </section>
    );
  }

  const activeModuleId = resolveActiveModuleId(projection.modules, selectedId);
  const activeModule =
    projection.modules.find((entry) => entry.module.id === activeModuleId) ??
    projection.modules[0];

  return (
    <section data-testid="workspace-ready" className="mt-8 space-y-4">
      {!online ? <ModuleOfflineNotice /> : null}
      <div
        role="tablist"
        aria-label="Điều hướng"
        className="flex flex-wrap gap-2"
      >
        {projection.modules.map((entry) => {
          const active = entry.module.id === activeModule.module.id;
          return (
            <button
              key={entry.module.id}
              type="button"
              role="tab"
              id={`workspace-tab-${entry.module.id}`}
              aria-selected={active}
              aria-controls={`workspace-features-${entry.module.id}`}
              onClick={() => setSelectedId(entry.module.id)}
              data-active={active ? 'true' : 'false'}
              className="civicos-nav-tab min-h-[44px] px-4 py-2 text-sm"
            >
              {active ? (
                <span aria-hidden="true">●</span>
              ) : (
                <span aria-hidden="true">○</span>
              )}
              {entry.module.label}
            </button>
          );
        })}
      </div>
      <nav
        aria-label={`Điều hướng ${activeModule.module.label}`}
        id={`workspace-features-${activeModule.module.id}`}
        className="rounded-2xl border p-5"
        style={{
          background: 'var(--civicos-surface)',
          borderColor: 'var(--civicos-border)',
          borderRadius: 'var(--civicos-radius-lg)',
        }}
      >
        <p
          className="text-sm leading-6"
          style={{ color: 'var(--civicos-text-muted)' }}
        >
          {activeModule.module.description}
        </p>
        <ul className="mt-4 space-y-2">
          {activeModule.features.map((feature) => (
            <li key={feature.id}>
              <a
                href={feature.href}
                title={feature.label}
                className="group flex min-h-[44px] items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-focus)]"
                style={{
                  borderColor: 'var(--civicos-border)',
                  borderRadius: 'var(--civicos-radius-md)',
                  color: 'var(--civicos-text)',
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: 'var(--civicos-accent)' }}
                  />
                  <span className="truncate">{feature.label}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-[var(--civicos-text-muted)] motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-x-0.5"
                >
                  ›
                </span>
              </a>
            </li>
          ))}
        </ul>
        {/* Module entry reuses the first eligible projected feature href;
            never the module home metadata route, which may not be eligible. */}
        {activeModule.features[0]?.href ? (
          <a
            href={activeModule.features[0].href}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border px-4 text-sm font-semibold underline-offset-4 hover:underline motion-safe:transition-colors motion-safe:duration-150"
            style={{
              borderColor: 'color-mix(in srgb, var(--civicos-accent) 40%, transparent)',
              background: 'color-mix(in srgb, var(--civicos-accent) 8%, var(--civicos-surface))',
              borderRadius: 'var(--civicos-radius-md)',
              color: 'var(--civicos-accent)',
            }}
          >
            Mở phân hệ →
          </a>
        ) : null}
      </nav>
      {/* Demo Center mounts only after the authenticated, assignment-ready
          projection gates above; disabled demo mode renders nothing. */}
      {demoTarget && demoTarget.reason !== 'DEMO_MODE_DISABLED' ? (
        <DemoCenter target={demoTarget} reloadScope={onRetry} />
      ) : null}
    </section>
  );
}

export function RoleWorkspace({
  demoTarget,
}: {
  demoTarget?: DemoTargetGuardResult;
}) {
  const { session, assignments, sessionState, assignmentState, online, retry } =
    useWorkspaceSession();
  return (
    <RoleWorkspaceView
      session={session}
      assignments={assignments}
      sessionState={sessionState}
      assignmentState={assignmentState}
      online={online}
      onRetry={retry}
      demoTarget={demoTarget}
    />
  );
}
