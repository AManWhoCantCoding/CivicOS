'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { toMapAreaGeoJson } from '@/modules/platform/map';

import {
  focusApiUrl,
  focusBoundsCenter,
  focusParcelDetailUrl,
  focusScreenReaderLabel,
  LAND_PARCEL_FOCUS_FILL,
  LAND_PARCEL_FOCUS_LINE,
  LAND_PARCEL_FOCUS_SOURCE,
  mapFocusStatus,
  readFocusProjection,
  type FocusParcel,
  type FocusStatus,
} from './land-parcel-focus';

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

const ACTION_FOCUS_CLASS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';

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
// T-003: khi có initialParcelId thì thêm focused LandParcel layer riêng
// (route T-002), không gộp vào generic marker/projection endpoint.
export function MapWorkspace({
  initialParcelId = null,
}: {
  initialParcelId?: string | null;
}) {
  const focusParcelId =
    typeof initialParcelId === 'string' && initialParcelId.trim().length > 0
      ? initialParcelId.trim()
      : null;
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);
  const [provider, setProvider] = useState<MapProviderView | null>(null);
  const [markers, setMarkers] = useState<MapMarkerView[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [masked, setMasked] = useState(false);
  const [providerFailed, setProviderFailed] = useState(false);
  const [focusParcel, setFocusParcel] = useState<FocusParcel | null>(null);
  const [focusStatus, setFocusStatus] = useState<FocusStatus>(
    focusParcelId ? 'loading' : 'empty',
  );
  const [focusStale, setFocusStale] = useState(false);
  const [focusSelected, setFocusSelected] = useState(false);
  const focusHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const focusSeq = useRef(0);
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
    if (!window.navigator.onLine) {
      setError(null);
      setProviderFailed(false);
      setState('ready');
      return;
    }
    try {
      setProviderFailed(false);
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
      if (!window.navigator.onLine) {
        setError(null);
        setProviderFailed(false);
        setState('ready');
        return;
      }
      const providerDown =
        reason instanceof Error &&
        reason.message === 'MAP_PROVIDER_UNAVAILABLE';
      setProviderFailed(providerDown);
      setError(
        providerDown
          ? 'Không thể tải provider bản đồ.'
          : 'Không thể tải lớp dữ liệu bản đồ.',
      );
      setState('error');
    }
  }, []);

  // T-003: tải focused parcel từ route T-002 với cache no-store.
  // parcelId chỉ là navigation context; server kiểm tra lại policy.
  // Response cũ bị bỏ qua khi actor đổi focus nhanh (EC-LPM-11).
  const loadFocusParcel = useCallback(async (parcelId: string) => {
    const seq = (focusSeq.current += 1);
    setFocusStatus('loading');
    setFocusStale(false);
    setFocusSelected(false);
    setFocusParcel(null);
    if (!window.navigator.onLine) {
      setFocusStatus('offline');
      return;
    }
    try {
      const response = await fetch(focusApiUrl(parcelId), {
        cache: 'no-store',
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (focusSeq.current !== seq) return;
      if (!response.ok) {
        const code =
          isRecord(body) && typeof body.code === 'string' ? body.code : null;
        setFocusStatus(mapFocusStatus(response.status, code));
        return;
      }
      const projection = readFocusProjection(body);
      if (!projection) {
        setFocusStatus('geometry');
        return;
      }
      setFocusParcel(projection.parcel);
      setFocusStatus('ready');
    } catch {
      if (focusSeq.current !== seq) return;
      setFocusStatus(window.navigator.onLine ? 'error' : 'offline');
    }
  }, []);

  // T-004: revalidate nền — response mới hơn thì clear polygon cũ và
  // chuyển sang state stale yêu cầu reload (EC-LPM-08, DR-LPM-10).
  // Không giữ polygon cũ làm current; giữ no-store và sequence guard.
  const revalidateFocusParcel = useCallback(async () => {
    if (!focusParcelId || !focusParcel || focusStatus !== 'ready') return;
    if (!window.navigator.onLine) return;
    const seq = (focusSeq.current += 1);
    try {
      const response = await fetch(focusApiUrl(focusParcelId), {
        cache: 'no-store',
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (focusSeq.current !== seq) return;
      if (!response.ok) {
        const code =
          isRecord(body) && typeof body.code === 'string' ? body.code : null;
        setFocusParcel(null);
        setFocusSelected(false);
        setFocusStale(false);
        setFocusStatus(mapFocusStatus(response.status, code));
        return;
      }
      const projection = readFocusProjection(body);
      if (!projection) {
        setFocusParcel(null);
        setFocusSelected(false);
        setFocusStale(false);
        setFocusStatus('geometry');
        return;
      }
      if (projection.parcel.updatedAt !== focusParcel.updatedAt) {
        setFocusParcel(null);
        setFocusSelected(false);
        setFocusStale(true);
        setFocusStatus('stale');
      }
    } catch {
      if (focusSeq.current !== seq) return;
      setFocusParcel(null);
      setFocusSelected(false);
      setFocusStale(false);
      setFocusStatus(window.navigator.onLine ? 'error' : 'offline');
    }
  }, [focusParcelId, focusParcel, focusStatus]);

  // T-003: reset đồng bộ focus state; chỉ gọi từ timeout/handler,
  // theo pattern load() hiện hữu để tránh set-state-in-effect.
  const clearFocusParcel = useCallback((status: 'empty' | 'offline') => {
    focusSeq.current += 1;
    setFocusParcel(null);
    setFocusStale(false);
    setFocusSelected(false);
    setFocusStatus(status);
  }, []);

  const refresh = useCallback(() => {
    setState('loading');
    setError(null);
    setDenied(false);
    setMasked(false);
    setProviderFailed(false);
    void load();
    if (focusParcelId) void loadFocusParcel(focusParcelId);
  }, [load, focusParcelId, loadFocusParcel]);

  const retryFocus = useCallback(() => {
    if (focusParcelId) void loadFocusParcel(focusParcelId);
  }, [focusParcelId, loadFocusParcel]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // T-003: focused parcel projection — navigation context only,
  // server route T-002 quyết định quyền.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!focusParcelId) clearFocusParcel('empty');
      else void loadFocusParcel(focusParcelId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusParcelId, loadFocusParcel, clearFocusParcel]);

  // T-003: polygon chỉ online, không render polygon cache khi ngoại tuyến.
  useEffect(() => {
    if (!focusParcelId) return;
    const timer = window.setTimeout(() => {
      if (!window.navigator.onLine) {
        clearFocusParcel('offline');
      } else if (focusStatus === 'offline') {
        void loadFocusParcel(focusParcelId);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [online, focusParcelId, focusStatus, loadFocusParcel, clearFocusParcel]);

  useEffect(() => {
    if (!online) return;
    const timer = window.setInterval(() => {
      void load();
      void revalidateFocusParcel();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, online, revalidateFocusParcel]);

  useEffect(() => {
    if (!focusParcelId || focusStatus === 'ready') return;
    focusHeadingRef.current?.focus();
  }, [focusParcelId, focusStatus, state]);

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
        // T-004: focus đúng một parcel — zoom vào tâm bbox, giữ nguyên
        // mọi ring của Polygon (không flatten holes/multiple rings).
        // Không focus/zoom polygon khi loading/offline/error/stale.
        const focusCenter =
          focusParcelId &&
          focusParcel &&
          focusStatus === 'ready' &&
          !focusStale &&
          online
            ? focusBoundsCenter(focusParcel.geometry)
            : null;
        const map = new maplibregl.Map({
          container: node,
          style: providerConfig.styleUrl,
          center: focusCenter
            ? [focusCenter.longitude, focusCenter.latitude]
            : bounds.length === 4
              ? [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]
              : [0, 0],
          zoom: focusCenter ? 16 : 12,
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
          if (!active) return;
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
          // T-004: LandParcel GeoJSON layer riêng, id không đụng Incident/Inspection.
          // Không render polygon khi loading/offline/error/stale.
          if (
            focusParcelId &&
            focusParcel &&
            focusStatus === 'ready' &&
            !focusStale &&
            online
          ) {
            if (!map.getSource(LAND_PARCEL_FOCUS_SOURCE)) {
              map.addSource(LAND_PARCEL_FOCUS_SOURCE, {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: [
                    {
                      type: 'Feature',
                      properties: { id: focusParcel.id },
                      geometry: focusParcel.geometry,
                    },
                  ],
                },
              });
              map.addLayer({
                id: LAND_PARCEL_FOCUS_FILL,
                type: 'fill',
                source: LAND_PARCEL_FOCUS_SOURCE,
                paint: {
                  'fill-color': '#22d3ee',
                  'fill-opacity': focusSelected ? 0.4 : 0.25,
                },
              });
              map.addLayer({
                id: LAND_PARCEL_FOCUS_LINE,
                type: 'line',
                source: LAND_PARCEL_FOCUS_SOURCE,
                paint: {
                  'line-color': '#22d3ee',
                  'line-width': focusSelected ? 3 : 2,
                },
              });
            }
          }
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
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [
    state,
    provider,
    masked,
    denied,
    visible,
    focusParcelId,
    focusParcel,
    focusStatus,
    focusStale,
    focusSelected,
    online,
  ]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
    };
  }, []);

  if (state === 'loading') {
    if (focusParcelId) {
      return (
        <section className="space-y-4" aria-labelledby="map-loading-heading">
          <h2 id="map-loading-heading" className="sr-only">
            Đang tải dữ liệu thửa đất
          </h2>
          <div
            className="space-y-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Đang tải dữ liệu thửa đất"
          >
            <div className="h-64 rounded-xl bg-slate-900 motion-safe:animate-pulse" />
            <p className="text-sm text-slate-400">Đang tải dữ liệu thửa đất…</p>
          </div>
        </section>
      );
    }
    return (
      <section aria-labelledby="map-loading-heading">
        <h2 id="map-loading-heading" className="sr-only">
          Đang tải bản đồ nghiệp vụ
        </h2>
        <div
          className="h-64 rounded-xl bg-slate-900 motion-safe:animate-pulse"
          aria-label="Đang tải bản đồ nghiệp vụ"
          role="status"
          aria-live="polite"
          aria-busy="true"
        />
      </section>
    );
  }

  if (denied) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="map-denied-heading"
        role="alert"
        aria-live="assertive"
      >
        <h2 id="map-denied-heading" className="sr-only">
          Không có quyền truy cập bản đồ
        </h2>
        <AccessDenied message="Bản đồ nghiệp vụ không thuộc phạm vi của tài khoản hiện tại." />
      </section>
    );
  }

  if (state === 'error') {
    // T-003: provider lỗi trong focus flow — copy screen-05, không giả success.
    if (focusParcelId && providerFailed) {
      return (
        <section className="space-y-4" aria-labelledby="map-error-heading">
          <h2 id="map-error-heading" className="sr-only">
            Không thể tải bản đồ
          </h2>
          <div
            className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5"
            role="alert"
            aria-live="assertive"
          >
            <h3 className="text-base font-semibold text-rose-100">
              Bản đồ nền hiện không khả dụng
            </h3>
            <p className="mt-2 text-sm text-rose-200">
              Không thể kết nối map provider. Dữ liệu thửa đất chưa được xác
              nhận là đã hiển thị.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refresh}
              className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white`}
            >
              Thử lại
            </button>
            <Link
              href="/land/parcels"
              className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white`}
            >
              Quay lại danh sách thửa
            </Link>
          </div>
        </section>
      );
    }
    return (
      <section className="space-y-4" aria-labelledby="map-error-heading">
        <h2 id="map-error-heading" className="sr-only">
          Không thể tải bản đồ
        </h2>
        <p
          className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5 text-sm text-rose-200"
          role="alert"
          aria-live="assertive"
        >
          {error ?? 'Không thể tải bản đồ.'}
        </p>
        <button
          type="button"
          onClick={refresh}
          className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-300 hover:text-white`}
        >
          Thử tải lại
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="map-workspace-heading">
      <h2 id="map-workspace-heading" className="sr-only">
        Workspace bản đồ
      </h2>
      {!online ? (
        <p
          className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm text-amber-200"
          role="status"
          aria-live="polite"
        >
          Đang ngoại tuyến. Chỉ xem basemap đã lưu; mọi ghi dữ liệu bị chặn
          (MAP_OFFLINE_WRITE_BLOCKED).
        </p>
      ) : null}
      {masked ? (
        <p
          className="rounded-xl border border-slate-700 p-4 text-sm text-slate-400"
          role="status"
          aria-live="polite"
        >
          Chưa đăng nhập nên lớp nghiệp vụ bị che; basemap vẫn xem được.
        </p>
      ) : null}
      <fieldset className="flex flex-wrap gap-4 rounded-xl border border-slate-800 p-4 text-sm text-slate-300">
        <legend className="px-2 text-xs text-slate-500">Lớp dữ liệu</legend>
        <label className="flex min-h-[44px] items-center gap-2">
          <input
            type="checkbox"
            checked={showIncidents}
            onChange={(event) => setShowIncidents(event.target.checked)}
            className={ACTION_FOCUS_CLASS}
          />
          Vụ việc
        </label>
        <label className="flex min-h-[44px] items-center gap-2">
          <input
            type="checkbox"
            checked={showInspections}
            onChange={(event) => setShowInspections(event.target.checked)}
            className={ACTION_FOCUS_CLASS}
          />
          Kiểm tra
        </label>
        <label className="flex min-h-[44px] items-center gap-2">
          <input
            type="checkbox"
            checked={showAreas}
            onChange={(event) => setShowAreas(event.target.checked)}
            className={ACTION_FOCUS_CLASS}
          />
          Vùng polygon
        </label>
      </fieldset>
      {focusParcelId ? (
        <section
          aria-labelledby="land-parcel-focus-heading"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFocusSelected(false);
          }}
          className="rounded-xl border border-slate-800 bg-slate-950 p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="land-parcel-focus-heading"
              ref={focusHeadingRef}
              tabIndex={-1}
              className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300"
            >
              Thửa đất trên bản đồ
            </h2>
            <span className="rounded-full border border-slate-700 px-3 py-1 font-mono text-xs text-slate-300">
              internal / simulated
            </span>
          </div>
          {focusStatus === 'loading' || focusStatus === 'empty' ? (
            <div
              className="mt-3 space-y-2"
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Đang tải dữ liệu thửa đất"
            >
              <h3 className="sr-only">Đang tải dữ liệu thửa đất</h3>
              <div className="h-16 rounded-lg bg-slate-900 motion-safe:animate-pulse" />
              <p className="text-sm text-slate-400">
                Đang tải dữ liệu thửa đất…
              </p>
            </div>
          ) : null}
          {focusStatus === 'offline' ? (
            <div
              className="mt-3 space-y-3"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <h3 className="text-base font-semibold text-amber-100">
                Đang ngoại tuyến
              </h3>
              <p className="text-sm text-amber-200">
                Đang ngoại tuyến. Không tải polygon thửa đất khi ngoại tuyến.
              </p>
              <p className="text-sm text-amber-200">
                Polygon thửa đất không được lưu trong bộ nhớ offline.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Thử lại khi có kết nối
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'forbidden' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-slate-100">
                Không được phép xem thửa đất này
              </h3>
              <p className="text-sm text-slate-400">
                Bạn không có quyền xem nội dung này trong phạm vi hiện tại.
              </p>
              <Link
                href="/land/parcels"
                className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
              >
                Quay lại danh sách thửa
              </Link>
            </div>
          ) : null}
          {focusStatus === 'not-found' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-slate-100">
                Không tìm thấy thửa đất
              </h3>
              <p className="text-sm text-slate-400">
                Thửa đất không tồn tại hoặc không nằm trong phạm vi truy cập.
              </p>
              <Link
                href="/land/parcels"
                className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
              >
                Quay lại danh sách thửa
              </Link>
            </div>
          ) : null}
          {focusStatus === 'geometry' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-slate-100">
                Không thể hiển thị hình học thửa đất
              </h3>
              <p className="text-sm text-slate-400">
                Dữ liệu hình học hiện không sẵn sàng để hiển thị.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Thử lại
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'provider' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-slate-100">
                Bản đồ nền hiện không khả dụng
              </h3>
              <p className="text-sm text-slate-400">
                Không thể kết nối map provider. Dữ liệu thửa đất chưa được xác
                nhận là đã hiển thị.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Thử lại
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'error' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-slate-100">
                Không tải được dữ liệu thửa đất
              </h3>
              <p className="text-sm text-slate-400">
                Không thể tải lớp thửa đất. Thử lại.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Thử lại
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'stale' ? (
            <div
              className="mt-3 space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <h3 className="text-base font-semibold text-amber-100">
                Dữ liệu bản đồ có thể đã cũ.
              </h3>
              <p className="text-sm text-amber-200">
                Polygon cũ không được hiển thị cho đến khi dữ liệu thửa đất được
                tải lại.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  aria-label="Tải lại dữ liệu thửa đất"
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-amber-300/40 px-3 py-2 text-sm text-amber-100 hover:border-amber-200`}
                >
                  Tải lại dữ liệu
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'ready' && focusParcel ? (
            <div className="mt-3 space-y-3">
              <h3 className="font-mono text-2xl font-semibold text-slate-100">
                {focusParcel.parcelCode}
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Tờ</dt>
                  <dd className="font-mono text-slate-200">
                    {focusParcel.mapSheetNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Thửa</dt>
                  <dd className="font-mono text-slate-200">
                    {focusParcel.parcelNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Trạng thái</dt>
                  <dd className="text-slate-200">{focusParcel.status}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cập nhật</dt>
                  <dd className="font-mono text-slate-200">
                    {focusParcel.updatedAt}
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-slate-400">
                Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính
                thức.
              </p>
              <span id="land-parcel-focus-description" className="sr-only">
                {focusScreenReaderLabel(focusParcel)}
              </span>
              <div
                className="flex flex-wrap gap-3"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {focusSelected ? (
                  <>
                    <p className="w-full text-sm text-slate-300">
                      Đã chọn một thửa đất. Dữ liệu mô phỏng nội bộ; không phải
                      ranh giới pháp lý chính thức.
                    </p>
                    <Link
                      href={focusParcelDetailUrl(focusParcel.id)}
                      className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200`}
                      aria-describedby="land-parcel-focus-description"
                    >
                      Mở chi tiết thửa
                    </Link>
                    <button
                      type="button"
                      onClick={() => setFocusSelected(false)}
                      className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-300 hover:text-white`}
                    >
                      Bỏ chọn
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFocusSelected(true)}
                    aria-pressed={focusSelected}
                    aria-describedby="land-parcel-focus-description"
                    className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-300 hover:text-white`}
                  >
                    Chọn thửa đất trên bản đồ
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section
          className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400"
          aria-labelledby="land-parcel-empty-heading"
          role="status"
          aria-live="polite"
        >
          <h2
            id="land-parcel-empty-heading"
            className="text-base font-semibold text-slate-200"
          >
            Chưa chọn thửa đất
          </h2>
          <p className="mt-1">
            Hãy mở bản đồ từ một parcel trong phạm vi được phép.
          </p>
          <Link
            href="/land/parcels"
            className={`${ACTION_FOCUS_CLASS} mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500`}
          >
            Quay lại danh sách thửa
          </Link>
        </section>
      )}
      <div
        ref={mapNode}
        data-testid="map-canvas"
        className={`${ACTION_FOCUS_CLASS} h-[420px] rounded-xl border border-slate-800 bg-slate-900`}
        role="application"
        aria-label="Bản đồ nghiệp vụ"
        tabIndex={0}
      />
      <p className="text-xs text-slate-500">
        Nguồn nền:{' '}
        <a
          className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-white`}
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
          className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-cyan-300 hover:text-white`}
        >
          Làm mới
        </button>
      </div>
      {!masked && !visible.length ? (
        <section
          className="rounded-xl border border-dashed border-slate-700 p-8 text-sm text-slate-400"
          aria-labelledby="map-markers-empty-heading"
          role="status"
          aria-live="polite"
        >
          <h2 id="map-markers-empty-heading" className="sr-only">
            Không có đối tượng nghiệp vụ
          </h2>
          <p>Không có đối tượng nghiệp vụ trong viewport hiện tại.</p>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {online && !masked ? (
          <Link
            href="/intake"
            className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200`}
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
          className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-300 hover:text-white`}
        >
          Hàng đợi vụ việc
        </Link>
        <Link
          href="/inspections/establishments"
          className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-300 hover:text-white`}
        >
          Cơ sở kiểm tra
        </Link>
      </div>
    </section>
  );
}
