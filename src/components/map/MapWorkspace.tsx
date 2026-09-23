'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { toMapAreaGeoJson } from '@/modules/platform/map';

type MapAreaPoint = {
  latitude: number;
  longitude: number;
};

type MapMarkerView = {
  id: string;
  aggregateType: string;
  title: string;
  latitude: number;
  longitude: number;
  geometry?: { points: MapAreaPoint[] };
  hasArea: boolean;
  status: string;
  updatedAt: string;
};

type MapProviderView = {
  styleUrl: string;
  attribution: string;
  bounds: readonly number[];
  official: boolean;
};

type LoadState = 'loading' | 'ready' | 'error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readJson(
  path: string,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(path, { cache: 'no-store' });
  const body = (await response.json().catch(() => null)) as unknown;
  return { status: response.status, body };
}

// Workspace bản đồ nghiệp vụ với layer, legend và trạng thái đầy đủ.
export function MapWorkspace() {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);
  const [provider, setProvider] = useState<MapProviderView | null>(null);
  const [markers, setMarkers] = useState<MapMarkerView[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [masked, setMasked] = useState(false);
  const [online, setOnline] = useState(
    () => typeof window === 'undefined' || window.navigator.onLine,
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showInspections, setShowInspections] = useState(true);
  const [showAreas, setShowAreas] = useState(true);

  useEffect(() => {
    function sync() {
      setOnline(window.navigator.onLine);
    }
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const config = await readJson('/api/map/config');
      if (config.status !== 200 || !isRecord(config.body)) {
        throw new Error('MAP_PROVIDER_UNAVAILABLE');
      }
      const rawProvider = (config.body as { provider?: unknown }).provider;
      if (!isRecord(rawProvider) || typeof rawProvider.styleUrl !== 'string') {
        throw new Error('MAP_PROVIDER_UNAVAILABLE');
      }
      const nextProvider: MapProviderView = {
        styleUrl: rawProvider.styleUrl,
        attribution:
          typeof rawProvider.attribution === 'string'
            ? rawProvider.attribution
            : '',
        bounds: Array.isArray(rawProvider.bounds)
          ? (rawProvider.bounds as number[])
          : [],
        official: rawProvider.official === true,
      };
      const rows = await readJson('/api/map/markers');
      if (rows.status === 401) {
        setProvider(nextProvider);
        setMarkers([]);
        setMasked(true);
        setState('ready');
        return;
      }
      if (rows.status === 403) {
        setProvider(nextProvider);
        setMarkers([]);
        setDenied(true);
        setState('error');
        return;
      }
      if (rows.status !== 200) {
        throw new Error('MAP_LAYER_FAILED');
      }
      if (!isRecord(rows.body) || !Array.isArray(rows.body.markers)) {
        throw new Error('MAP_LAYER_FAILED');
      }
      setProvider(nextProvider);
      setMarkers(rows.body.markers as MapMarkerView[]);
      setUpdatedAt(new Date().toLocaleString('vi-VN'));
      setState('ready');
    } catch (reason: unknown) {
      setError(
        reason instanceof Error && reason.message === 'MAP_PROVIDER_UNAVAILABLE'
          ? 'Không thể tải provider bản đồ.'
          : 'Không thể tải lớp dữ liệu bản đồ.',
      );
      setState('error');
    }
  }, []);

  const refresh = useCallback(() => {
    setState('loading');
    setError(null);
    setDenied(false);
    setMasked(false);
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!online) return;
    const timer = window.setInterval(() => {
      void load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, online]);

  const visible = useMemo(
    () =>
      markers.filter((marker) => {
        if (marker.aggregateType === 'Incident' && !showIncidents) {
          return false;
        }
        if (marker.aggregateType === 'Inspection' && !showInspections) {
          return false;
        }
        if (marker.hasArea && !showAreas) return false;
        return true;
      }),
    [markers, showIncidents, showInspections, showAreas],
  );

  useEffect(() => {
    const activeProvider = provider;
    if (state !== 'ready' || !activeProvider || masked || denied) return;
    const node = mapNode.current;
    if (!node) return;
    let active = true;
    async function render(providerConfig: MapProviderView) {
      try {
        const { default: maplibregl } = await import('maplibre-gl');
        if (!active) return;
        mapRef.current?.remove();
        const bounds = providerConfig.bounds;
        const map = new maplibregl.Map({
          container: node,
          style: providerConfig.styleUrl,
          center:
            bounds.length === 4
              ? [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]
              : [0, 0],
          zoom: 12,
        });
        map.addControl(new maplibregl.NavigationControl());
        for (const marker of visible) {
          new maplibregl.Marker()
            .setLngLat([marker.longitude, marker.latitude])
            .addTo(map);
        }
        const areas = toMapAreaGeoJson(
          visible.map((marker) => ({
            id: marker.id,
            aggregateType: marker.aggregateType,
            title: marker.title,
            latitude: marker.latitude,
            longitude: marker.longitude,
            geometry: marker.geometry
              ? {
                  points: marker.geometry.points.map((point) => ({
                    latitude: point.latitude,
                    longitude: point.longitude,
                    coordinateReference: 'WGS84' as const,
                  })),
                  coordinateReference: 'WGS84' as const,
                }
              : undefined,
            status: marker.status,
            updatedAt: marker.updatedAt,
          })),
        );
        map.on('load', () => {
          if (map.getSource('map-areas')) return;
          map.addSource('map-areas', { type: 'geojson', data: areas });
          map.addLayer({
            id: 'map-areas-fill',
            type: 'fill',
            source: 'map-areas',
            paint: {
              'fill-color': '#34d399',
              'fill-opacity': 0.25,
            },
          });
          map.addLayer({
            id: 'map-areas-line',
            type: 'line',
            source: 'map-areas',
            paint: {
              'line-color': '#34d399',
              'line-width': 2,
            },
          });
        });
        if (active) mapRef.current = map;
      } catch {
        if (!active) return;
        setError('Không thể dựng lớp bản đồ, thử tải lại.');
        setState('error');
      }
    }
    void render(activeProvider);
    return () => {
      active = false;
    };
  }, [state, provider, masked, denied, visible]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
    };
  }, []);

  if (state === 'loading') {
    return (
      <div
        className="h-64 rounded-xl bg-slate-900 motion-safe:animate-pulse"
        aria-label="Đang tải bản đồ nghiệp vụ"
        role="status"
      />
    );
  }

  if (denied) {
    return (
      <AccessDenied message="Bản đồ nghiệp vụ không thuộc phạm vi của tài khoản hiện tại." />
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-4">
        <p
          className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5 text-sm text-rose-200"
          role="alert"
        >
          {error ?? 'Không thể tải bản đồ.'}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Workspace bản đồ">
      {!online ? (
        <p
          className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm text-amber-200"
          role="status"
        >
          Đang ngoại tuyến. Chỉ xem basemap đã lưu; mọi ghi dữ liệu bị chặn
          (MAP_OFFLINE_WRITE_BLOCKED).
        </p>
      ) : null}
      {masked ? (
        <p
          className="rounded-xl border border-slate-700 p-4 text-sm text-slate-400"
          role="status"
        >
          Chưa đăng nhập nên lớp nghiệp vụ bị che; basemap vẫn xem được.
        </p>
      ) : null}
      <fieldset className="flex flex-wrap gap-4 rounded-xl border border-slate-800 p-4 text-sm text-slate-300">
        <legend className="px-2 text-xs text-slate-500">Lớp dữ liệu</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showIncidents}
            onChange={(event) => setShowIncidents(event.target.checked)}
          />
          Vụ việc
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showInspections}
            onChange={(event) => setShowInspections(event.target.checked)}
          />
          Kiểm tra
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showAreas}
            onChange={(event) => setShowAreas(event.target.checked)}
          />
          Vùng polygon
        </label>
      </fieldset>
      <div
        ref={mapNode}
        data-testid="map-canvas"
        className="h-[420px] rounded-xl border border-slate-800 bg-slate-900"
        role="application"
        aria-label="Bản đồ nghiệp vụ"
      />
      <p className="text-xs text-slate-500">
        Nguồn nền:{' '}
        <a
          className="underline underline-offset-4 hover:text-white"
          href="https://www.openstreetmap.org/copyright"
        >
          {provider?.attribution || '© OpenStreetMap contributors'}
        </a>
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-200">
          ● Điểm GeoPoint
        </span>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-200">
          ▩ Vùng GeoArea
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1">
          {online ? 'Trực tuyến · realtime 30s' : 'Ngoại tuyến · basemap'}
        </span>
        {updatedAt ? <span>Cập nhật: {updatedAt}</span> : null}
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-cyan-300 hover:text-white"
        >
          Làm mới
        </button>
      </div>
      {!masked && !visible.length ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">
          Không có đối tượng nghiệp vụ trong viewport hiện tại.
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {online && !masked ? (
          <Link
            href="/intake"
            className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Ghi nhận tin báo
          </Link>
        ) : (
          <span
            className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm text-slate-500"
            title="Yêu cầu trực tuyến (MAP_OFFLINE_WRITE_BLOCKED)"
          >
            Ghi nhận cần trực tuyến
          </span>
        )}
        <Link
          href="/incidents"
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
        >
          Hàng đợi vụ việc
        </Link>
        <Link
          href="/inspections/establishments"
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-300 hover:text-white"
        >
          Cơ sở kiểm tra
        </Link>
      </div>
    </section>
  );
}
