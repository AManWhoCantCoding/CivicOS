'use client';

import Link from 'next/link';

import type { FeatureDef } from '@/components/navigation/feature-registry';

export function ModuleSidebar({
  navLabel,
  navId,
  features,
  activeId,
  collapsed,
}: {
  navLabel: string;
  navId: string;
  features: readonly FeatureDef[];
  activeId: string | null;
  collapsed: boolean;
}) {
  return (
    <nav aria-label={navLabel} id={navId}>
      <ul className="space-y-1">
        {features.map((feature) => {
          const active = feature.id === activeId;
          return (
            <li key={feature.id}>
              <Link
                href={feature.href}
                aria-current={active ? 'page' : undefined}
                title={feature.label}
                data-active={active ? 'true' : undefined}
                className={`civicos-nav-item w-full flex min-h-[44px] items-center gap-3 px-3 py-2.5 text-sm motion-safe:transition-colors motion-safe:duration-150 ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-[var(--civicos-accent)]' : 'bg-[var(--civicos-border)]'}`}
                />
                <span className={collapsed ? 'sr-only' : 'truncate'}>
                  {feature.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
