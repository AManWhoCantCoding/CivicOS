'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { CADN_BOUNDS, toMapAreaGeoJson } from '@/modules/platform/map';

import {
  focusApiUrl,
  focusBoundsCenter,
  focusParcelDetailUrl,
  focusScreenReaderLabel,
  isFocusPolygonGeometry,
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
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--civicos-focus)]';

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

// T-008 P1 web-only scoped discovery (phase-05). Filter-first bounded query
// theo screen-14: idle cho đến khi có scalar filter hoặc bbox hợp lệ, AND
// exact identifiers, cursor opaque land:<id>, limit default 50. Mobile không
// dùng flow này và giữ P0 focused-single-parcel.
const DISCOVERY_API = '/api/map/land-parcels';
const DISCOVERY_SOURCE = 'land-parcel-discovery';
const DISCOVERY_FILL = 'land-parcel-discovery-fill';
const DISCOVERY_LINE = 'land-parcel-discovery-line';
const DISCOVERY_LIMIT = 50;
const DISCOVERY_STATUSES = ['proposed', 'active', 'retired'] as const;

type DiscoveryStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'invalid'
  | 'forbidden'
  | 'overflow'
  | 'provider'
  | 'offline'
  | 'stale'
  | 'error';

type DiscoveryFilters = {
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  communeCode: string;
  status: string;
};

type DiscoveryBox = {
  minLng: string;
  minLat: string;
  maxLng: string;
  maxLat: string;
};

const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {
  parcelCode: '',
  mapSheetNumber: '',
  parcelNumber: '',
  communeCode: '',
  status: '',
};

const EMPTY_DISCOVERY_BOX: DiscoveryBox = {
  minLng: '',
  minLat: '',
  maxLng: '',
  maxLat: '',
};

function trimFilters(filters: DiscoveryFilters): DiscoveryFilters {
  return {
    parcelCode: filters.parcelCode.trim(),
    mapSheetNumber: filters.mapSheetNumber.trim(),
    parcelNumber: filters.parcelNumber.trim(),
    communeCode: filters.communeCode.trim(),
    status: filters.status.trim(),
  };
}

// Client guard mirror của server contract: trim, yêu cầu ít nhất một scalar
// hoặc bbox đủ bốn số, bbox min<max trong CADN, không antimeridian. Idle khi
// chưa có gì để query; invalid khi input sai — không bao giờ fetch unbounded.
function buildDiscoverySearch(
  filters: DiscoveryFilters,
  box: DiscoveryBox,
  cursor: string | null,
): { idle: true } | { search: string } | { error: string } {
  const normalized = trimFilters(filters);
  const hasScalar = Object.values(normalized).some((value) => value.length > 0);
  if (
    normalized.status &&
    !(DISCOVERY_STATUSES as readonly string[]).includes(normalized.status)
  ) {
    return { error: 'Trạng thái tìm kiếm không hợp lệ.' };
  }
  const rawBox = [
    box.minLng.trim(),
    box.minLat.trim(),
    box.maxLng.trim(),
    box.maxLat.trim(),
  ];
  const present = rawBox.filter((value) => value.length > 0).length;
  if (!hasScalar && present === 0) return { idle: true };
  let bbox: string | null = null;
  if (present > 0) {
    if (present !== 4) {
      return {
        error: 'Vùng tìm kiếm chưa đủ bốn tọa độ; hãy nhập đủ min/max.',
      };
    }
    const numbers = rawBox.map(Number);
    if (numbers.some((value) => !Number.isFinite(value))) {
      return { error: 'Vùng tìm kiếm phải là số hữu hạn.' };
    }
    const [minLng, minLat, maxLng, maxLat] = numbers as [
      number,
      number,
      number,
      number,
    ];
    if (!(minLng < maxLng) || !(minLat < maxLat)) {
      return {
        error:
          'Vùng tìm kiếm không hợp lệ hoặc quá rộng. Hãy thu hẹp vùng bản đồ.',
      };
    }
    const [boundMinLng, boundMinLat, boundMaxLng, boundMaxLat] = CADN_BOUNDS;
    if (
      minLng < boundMinLng ||
      minLat < boundMinLat ||
      maxLng > boundMaxLng ||
      maxLat > boundMaxLat
    ) {
      return {
        error:
          'Vùng tìm kiếm không hợp lệ hoặc quá rộng. Hãy thu hẹp vùng bản đồ.',
      };
    }
    bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  }
  const params = new URLSearchParams();
  if (normalized.parcelCode) params.set('parcelCode', normalized.parcelCode);
  if (normalized.mapSheetNumber)
    params.set('mapSheetNumber', normalized.mapSheetNumber);
  if (normalized.parcelNumber)
    params.set('parcelNumber', normalized.parcelNumber);
  if (normalized.communeCode) params.set('communeCode', normalized.communeCode);
  if (normalized.status) params.set('status', normalized.status);
  if (bbox) params.set('bbox', bbox);
  params.set('limit', String(DISCOVERY_LIMIT));
  if (cursor) params.set('cursor', cursor);
  return { search: params.toString() };
}

