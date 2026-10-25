'use client';

import { useCallback } from 'react';

import type { ModuleId } from '@/components/navigation/feature-registry';
import type { WorkspaceModuleProjection } from '@/components/navigation/workspace-registry';

// Presentation-only single-expanded module tabs. Selecting a tab only swaps the
// visible feature list; it never grants entry permission. Grouping and
// eligibility come from the existing workspace projection
// (visibleNavigationFeatures semantics); this component only presents it.
export function ModuleTabs({
  modules,
  activeModuleId,
  onSelect,
  idPrefix,
  controlsId,
}: {
  modules: readonly WorkspaceModuleProjection[];
  activeModuleId: ModuleId | null;
  onSelect: (moduleId: ModuleId) => void;
  idPrefix: string;
  controlsId: string;
}) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (
        event.key !== 'ArrowRight' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowDown' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'Home' &&
        event.key !== 'End'
      ) {
        return;
      }
      event.preventDefault();
      const ids = modules.map((entry) => entry.module.id);
      if (ids.length === 0) return;
      const current = activeModuleId ? ids.indexOf(activeModuleId) : -1;
      let next = current;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        next = current < 0 ? 0 : (current + 1) % ids.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        next =
          current < 0
            ? ids.length - 1
            : (current - 1 + ids.length) % ids.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = ids.length - 1;
      }
      const nextId = ids[next];
      if (!nextId) return;
      onSelect(nextId);
      document.getElementById(`${idPrefix}-tab-${nextId}`)?.focus();
    },
    [modules, activeModuleId, onSelect, idPrefix],
  );

  return (
    <div
      role="tablist"
      aria-label="Điều hướng"
      onKeyDown={handleKeyDown}
      className="flex flex-wrap gap-2"
    >
      {modules.map((entry) => {
        const active = entry.module.id === activeModuleId;
        return (
          <button
            key={entry.module.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${entry.module.id}`}
            aria-selected={active}
            aria-controls={controlsId}
            tabIndex={active ? 0 : -1}
            data-active={active ? 'true' : undefined}
            onClick={() => onSelect(entry.module.id)}
            className="civicos-nav-tab min-h-[44px] px-4 py-2 text-sm motion-safe:transition-colors motion-safe:duration-150"
          >
            {entry.module.label}
          </button>
        );
      })}
    </div>
  );
}
