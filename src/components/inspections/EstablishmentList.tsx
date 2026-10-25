'use client';

import { useEffect, useState } from 'react';

import {
  FeedbackMessage,
  readResponseError,
  useOnlineStatus,
} from '@/components/field/client-state';

import { establishmentChangedEventName } from './EstablishmentForm';

type Establishment = {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  type: string;
  risk?: string;
  status?: string;
};

// Presentation-only badge helpers: state keeps text + icon, color only
// reinforces the same meaning per the shared Light/Blue semantic contract.
function riskLabel(risk: string) {
  return (
    { low: 'Thấp', medium: 'Trung bình', high: 'Cao' }[risk] ?? risk
  );
}

function riskIcon(risk: string) {
  if (risk === 'high') return '⚠';
  if (risk === 'medium') return '▲';
  if (risk === 'low') return '●';
  return '○';
}

function riskBadgeClass(risk: string) {
  if (risk === 'high')
    return 'border-[var(--civicos-danger)] text-[var(--civicos-danger)]';
  if (risk === 'medium')
    return 'border-[var(--civicos-warning)] text-[var(--civicos-warning)]';
  if (risk === 'low')
    return 'border-[var(--civicos-success)] text-[var(--civicos-success)]';
  return 'border-[var(--civicos-border)] text-[var(--civicos-text-muted)]';
}

function statusMeta(status?: string) {
  return (
    { active: 'Đang hoạt động', archived: 'Đã lưu trữ' }[status ?? 'active'] ??
    (status ?? 'active')
  );
}

export function EstablishmentList() {
  const online = useOnlineStatus();
  const [items, setItems] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [stats, setStats] = useState<{
    totalInspections: number;
    results: { pass: number; reminder: number; needs_action: number };
  } | null>(null);

  useEffect(() => {
    if (!online) return;
    fetch('/api/establishments')
      .then(async (response) => {
        setError(null);
        setDenied(false);
        if (!response.ok) {
          const message = await readResponseError(
            response,
            'ESTABLISHMENTS_FAILED',
          );
          throw Object.assign(new Error(message), {
            denied: response.status === 401 || response.status === 403,
          });
        }
        setItems((await response.json()).establishments);
      })
      .catch((reason: unknown) => {
        setDenied(
          reason instanceof Error &&
            'denied' in reason &&
            Boolean(reason.denied),
        );
        setError(
          reason instanceof Error ? reason.message : 'Không thể tải danh mục.',
        );
      })
      .finally(() => setLoading(false));
  }, [online, reloadToken]);
  useEffect(() => {
    if (!online) return;
    fetch('/api/inspections/stats')
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setStats(body?.stats ?? null))
      .catch(() => setStats(null));
  }, [online, reloadToken]);
  useEffect(() => {
    const refresh = () => setReloadToken((value) => value + 1);
    window.addEventListener(establishmentChangedEventName, refresh);
    return () =>
      window.removeEventListener(establishmentChangedEventName, refresh);
  }, []);
  if (!online && !items.length)
    return (
      <FeedbackMessage
        message="Offline: danh mục cơ sở cần kết nối để tải dữ liệu mới."
        tone="warning"
      />
    );
  if (loading)
    return (
      <p className="text-sm text-[var(--civicos-text-muted)]" role="status">
        Đang tải danh mục cơ sở…
      </p>
    );
  if (error)
    return (
      <div className="space-y-3">
        <FeedbackMessage
          message={
            denied ? `Không có quyền xem danh mục cơ sở: ${error}` : error
          }
          tone={denied ? 'warning' : 'error'}
        />
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="civicos-control border-[var(--civicos-border)] px-3 py-2 text-xs text-[var(--civicos-text-muted)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-text)]"
        >
          Thử lại
        </button>
      </div>
    );
  if (!items.length)
    return (
      <div className="civicos-feedback rounded-xl border-dashed p-8 text-sm text-[var(--civicos-text-muted)]">
        <span aria-hidden="true">○ </span>
        Chưa có cơ sở kinh doanh trong danh mục.
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          aria-label="Lọc loại hình"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="civicos-control min-h-[44px] border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-sm text-[var(--civicos-text)]"
        >
          <option value="">Tất cả loại hình</option>
          {[...new Set(items.map((item) => item.type))].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc risk"
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value)}
          className="civicos-control min-h-[44px] border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-sm text-[var(--civicos-text)]"
        >
          <option value="">Tất cả risk</option>
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
        </select>
        <select
          aria-label="Lọc trạng thái"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="civicos-control min-h-[44px] border-[var(--civicos-border)] bg-[var(--civicos-canvas)] px-3 py-2 text-sm text-[var(--civicos-text)]"
        >
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="archived">Đã lưu trữ</option>
        </select>
      </div>
      {stats ? (
        <dl className="civicos-surface grid gap-3 rounded-xl p-4 text-xs text-[var(--civicos-text-muted)] sm:grid-cols-4">
          <div>
            <dt>Tổng kiểm tra</dt>
            <dd className="mt-1 text-lg text-[var(--civicos-text)]">
              {stats.totalInspections}
            </dd>
          </div>
          <div>
            <dt>Đạt</dt>
            <dd className="mt-1 text-lg text-[var(--civicos-success)]">
              {stats.results.pass}
            </dd>
          </div>
          <div>
            <dt>Nhắc nhở</dt>
            <dd className="mt-1 text-lg text-[var(--civicos-warning)]">
              {stats.results.reminder}
            </dd>
          </div>
          <div>
            <dt>Cần xử lý</dt>
            <dd className="mt-1 text-lg text-[var(--civicos-danger)]">
              {stats.results.needs_action}
            </dd>
          </div>
        </dl>
      ) : null}
      <ul className="space-y-3">
        {!online ? (
          <li>
            <FeedbackMessage
              message="Offline: đang hiển thị danh mục cơ sở đã tải trước đó."
              tone="warning"
            />
          </li>
        ) : null}
        {items
          .filter(
            (item) =>
              (!typeFilter || item.type === typeFilter) &&
              (!riskFilter || item.risk === riskFilter) &&
              (!statusFilter || (item.status ?? 'active') === statusFilter),
          )
          .map((item) => (
            <li key={item.id}>
              <a
                href={`/inspections/establishments/${item.id}`}
                className="civicos-surface block rounded-xl p-5 motion-safe:transition-colors hover:bg-[var(--civicos-surface-muted)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-lg font-semibold leading-6 text-[var(--civicos-text)]">
                    {item.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.risk ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${riskBadgeClass(item.risk)}`}
                      >
                        <span aria-hidden="true">{riskIcon(item.risk)}</span>
                        {riskLabel(item.risk)}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--civicos-border)] px-3 py-1 text-xs font-medium text-[var(--civicos-text-muted)]">
                      <span aria-hidden="true">
                        {(item.status ?? 'active') === 'active' ? '● ' : '○ '}
                      </span>
                      {statusMeta(item.status)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--civicos-text-muted)]">
                  {item.type} · {item.ownerName}
                </p>
                <p className="mt-3 break-words text-sm leading-6 text-[var(--civicos-text)]">
                  {item.address}
                </p>
              </a>
            </li>
          ))}
      </ul>
    </div>
  );
}