// Đọc discovery page, chỉ giữ allowlist map đã lock; item sai shape thì cả
// page fail-closed, không render polygon bán hợp lệ.
function readDiscoveryItems(body: unknown): FocusParcel[] | null {
  if (!isRecord(body) || !Array.isArray(body.items)) return null;
  if (body.simulated !== true || body.projection !== 'land-parcel-map') {
    return null;
  }
  const items: FocusParcel[] = [];
  for (const entry of body.items) {
    if (!isRecord(entry)) return null;
    if (
      typeof entry.id !== 'string' ||
      typeof entry.parcelCode !== 'string' ||
      typeof entry.mapSheetNumber !== 'string' ||
      typeof entry.parcelNumber !== 'string' ||
      typeof entry.status !== 'string' ||
      typeof entry.updatedAt !== 'string'
    ) {
      return null;
    }
    if (!isFocusPolygonGeometry(entry.geometry)) return null;
    items.push({
      id: entry.id,
      parcelCode: entry.parcelCode,
      mapSheetNumber: entry.mapSheetNumber,
      parcelNumber: entry.parcelNumber,
      status: entry.status,
      geometry: entry.geometry,
      updatedAt: entry.updatedAt,
    });
  }
  return items;
}

function discoveryFingerprint(items: FocusParcel[]): string {
  return items.map((item) => `${item.id}:${item.updatedAt}`).join('|');
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
  // T-008 P1 discovery state — chỉ dùng khi không có focusParcelId (web-only).
  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFilters>(
    EMPTY_DISCOVERY_FILTERS,
  );
  const [discoveryBox, setDiscoveryBox] =
    useState<DiscoveryBox>(EMPTY_DISCOVERY_BOX);
  const [discoveryStatus, setDiscoveryStatus] =
    useState<DiscoveryStatus>('idle');
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [discoveryItems, setDiscoveryItems] = useState<FocusParcel[]>([]);
  const [discoveryCursor, setDiscoveryCursor] = useState<string | null>(null);
  const [discoveryNext, setDiscoveryNext] = useState<string | null>(null);
  const [discoveryHistory, setDiscoveryHistory] = useState<(string | null)[]>(
    [],
  );
  const [discoverySelectedId, setDiscoverySelectedId] = useState<string | null>(
    null,
  );
  const discoverySeq = useRef(0);
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

  // T-008: chạy một discovery page explicit; filter/bbox đổi thì caller reset
  // cursor trước. Response cũ bị bỏ qua khi query mới hơn đã gửi (EC-LPM-24).
  const runDiscovery = useCallback(
    async (cursor: string | null, history: (string | null)[]) => {
      const seq = (discoverySeq.current += 1);
      setDiscoveryStatus('loading');
      setDiscoveryMessage(null);
      setDiscoverySelectedId(null);
      setDiscoveryItems([]);
      if (!window.navigator.onLine) {
        setDiscoveryStatus('offline');
        return;
      }
      const built = buildDiscoverySearch(
        discoveryFilters,
        discoveryBox,
        cursor,
      );
      if ('idle' in built) {
        setDiscoveryStatus('idle');
        return;
      }
      if ('error' in built) {
        setDiscoveryStatus('invalid');
        setDiscoveryMessage(built.error);
        return;
      }
      try {
        const response = await fetch(`${DISCOVERY_API}?${built.search}`, {
          cache: 'no-store',
        });
        const body = (await response.json().catch(() => null)) as unknown;
        if (discoverySeq.current !== seq) return;
        if (!response.ok) {
          const code =
            isRecord(body) && typeof body.code === 'string' ? body.code : null;
          if (response.status === 401 || response.status === 403) {
            setDiscoveryStatus('forbidden');
            return;
          }
          if (response.status === 503 && code === 'MAP_PROVIDER_UNAVAILABLE') {
            setDiscoveryStatus('provider');
            return;
          }
          if (response.status === 503 && code === 'MAP_LAYER_FAILED') {
            setDiscoveryStatus('error');
            return;
          }
          if (response.status === 503) {
            setDiscoveryStatus('overflow');
            return;
          }
          if (response.status === 400 && cursor) {
            setDiscoveryStatus('invalid');
            setDiscoveryMessage(
              'Trang kết quả không còn phù hợp với bộ lọc hiện tại. Hãy tìm lại.',
            );
            setDiscoveryCursor(null);
            setDiscoveryNext(null);
            setDiscoveryHistory([]);
            return;
          }
          setDiscoveryStatus(response.status === 400 ? 'invalid' : 'error');
          setDiscoveryMessage(
            response.status === 400
              ? 'Vùng tìm kiếm không hợp lệ hoặc quá rộng. Hãy thu hẹp vùng bản đồ.'
              : null,
          );
          return;
        }
        const items = readDiscoveryItems(body);
        if (!items) {
          setDiscoveryStatus('error');
          return;
        }
        if (!items.length) {
          setDiscoveryStatus('empty');
          setDiscoveryCursor(cursor);
          setDiscoveryNext(null);
          setDiscoveryHistory(history);
          return;
        }
        setDiscoveryItems(items);
        setDiscoveryCursor(cursor);
        setDiscoveryNext(
          isRecord(body) && typeof body.nextCursor === 'string'
            ? body.nextCursor
            : null,
        );
        setDiscoveryHistory(history);
        setDiscoveryStatus('ready');
      } catch {
        if (discoverySeq.current !== seq) return;
        setDiscoveryStatus(window.navigator.onLine ? 'error' : 'offline');
      }
    },
    [discoveryFilters, discoveryBox],
  );

  // T-008: revalidate nền — fingerprint đổi thì clear polygon cũ và chuyển
  // stale yêu cầu reload explicit, không merge page cũ (DR-LPM-10).
  const revalidateDiscovery = useCallback(async () => {
    if (
      focusParcelId ||
      discoveryStatus !== 'ready' ||
      !discoveryItems.length
    ) {
      return;
    }
    if (!window.navigator.onLine) return;
    const built = buildDiscoverySearch(
      discoveryFilters,
      discoveryBox,
      discoveryCursor,
    );
    if (!('search' in built)) return;
    const before = discoveryFingerprint(discoveryItems);
    const seq = discoverySeq.current;
    try {
      const response = await fetch(`${DISCOVERY_API}?${built.search}`, {
        cache: 'no-store',
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (discoverySeq.current !== seq) return;
      if (!response.ok) return;
      const items = readDiscoveryItems(body);
      if (!items || discoveryFingerprint(items) === before) return;
      discoverySeq.current += 1;
      setDiscoveryItems([]);
      setDiscoverySelectedId(null);
      setDiscoveryStatus('stale');
    } catch {
      return;
    }
  }, [
    focusParcelId,
    discoveryStatus,
    discoveryItems,
    discoveryFilters,
    discoveryBox,
    discoveryCursor,
  ]);

  // T-008: mọi thay đổi filter/bbox reset cursor và idle, không auto-load
  // toàn unit và không trộn hai query.
  const resetDiscoveryPage = useCallback(() => {
    discoverySeq.current += 1;
    setDiscoveryCursor(null);
    setDiscoveryNext(null);
    setDiscoveryHistory([]);
    setDiscoverySelectedId(null);
    setDiscoveryItems([]);
    setDiscoveryStatus('idle');
    setDiscoveryMessage(null);
  }, []);

  const updateDiscoveryFilter = useCallback(
    (key: keyof DiscoveryFilters, value: string) => {
      setDiscoveryFilters((previous) => ({ ...previous, [key]: value }));
      resetDiscoveryPage();
    },
    [resetDiscoveryPage],
  );

  const updateDiscoveryBox = useCallback(
    (key: keyof DiscoveryBox, value: string) => {
      setDiscoveryBox((previous) => ({ ...previous, [key]: value }));
      resetDiscoveryPage();
    },
    [resetDiscoveryPage],
  );

  const resetDiscoveryFilters = useCallback(() => {
    setDiscoveryFilters(EMPTY_DISCOVERY_FILTERS);
    setDiscoveryBox(EMPTY_DISCOVERY_BOX);
    resetDiscoveryPage();
  }, [resetDiscoveryPage]);

  const reloadDiscovery = useCallback(() => {
    void runDiscovery(discoveryCursor, discoveryHistory);
  }, [runDiscovery, discoveryCursor, discoveryHistory]);

  const nextDiscoveryPage = useCallback(() => {
    if (!discoveryNext || discoveryStatus !== 'ready') return;
    void runDiscovery(discoveryNext, [...discoveryHistory, discoveryCursor]);
  }, [
    runDiscovery,
    discoveryNext,
    discoveryStatus,
    discoveryHistory,
    discoveryCursor,
  ]);

  const previousDiscoveryPage = useCallback(() => {
    if (!discoveryHistory.length || discoveryStatus !== 'ready') return;
    const previous = discoveryHistory[discoveryHistory.length - 1] ?? null;
    void runDiscovery(previous, discoveryHistory.slice(0, -1));
  }, [runDiscovery, discoveryHistory, discoveryStatus]);

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

  // T-008: discovery chỉ revalidate khi đang ready, online và không focus P0.
  useEffect(() => {
    if (focusParcelId || discoveryStatus !== 'ready' || !online) return;
    const timer = window.setInterval(() => {
      void revalidateDiscovery();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [focusParcelId, discoveryStatus, online, revalidateDiscovery]);

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
              'fill-color': '#38BDF8',
              'fill-opacity': 0.25,
            },
          });
          map.addLayer({
            id: 'map-areas-line',
            type: 'line',
            source: 'map-areas',
            paint: {
              'line-color': '#075985',
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
                  'fill-color': '#38BDF8',
                  'fill-opacity': focusSelected ? 0.4 : 0.25,
                },
              });
              map.addLayer({
                id: LAND_PARCEL_FOCUS_LINE,
                type: 'line',
                source: LAND_PARCEL_FOCUS_SOURCE,
                paint: {
                  'line-color': '#075985',
                  'line-width': focusSelected ? 3 : 2,
                },
              });
            }
          }
          // T-008: discovery polygons trên ids riêng, chỉ khi page ready,
          // online và không focus P0. Không render khi idle/loading/offline/
          // error/stale; selection qua result list accessible bên dưới.
          if (
            !focusParcelId &&
            discoveryStatus === 'ready' &&
            online &&
            discoveryItems.length > 0
          ) {
            if (!map.getSource(DISCOVERY_SOURCE)) {
              map.addSource(DISCOVERY_SOURCE, {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: discoveryItems.map((item) => ({
                    type: 'Feature',
                    properties: { id: item.id },
                    geometry: item.geometry,
                  })),
                },
              });
              map.addLayer({
                id: DISCOVERY_FILL,
                type: 'fill',
                source: DISCOVERY_SOURCE,
                paint: {
                  'fill-color': '#38BDF8',
                  'fill-opacity': 0.25,
                },
              });
              map.addLayer({
                id: DISCOVERY_LINE,
                type: 'line',
                source: DISCOVERY_SOURCE,
                paint: {
                  'line-color': '#075985',
                  'line-width': 2,
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
    discoveryStatus,
    discoveryItems,
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
            <div className="h-64 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
            <p className="text-sm text-[var(--civicos-text-muted)]">
              Đang tải dữ liệu thửa đất…
            </p>
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
          className="h-64 rounded-xl bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse"
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
            className="rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-5"
            role="alert"
            aria-live="assertive"
          >
            <h3 className="text-base font-semibold text-[var(--civicos-danger)]">
              Bản đồ nền hiện không khả dụng
            </h3>
            <p className="mt-2 text-sm text-[var(--civicos-danger)]">
              Không thể kết nối map provider. Dữ liệu thửa đất chưa được xác
              nhận là đã hiển thị.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refresh}
              className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
            >
              Thử lại
            </button>
            <Link
              href="/land/parcels"
              className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
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
          className="rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-5 text-sm text-[var(--civicos-danger)]"
          role="alert"
          aria-live="assertive"
        >
          {error ?? 'Không thể tải bản đồ.'}
        </p>
        <button
          type="button"
          onClick={refresh}
          className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
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
          className="rounded-xl border border-[var(--civicos-info)] bg-[var(--civicos-surface)] p-4 text-sm text-[var(--civicos-info)]"
          role="status"
          aria-live="polite"
        >
          Đang ngoại tuyến. Chỉ xem basemap đã lưu; mọi ghi dữ liệu bị chặn
          (MAP_OFFLINE_WRITE_BLOCKED).
        </p>
      ) : null}
      {masked ? (
        <p
          className="rounded-xl border border-[var(--civicos-border)] p-4 text-sm text-[var(--civicos-text-muted)]"
          role="status"
          aria-live="polite"
        >
          Chưa đăng nhập nên lớp nghiệp vụ bị che; basemap vẫn xem được.
        </p>
      ) : null}
      <fieldset className="flex flex-wrap gap-4 rounded-xl border border-[var(--civicos-border)] p-4 text-sm text-[var(--civicos-text)]">
        <legend className="px-2 text-xs text-[var(--civicos-text-muted)]">
          Lớp dữ liệu
        </legend>
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
          className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="land-parcel-focus-heading"
              ref={focusHeadingRef}
              tabIndex={-1}
              className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase focus:outline-2 focus:outline-offset-2 focus:outline-[var(--civicos-focus)]"
            >
              Thửa đất trên bản đồ
            </h2>
            <span className="rounded-full border border-[var(--civicos-simulated-text)] bg-[var(--civicos-simulated-bg)] px-3 py-1 font-mono text-xs text-[var(--civicos-simulated-text)]">
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
              <div className="h-16 rounded-lg bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
              <p className="text-sm text-[var(--civicos-text-muted)]">
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
              <h3 className="text-base font-semibold text-[var(--civicos-info)]">
                Đang ngoại tuyến
              </h3>
              <p className="text-sm text-[var(--civicos-info)]">
                Đang ngoại tuyến. Không tải polygon thửa đất khi ngoại tuyến.
              </p>
              <p className="text-sm text-[var(--civicos-info)]">
                Polygon thửa đất không được lưu trong bộ nhớ offline.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Thử lại khi có kết nối
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'forbidden' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-[var(--civicos-text)]">
                Không được phép xem thửa đất này
              </h3>
              <p className="text-sm text-[var(--civicos-text-muted)]">
                Bạn không có quyền xem nội dung này trong phạm vi hiện tại.
              </p>
              <Link
                href="/land/parcels"
                className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
              >
                Quay lại danh sách thửa
              </Link>
            </div>
          ) : null}
          {focusStatus === 'not-found' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-[var(--civicos-text)]">
                Không tìm thấy thửa đất
              </h3>
              <p className="text-sm text-[var(--civicos-text-muted)]">
                Thửa đất không tồn tại hoặc không nằm trong phạm vi truy cập.
              </p>
              <Link
                href="/land/parcels"
                className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
              >
                Quay lại danh sách thửa
              </Link>
            </div>
          ) : null}
          {focusStatus === 'geometry' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-[var(--civicos-text)]">
                Không thể hiển thị hình học thửa đất
              </h3>
              <p className="text-sm text-[var(--civicos-text-muted)]">
                Dữ liệu hình học hiện không sẵn sàng để hiển thị.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Thử lại
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'provider' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-[var(--civicos-text)]">
                Bản đồ nền hiện không khả dụng
              </h3>
              <p className="text-sm text-[var(--civicos-text-muted)]">
                Không thể kết nối map provider. Dữ liệu thửa đất chưa được xác
                nhận là đã hiển thị.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Thử lại
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'error' ? (
            <div className="mt-3 space-y-3" role="alert" aria-live="assertive">
              <h3 className="text-base font-semibold text-[var(--civicos-text)]">
                Không tải được dữ liệu thửa đất
              </h3>
              <p className="text-sm text-[var(--civicos-text-muted)]">
                Không thể tải lớp thửa đất. Thử lại.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Thử lại
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'stale' ? (
            <div
              className="mt-3 space-y-3 rounded-xl border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] p-4"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <h3 className="text-base font-semibold text-[var(--civicos-warning)]">
                Dữ liệu bản đồ có thể đã cũ.
              </h3>
              <p className="text-sm text-[var(--civicos-warning)]">
                Polygon cũ không được hiển thị cho đến khi dữ liệu thửa đất được
                tải lại.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFocus}
                  aria-label="Tải lại dữ liệu thửa đất"
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-warning)] px-3 py-2 text-sm text-[var(--civicos-warning)] hover:border-[var(--civicos-warning)]`}
                >
                  Tải lại dữ liệu
                </button>
                <Link
                  href="/land/parcels"
                  className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Quay lại danh sách thửa
                </Link>
              </div>
            </div>
          ) : null}
          {focusStatus === 'ready' && focusParcel ? (
            <div className="mt-3 space-y-3">
              <h3 className="font-mono text-2xl font-semibold text-[var(--civicos-text)]">
                {focusParcel.parcelCode}
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--civicos-text-muted)]">Tờ</dt>
                  <dd className="font-mono text-[var(--civicos-text)]">
                    {focusParcel.mapSheetNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--civicos-text-muted)]">Thửa</dt>
                  <dd className="font-mono text-[var(--civicos-text)]">
                    {focusParcel.parcelNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--civicos-text-muted)]">
                    Trạng thái
                  </dt>
                  <dd className="text-[var(--civicos-text)]">
                    {focusParcel.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--civicos-text-muted)]">Cập nhật</dt>
                  <dd className="font-mono text-[var(--civicos-text)]">
                    {focusParcel.updatedAt}
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-[var(--civicos-text-muted)]">
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
                    <p className="w-full text-sm text-[var(--civicos-text)]">
                      Đã chọn một thửa đất. Dữ liệu mô phỏng nội bộ; không phải
                      ranh giới pháp lý chính thức.
                    </p>
                    <Link
                      href={focusParcelDetailUrl(focusParcel.id)}
                      className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]`}
                      aria-describedby="land-parcel-focus-description"
                    >
                      Mở chi tiết thửa
                    </Link>
                    <button
                      type="button"
                      onClick={() => setFocusSelected(false)}
                      className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
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
                    className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
                  >
                    Chọn thửa đất trên bản đồ
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section
            aria-labelledby="land-parcel-discovery-heading"
            className="rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)] p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="land-parcel-discovery-heading"
                className="font-mono text-xs tracking-[0.16em] text-[var(--civicos-accent)] uppercase"
              >
                Khám phá thửa đất trong phạm vi
              </h2>
              <span className="rounded-full border border-[var(--civicos-simulated-text)] bg-[var(--civicos-simulated-bg)] px-3 py-1 font-mono text-xs text-[var(--civicos-simulated-text)]">
                internal / simulated
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--civicos-text-muted)]">
              Nhập ít nhất một bộ lọc hoặc thu hẹp vùng bản đồ trước khi tìm.
            </p>
            <form
              className="mt-3 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void runDiscovery(null, []);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
                  htmlFor="discovery-parcel-code"
                >
                  Mã thửa
                  <input
                    id="discovery-parcel-code"
                    type="text"
                    autoComplete="off"
                    value={discoveryFilters.parcelCode}
                    onChange={(event) =>
                      updateDiscoveryFilter('parcelCode', event.target.value)
                    }
                    className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                  />
                </label>
                <label
                  className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
                  htmlFor="discovery-map-sheet"
                >
                  Tờ bản đồ
                  <input
                    id="discovery-map-sheet"
                    type="text"
                    autoComplete="off"
                    value={discoveryFilters.mapSheetNumber}
                    onChange={(event) =>
                      updateDiscoveryFilter(
                        'mapSheetNumber',
                        event.target.value,
                      )
                    }
                    className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                  />
                </label>
                <label
                  className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
                  htmlFor="discovery-parcel-number"
                >
                  Số thửa
                  <input
                    id="discovery-parcel-number"
                    type="text"
                    autoComplete="off"
                    value={discoveryFilters.parcelNumber}
                    onChange={(event) =>
                      updateDiscoveryFilter('parcelNumber', event.target.value)
                    }
                    className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                  />
                </label>
                <label
                  className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
                  htmlFor="discovery-commune-code"
                >
                  Mã xã
                  <input
                    id="discovery-commune-code"
                    type="text"
                    autoComplete="off"
                    value={discoveryFilters.communeCode}
                    onChange={(event) =>
                      updateDiscoveryFilter('communeCode', event.target.value)
                    }
                    className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                  />
                </label>
                <label
                  className="flex min-h-[44px] flex-col gap-1 text-sm text-[var(--civicos-text)]"
                  htmlFor="discovery-status"
                >
                  Trạng thái
                  <select
                    id="discovery-status"
                    value={discoveryFilters.status}
                    onChange={(event) =>
                      updateDiscoveryFilter('status', event.target.value)
                    }
                    className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 text-sm text-[var(--civicos-text)]`}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="proposed">proposed</option>
                    <option value="active">active</option>
                    <option value="retired">retired</option>
                  </select>
                </label>
              </div>
              <fieldset className="rounded-xl border border-[var(--civicos-border)] p-3">
                <legend className="px-2 text-xs text-[var(--civicos-text-muted)]">
                  Viewport / bbox (WGS84)
                </legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label
                    className="flex min-h-[44px] flex-col gap-1 font-mono text-xs text-[var(--civicos-text-muted)]"
                    htmlFor="discovery-min-lng"
                  >
                    minLng
                    <input
                      id="discovery-min-lng"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="105.93"
                      value={discoveryBox.minLng}
                      onChange={(event) =>
                        updateDiscoveryBox('minLng', event.target.value)
                      }
                      className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                    />
                  </label>
                  <label
                    className="flex min-h-[44px] flex-col gap-1 font-mono text-xs text-[var(--civicos-text-muted)]"
                    htmlFor="discovery-min-lat"
                  >
                    minLat
                    <input
                      id="discovery-min-lat"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="20.91"
                      value={discoveryBox.minLat}
                      onChange={(event) =>
                        updateDiscoveryBox('minLat', event.target.value)
                      }
                      className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                    />
                  </label>
                  <label
                    className="flex min-h-[44px] flex-col gap-1 font-mono text-xs text-[var(--civicos-text-muted)]"
                    htmlFor="discovery-max-lng"
                  >
                    maxLng
                    <input
                      id="discovery-max-lng"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="106.03"
                      value={discoveryBox.maxLng}
                      onChange={(event) =>
                        updateDiscoveryBox('maxLng', event.target.value)
                      }
                      className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                    />
                  </label>
                  <label
                    className="flex min-h-[44px] flex-col gap-1 font-mono text-xs text-[var(--civicos-text-muted)]"
                    htmlFor="discovery-max-lat"
                  >
                    maxLat
                    <input
                      id="discovery-max-lat"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="20.99"
                      value={discoveryBox.maxLat}
                      onChange={(event) =>
                        updateDiscoveryBox('maxLat', event.target.value)
                      }
                      className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] bg-[var(--civicos-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--civicos-text)]`}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-[var(--civicos-text-muted)]">
                  Giới hạn CADN: 105.93, 20.91, 106.03, 20.99 · không
                  antimeridian.
                </p>
              </fieldset>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]`}
                >
                  Tìm thửa đất
                </button>
                <button
                  type="button"
                  onClick={resetDiscoveryFilters}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
                >
                  Đặt lại
                </button>
              </div>
            </form>
            {discoveryStatus === 'loading' ? (
              <div
                className="mt-3 space-y-2"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label="Đang tải kết quả thửa đất"
              >
                <div className="h-16 rounded-lg bg-[var(--civicos-surface-muted)] motion-safe:animate-pulse" />
                <p className="text-sm text-[var(--civicos-text-muted)]">
                  Đang tải kết quả thửa đất…
                </p>
              </div>
            ) : null}
            {discoveryStatus === 'empty' ? (
              <p
                className="mt-3 rounded-xl border border-[var(--civicos-border)] p-4 text-sm text-[var(--civicos-text)]"
                role="status"
                aria-live="polite"
              >
                Không tìm thấy thửa đất trong phạm vi/bộ lọc này.
              </p>
            ) : null}
            {discoveryStatus === 'invalid' ? (
              <p
                className="mt-3 rounded-xl border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] p-4 text-sm text-[var(--civicos-warning)]"
                role="alert"
                aria-live="assertive"
              >
                {discoveryMessage ??
                  'Vùng tìm kiếm không hợp lệ hoặc quá rộng. Hãy thu hẹp vùng bản đồ.'}
              </p>
            ) : null}
            {discoveryStatus === 'forbidden' ? (
              <p
                className="mt-3 rounded-xl border border-[var(--civicos-border)] p-4 text-sm text-[var(--civicos-text)]"
                role="alert"
                aria-live="assertive"
              >
                Bạn không có quyền xem nội dung này trong phạm vi hiện tại.
              </p>
            ) : null}
            {discoveryStatus === 'overflow' ? (
              <div
                className="mt-3 space-y-3 rounded-xl border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] p-4"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-[var(--civicos-warning)]">
                  Kết quả quá lớn để hiển thị an toàn. Hãy thu hẹp bộ lọc.
                </p>
                <button
                  type="button"
                  onClick={reloadDiscovery}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-warning)] px-3 py-2 text-sm text-[var(--civicos-warning)] hover:border-[var(--civicos-warning)]`}
                >
                  Thử lại
                </button>
              </div>
            ) : null}
            {discoveryStatus === 'provider' ? (
              <div
                className="mt-3 space-y-3 rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-4"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-[var(--civicos-danger)]">
                  Bản đồ nền hiện không khả dụng. Dữ liệu thửa đất chưa được xác
                  nhận là đã hiển thị.
                </p>
                <button
                  type="button"
                  onClick={reloadDiscovery}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Thử lại
                </button>
              </div>
            ) : null}
            {discoveryStatus === 'offline' ? (
              <div
                className="mt-3 space-y-2 rounded-xl border border-[var(--civicos-info)] bg-[var(--civicos-surface)] p-4"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-sm text-[var(--civicos-info)]">
                  Đang ngoại tuyến.
                </p>
                <p className="text-sm text-[var(--civicos-info)]">
                  Polygon thửa đất không được lưu trong bộ nhớ offline.
                </p>
              </div>
            ) : null}
            {discoveryStatus === 'error' ? (
              <div
                className="mt-3 space-y-3 rounded-xl border border-[var(--civicos-danger)] bg-[var(--civicos-surface)] p-4"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-[var(--civicos-danger)]">
                  Không thể tải lớp thửa đất. Thử lại.
                </p>
                <button
                  type="button"
                  onClick={reloadDiscovery}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
                >
                  Thử lại
                </button>
              </div>
            ) : null}
            {discoveryStatus === 'stale' ? (
              <div
                className="mt-3 space-y-3 rounded-xl border border-[var(--civicos-warning)] bg-[var(--civicos-surface)] p-4"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-sm text-[var(--civicos-warning)]">
                  Dữ liệu bản đồ có thể đã cũ.
                </p>
                <p className="text-sm text-[var(--civicos-warning)]">
                  Polygon cũ không được hiển thị cho đến khi dữ liệu thửa đất
                  được tải lại.
                </p>
                <button
                  type="button"
                  onClick={reloadDiscovery}
                  aria-label="Tải lại dữ liệu thửa đất"
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-warning)] px-3 py-2 text-sm text-[var(--civicos-warning)] hover:border-[var(--civicos-warning)]`}
                >
                  Tải lại dữ liệu
                </button>
              </div>
            ) : null}
            {discoveryStatus === 'ready' ? (
              <p className="sr-only" role="status" aria-live="polite">
                {discoveryItems.length} thửa đất trong phạm vi.
              </p>
            ) : null}
            {(discoveryStatus === 'ready' ||
              (discoveryStatus === 'stale' && discoveryItems.length > 0)) &&
            discoveryItems.length > 0 ? (
              <ul className="mt-3 space-y-2" aria-label="Kết quả thửa đất">
                {discoveryItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setDiscoverySelectedId(item.id)}
                      aria-pressed={discoverySelectedId === item.id}
                      aria-describedby={`discovery-desc-${item.id}`}
                      className={`${ACTION_FOCUS_CLASS} flex min-h-[44px] w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left text-sm ${
                        discoverySelectedId === item.id
                          ? 'border-[var(--civicos-accent)] bg-[var(--civicos-surface)] text-[var(--civicos-text)]'
                          : 'border-[var(--civicos-border)] text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]'
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">
                          {item.parcelCode}
                        </span>
                        <span className="rounded-full border border-[var(--civicos-border)] px-2 py-0.5 font-mono text-xs">
                          {item.status}
                        </span>
                      </span>
                      <span className="text-[var(--civicos-text-muted)]">
                        Tờ {item.mapSheetNumber} · Thửa {item.parcelNumber}
                      </span>
                      <span className="font-mono text-xs text-[var(--civicos-text-muted)]">
                        Cập nhật {item.updatedAt}
                      </span>
                      <span
                        id={`discovery-desc-${item.id}`}
                        className="sr-only"
                      >
                        {focusScreenReaderLabel(item)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {discoveryStatus === 'ready' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={previousDiscoveryPage}
                  disabled={discoveryHistory.length === 0}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  onClick={nextDiscoveryPage}
                  disabled={!discoveryNext}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Trang tiếp
                </button>
                <button
                  type="button"
                  onClick={() => void runDiscovery(null, [])}
                  className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text-muted)] hover:border-[var(--civicos-accent)]`}
                >
                  Reset cursor
                </button>
              </div>
            ) : null}
            {discoveryStatus === 'ready' &&
            discoveryItems.find((item) => item.id === discoverySelectedId) ? (
              <div className="mt-3 space-y-2 rounded-xl border border-[var(--civicos-accent)] bg-[var(--civicos-surface)] p-4">
                {(() => {
                  const selected = discoveryItems.find(
                    (item) => item.id === discoverySelectedId,
                  );
                  if (!selected) return null;
                  return (
                    <>
                      <p className="font-mono text-lg font-semibold text-[var(--civicos-text)]">
                        {selected.parcelCode}
                      </p>
                      <p className="text-sm text-[var(--civicos-text)]">
                        Tờ {selected.mapSheetNumber} · Thửa{' '}
                        {selected.parcelNumber} · {selected.status}
                      </p>
                      <p className="text-sm text-[var(--civicos-text-muted)]">
                        <strong>internal / simulated</strong> · Dữ liệu mô phỏng
                        nội bộ; không phải ranh giới pháp lý chính thức.
                      </p>
                      <Link
                        href={focusParcelDetailUrl(selected.id)}
                        className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]`}
                      >
                        Mở chi tiết thửa
                      </Link>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </section>
          <section
            className="rounded-xl border border-dashed border-[var(--civicos-border)] p-6 text-sm text-[var(--civicos-text-muted)]"
            aria-labelledby="land-parcel-empty-heading"
            role="status"
            aria-live="polite"
          >
            <h2
              id="land-parcel-empty-heading"
              className="text-base font-semibold text-[var(--civicos-text)]"
            >
              Chưa chọn thửa đất
            </h2>
            <p className="mt-1">
              Hãy mở bản đồ từ một parcel trong phạm vi được phép.
            </p>
            <Link
              href="/land/parcels"
              className={`${ACTION_FOCUS_CLASS} mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-3 py-2 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)]`}
            >
              Quay lại danh sách thửa
            </Link>
          </section>
        </>
      )}
      <div
        ref={mapNode}
        data-testid="map-canvas"
        className={`${ACTION_FOCUS_CLASS} h-[420px] rounded-xl border border-[var(--civicos-border)] bg-[var(--civicos-surface)]`}
        role="application"
        aria-label="Bản đồ nghiệp vụ"
        tabIndex={0}
      />
      <p className="text-xs text-[var(--civicos-text-muted)]">
        Nguồn nền:{' '}
        <a
          className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-[var(--civicos-accent)]`}
          href="https://www.openstreetmap.org/copyright"
        >
          {provider?.attribution || '© OpenStreetMap contributors'}
        </a>
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--civicos-text-muted)]">
        <span className="rounded-full border border-[var(--civicos-accent)] bg-[var(--civicos-surface)] px-3 py-1 text-[var(--civicos-accent)]">
          ● Điểm GeoPoint
        </span>
        <span className="rounded-full border border-[var(--civicos-success)] bg-[var(--civicos-surface)] px-3 py-1 text-[var(--civicos-success)]">
          ▩ Vùng GeoArea
        </span>
        <span className="rounded-full bg-[var(--civicos-surface-muted)] px-3 py-1">
          {online ? 'Trực tuyến · realtime 30s' : 'Ngoại tuyến · basemap'}
        </span>
        {updatedAt ? <span>Cập nhật: {updatedAt}</span> : null}
        <button
          type="button"
          onClick={refresh}
          className={`${ACTION_FOCUS_CLASS} min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-3 py-1.5 text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
        >
          Làm mới
        </button>
      </div>
      {!masked && !visible.length ? (
        <section
          className="rounded-xl border border-dashed border-[var(--civicos-border)] p-8 text-sm text-[var(--civicos-text-muted)]"
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
            className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg bg-[var(--civicos-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--civicos-accent-contrast)] hover:bg-[var(--civicos-accent-hover)]`}
          >
            Ghi nhận tin báo
          </Link>
        ) : (
          <span
            className="min-h-[44px] rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm text-[var(--civicos-text-muted)]"
            title="Yêu cầu trực tuyến (MAP_OFFLINE_WRITE_BLOCKED)"
          >
            Ghi nhận cần trực tuyến
          </span>
        )}
        <Link
          href="/incidents"
          className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
        >
          Hàng đợi vụ việc
        </Link>
        <Link
          href="/inspections/establishments"
          className={`${ACTION_FOCUS_CLASS} inline-flex min-h-[44px] items-center rounded-lg border border-[var(--civicos-border)] px-4 py-2.5 text-sm text-[var(--civicos-text)] hover:border-[var(--civicos-accent)] hover:text-[var(--civicos-accent)]`}
        >
          Cơ sở kiểm tra
        </Link>
      </div>
    </section>
  );
}
