'use client';

import { useMemo, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
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
};

export function RoleWorkspaceView({
  session,
  assignments,
  sessionState,
  assignmentState,
  online,
  onRetry,
}: RoleWorkspaceViewProps) {
  const projection = useMemo(
    () => buildWorkspaceProjection(session, assignments),
    [session, assignments],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (sessionState === 'loading') {
    return (
      <section data-testid="workspace-session-loading" className="mt-8">
        <span
          className="text-sm text-[var(--civicos-text-muted)]"
          aria-live="polite"
          aria-busy="true"
        >
          Đang kiểm tra phiên…
        </span>
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
              className="min-h-[44px] rounded-lg border px-4 py-2 text-sm transition motion-safe:duration-150"
              style={
                active
                  ? {
                      borderColor: 'var(--civicos-accent)',
                      background: 'var(--civicos-surface)',
                      borderRadius: 'var(--civicos-radius-md)',
                      color: 'var(--civicos-accent)',
                      fontWeight: 600,
                    }
                  : {
                      borderColor: 'var(--civicos-border)',
                      borderRadius: 'var(--civicos-radius-md)',
                      color: 'var(--civicos-text-muted)',
                      background: 'var(--civicos-surface)',
                    }
              }
            >
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
        <ul className="mt-4 space-y-1">
          {activeModule.features.map((feature) => (
            <li key={feature.id}>
              <a
                href={feature.href}
                title={feature.label}
                className="flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition motion-safe:duration-150"
                style={{
                  borderColor: 'transparent',
                  borderRadius: 'var(--civicos-radius-md)',
                  color: 'var(--civicos-text)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: 'var(--civicos-border)' }}
                />
                <span className="truncate">{feature.label}</span>
              </a>
            </li>
          ))}
        </ul>
        {/* Module entry reuses the first eligible projected feature href;
            never the module home metadata route, which may not be eligible. */}
        {activeModule.features[0]?.href ? (
          <a
            href={activeModule.features[0].href}
            className="mt-4 inline-block min-h-[44px] text-sm font-semibold"
            style={{ color: 'var(--civicos-accent)' }}
          >
            Mở phân hệ →
          </a>
        ) : null}
      </nav>
    </section>
  );
}

export function RoleWorkspace() {
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
    />
  );
}
