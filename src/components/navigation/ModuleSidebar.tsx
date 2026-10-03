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
                className={`flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition motion-safe:duration-150 ${collapsed ? 'justify-center px-2' : ''}`}
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
                        borderColor: 'transparent',
                        borderRadius: 'var(--civicos-radius-md)',
                        color: 'var(--civicos-text-muted)',
                      }
                }
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: active
                      ? 'var(--civicos-accent)'
                      : 'var(--civicos-border)',
                  }}
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
