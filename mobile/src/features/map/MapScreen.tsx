import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  Text,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  OfflineManager,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import { ApiError } from '../../api/client';
import {
  getLandParcelMapProjection,
  isLandParcelFocusOffline,
  landParcelBoundsCenter,
  landParcelMapStateForError,
  type LandParcelMapErrorState,
  type LandParcelMapProjection,
} from '../../api/land-map';
import {
  getMapItems,
  getMapLayers,
  getMapProvider,
  type MapLayer,
  type MapProvider,
} from '../../api/map';
import {
  OfflineBanner,
  StateMessage,
  mobileBaseline,
} from '../../components/States';
import type { RelatedInfoItem } from '../related-info/types';
import { mapProviderProps } from './ProviderAdapter';

const viewCache: {
  layers: MapLayer[];
  provider: MapProvider | null;
  items: RelatedInfoItem[];
} = { layers: [], provider: null, items: [] };

type MapFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  {
    id: string;
    resourceId?: string;
    entityType: RelatedInfoItem['entityType'];
  }
>;

function featureFor(
  item: RelatedInfoItem,
  resourceId?: string,
): MapFeature | null {
  if (item.masked) return null;
  const geometry =
    item.geometry ??
    (item.lat !== undefined && item.lng !== undefined
      ? { type: 'Point', coordinates: [item.lng, item.lat] }
      : null);
  return geometry
    ? {
        type: 'Feature',
        properties: { id: item.id, resourceId, entityType: item.entityType },
        geometry: geometry as GeoJSON.Geometry,
      }
    : null;
}

export function MapScreen({
  focusItem,
  focusResourceId,
  focusCoordinates,
  focusParcelId,
  onOpenRelatedInfo,
  onOpenLandDetail,
}: {
  focusItem?: RelatedInfoItem;
  focusResourceId?: string;
  focusCoordinates?: { lat: number; lng: number };
  focusParcelId?: string;
  onOpenRelatedInfo?: (item: RelatedInfoItem) => void;
  onOpenLandDetail?: (parcelCode: string) => void;
}) {
  const [layers, setLayers] = useState(viewCache.layers);
  const [provider, setProvider] = useState<MapProvider | null>(
    viewCache.provider,
  );
  const [items, setItems] = useState(viewCache.items);
  const [error, setError] = useState<'error' | 'forbidden' | 'offline' | null>(
    null,
  );
  const [offline, setOffline] = useState(false);
  const [permission, setPermission] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [cacheReady, setCacheReady] = useState(false);
  const [landParcel, setLandParcel] = useState<LandParcelMapProjection | null>(
    null,
  );
  const [landState, setLandState] = useState<
    'idle' | 'loading' | 'ready' | LandParcelMapErrorState
  >('idle');
  const [landReload, setLandReload] = useState(0);
  const [landDismissed, setLandDismissed] = useState(false);

  // Focused LandParcel projection (P0): exactly one online Polygon, kept
  // separate from the generic RelatedInfo layers/items. Offline never calls
  // or renders the land polygon, even when a basemap pack exists. Stale
  // responses for a previous parcelId are dropped via the request ref.
  const landRequestRef = useRef(0);
  const loadLandParcel = useCallback(async () => {
    const requestId = landRequestRef.current + 1;
    landRequestRef.current = requestId;
    // Re-arm the focus on every (re)load: a parcelId change or an explicit
    // retry clears a previous local dismiss before the offline guard runs.
    setLandDismissed(false);
    if (!focusParcelId) {
      setLandParcel(null);
      setLandState('idle');
      return;
    }
    if (isLandParcelFocusOffline()) {
      setLandParcel(null);
      setLandState('offline');
      return;
    }
    setLandState('loading');
    setLandParcel(null);
    try {
      const projection = await getLandParcelMapProjection(focusParcelId);
      if (landRequestRef.current !== requestId) return;
      setLandParcel(projection);
      setLandState('ready');
    } catch (error: unknown) {
      if (landRequestRef.current !== requestId) return;
      setLandParcel(null);
      setLandState(landParcelMapStateForError(error));
    }
  }, [focusParcelId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadLandParcel(), 0);
    return () => {
      clearTimeout(timer);
      // EC-LPM-11: synchronously retire the previous focus request so a late
      // in-flight response can never commit parcel A under parcel B context
      // (or after unmount), even if it resolves before the next timer starts.
      landRequestRef.current += 1;
    };
  }, [loadLandParcel, landReload]);

  const reloadLandParcel = useCallback(() => {
    // Explicit retry only: clear the local dismiss flag and request a fresh
    // online projection via loadLandParcel (which still guards offline first,
    // so retry while offline never calls the route).
    setLandDismissed(false);
    setLandReload((count) => count + 1);
  }, []);

  // Local-only dismiss: hides the focused polygon/panel without any server
  // mutation. A focus change or explicit retry re-arms the focus.
  const dismissLandFocus = useCallback(() => {
    landRequestRef.current += 1;
    setLandParcel(null);
    setLandDismissed(true);
    setLandState('idle');
  }, []);

  // T-006 offline transition: when the device goes offline after a focused
  // projection is ready (or while it is in flight), immediately retire the
  // request, drop the polygon and move to the offline state so the LandParcel
  // GeoJSON source/layers disappear. Coming back online never restores
  // geometry silently; retry requests a fresh online projection instead.
  useEffect(() => {
    if (!focusParcelId) return;
    if (
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    )
      return;
    const handleOffline = () => {
      landRequestRef.current += 1;
      setLandParcel(null);
      setLandState((current) =>
        current === 'loading' || current === 'ready' ? 'offline' : current,
      );
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [focusParcelId]);

  const load = useCallback(async () => {
    setError(null);
    let packs: Array<{ metadata?: unknown }> = [];
    try {
      packs = (await OfflineManager.getPacks()) as Array<{
        metadata?: unknown;
      }>;
    } catch {
      packs = [];
    }
    const cachedStyle = packs
      .map((pack) => pack.metadata)
      .find(
        (metadata): metadata is { styleUrl?: string } =>
          typeof metadata === 'object' &&
          metadata !== null &&
          'styleUrl' in metadata,
      );
    setCacheReady(packs.length > 0);
    if (!viewCache.provider && cachedStyle?.styleUrl) {
      setProvider({
        id: 'cached',
        styleUrl: cachedStyle.styleUrl,
        attribution: 'OpenStreetMap',
      });
    }

    const results = await Promise.allSettled([
      getMapLayers(),
      getMapProvider(),
      getMapItems(),
    ]);
    const [layerResult, providerResult, itemResult] = results;
    if (layerResult.status === 'fulfilled') {
      viewCache.layers = layerResult.value.layers;
      setLayers(layerResult.value.layers);
      setVisible(
        Object.fromEntries(
          layerResult.value.layers.map((layer) => [
            layer.id,
            layer.visibleByDefault,
          ]),
        ),
      );
    }
    if (providerResult.status === 'fulfilled') {
      viewCache.provider = providerResult.value;
      setProvider(providerResult.value);
      setOffline(providerResult.value.offline ?? false);
    }
    if (itemResult.status === 'fulfilled') {
      viewCache.items = itemResult.value.data;
      setItems(itemResult.value.data);
    }

    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    const forbidden = failures.some(
      (result) =>
        result.reason instanceof ApiError && result.reason.status === 403,
    );
    if (forbidden) setError('forbidden');
    else if (failures.length) {
      setError('offline');
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    if (Platform.OS === 'android') {
      void PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then((result) =>
        setPermission(
          result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
        ),
      );
    }
    return () => clearTimeout(timer);
  }, [load]);

  if (!provider) {
    return (
      <StateMessage
        state={error ?? 'loading'}
        retry={error ? () => void load() : undefined}
      />
    );
  }

  const props = mapProviderProps({ ...provider, offline });
  const mapItems = [
    ...items,
    ...(focusItem && !items.some((item) => item.id === focusItem.id)
      ? [focusItem]
      : []),
  ];
  const features = mapItems
    .map((item) => featureFor(item, focusResourceId))
    .filter((feature): feature is MapFeature => feature !== null);
  const focusCenter =
    focusCoordinates ??
    (focusItem?.lat !== undefined && focusItem.lng !== undefined
      ? { lat: focusItem.lat, lng: focusItem.lng }
      : undefined);
  // Single focused parcel feature only; never merged into the generic items.
  // Dismissed focus renders no geometry even if a late response slipped past.
  const landFeature: GeoJSON.Feature<GeoJSON.Polygon, { id: string }> | null =
    landParcel && landState === 'ready' && !landDismissed
      ? {
          type: 'Feature',
          properties: { id: landParcel.parcel.id },
          geometry: landParcel.parcel.geometry,
        }
      : null;
  // While a land parcel focus is active the camera follows the focused
  // Polygon bbox and ignores stale generic coordinates.
  const landCenter =
    landParcel && landState === 'ready'
      ? landParcelBoundsCenter(landParcel.parcel.geometry)
      : null;
  const cameraCenter = focusParcelId
    ? landCenter
      ? { lat: landCenter.latitude, lng: landCenter.longitude }
      : undefined
    : focusCenter;

  return (
    <View style={{ flex: 1 }}>
      <MapLibreMap
        style={{ flex: 1 }}
        mapStyle={props.styleURL}
        attribution
        onPress={() => undefined}
      >
        {cameraCenter ? (
          <Camera
            initialViewState={{
              center: [cameraCenter.lng, cameraCenter.lat],
              zoom: 14,
            }}
          />
        ) : null}
        {layers.map((layer) => {
          const sourceId = `${layer.id}-source`;
          const data: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: features.filter((feature) =>
              layer.entityTypes.includes(feature.properties.entityType),
            ),
          };
          return (
            <GeoJSONSource
              key={sourceId}
              id={sourceId}
              data={data}
              onPress={(
                event: NativeSyntheticEvent<PressEventWithFeatures>,
              ) => {
                const id = event.nativeEvent.features[0]?.properties?.id;
                const item = mapItems.find((candidate) => candidate.id === id);
                if (item) onOpenRelatedInfo?.(item);
              }}
            >
              <Layer
                id={`${layer.id}-points`}
                type="circle"
                source={sourceId}
                filter={['==', '$type', 'Point']}
                layout={{ visibility: visible[layer.id] ? 'visible' : 'none' }}
                paint={{ 'circle-color': '#075985', 'circle-radius': 6 }}
              />
              <Layer
                id={`${layer.id}-areas`}
                type="fill"
                source={sourceId}
                filter={['==', '$type', 'Polygon']}
                layout={{ visibility: visible[layer.id] ? 'visible' : 'none' }}
                paint={{
                  'fill-color': mobileBaseline.color.mapFill,
                  'fill-opacity': 0.3,
                  'fill-outline-color': mobileBaseline.color.mapStroke,
                }}
              />
            </GeoJSONSource>
          );
        })}
        {landFeature ? (
          <GeoJSONSource
            id="land-parcel-focus-source"
            data={{ type: 'FeatureCollection', features: [landFeature] }}
          >
            <Layer
              id="land-parcel-focus-fill"
              type="fill"
              source="land-parcel-focus-source"
              paint={{
                'fill-color': mobileBaseline.color.mapFill,
                'fill-opacity': 0.3,
                'fill-outline-color': mobileBaseline.color.mapStroke,
              }}
            />
            <Layer
              id="land-parcel-focus-line"
              type="line"
              source="land-parcel-focus-source"
              paint={{
                'line-color': mobileBaseline.color.mapStroke,
                'line-width': 2,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </MapLibreMap>
      <View
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          gap: mobileBaseline.space.s2,
          backgroundColor: mobileBaseline.color.surface,
          borderColor: mobileBaseline.color.border,
          borderWidth: 1,
          borderRadius: mobileBaseline.radius.md,
          padding: mobileBaseline.space.s3,
        }}
      >
        <Text
          style={{
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.caption,
            color: mobileBaseline.color.textMuted,
          }}
        >
          OpenStreetMap
        </Text>
        {(offline || cacheReady) && <OfflineBanner />}
        {error === 'forbidden' && <StateMessage state="forbidden" />}
        {error === 'offline' && (
          <StateMessage state="offline" retry={() => void load()} />
        )}
        {permission === 'denied' && <StateMessage state="forbidden" />}
        {layers.length === 0 && <StateMessage state="empty" />}
        {!offline && !cacheReady ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tải basemap để xem ngoại tuyến"
            onPress={() =>
              void OfflineManager.createPack(
                {
                  mapStyle: provider.styleUrl,
                  minZoom: 10,
                  maxZoom: 16,
                  bounds: provider.bounds ?? [105.93, 20.91, 106.03, 20.99],
                  metadata: {
                    purpose: 'mobile-basemap',
                    styleUrl: provider.styleUrl,
                  },
                },
                () => undefined,
                () => undefined,
              ).then(() => setCacheReady(true))
            }
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: mobileBaseline.space.s2,
              justifyContent: 'center',
              borderColor: mobileBaseline.color.accent,
              borderWidth: 1,
              borderRadius: mobileBaseline.radius.sm,
              backgroundColor: mobileBaseline.color.accent,
            }}
          >
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                fontWeight: '600',
                textAlign: 'center',
                color: mobileBaseline.color.surface,
              }}
            >
              Tải basemap để xem ngoại tuyến
            </Text>
          </Pressable>
        ) : null}
        {layers.length > 0 && (
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              fontWeight: '600',
              color: mobileBaseline.color.textMuted,
            }}
          >
            Lớp bản đồ
          </Text>
        )}
        {layers.map((layer) => (
          <Pressable
            key={layer.id}
            accessibilityRole="button"
            accessibilityState={{ selected: visible[layer.id] === true }}
            onPress={() =>
              setVisible((current) => ({
                ...current,
                [layer.id]: !current[layer.id],
              }))
            }
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: mobileBaseline.space.s2,
              justifyContent: 'center',
              borderColor: visible[layer.id]
                ? mobileBaseline.color.accent
                : mobileBaseline.color.border,
              borderWidth: 1,
              borderRadius: mobileBaseline.radius.sm,
              backgroundColor: mobileBaseline.color.surface,
            }}
          >
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                fontWeight: visible[layer.id] ? '600' : '500',
                color: visible[layer.id]
                  ? mobileBaseline.color.accent
                  : mobileBaseline.color.text,
              }}
            >{`${visible[layer.id] ? 'Ẩn' : 'Hiện'} ${layer.label}`}</Text>
          </Pressable>
        ))}
      </View>
      {focusParcelId && landState !== 'idle' && !landDismissed ? (
        <View
          testID="land-parcel-focus-panel"
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            gap: mobileBaseline.space.s3,
            backgroundColor: mobileBaseline.color.surface,
            borderColor: mobileBaseline.color.border,
            borderWidth: 1,
            borderRadius: mobileBaseline.radius.lg,
            padding: mobileBaseline.space.s4,
          }}
        >
          {landState === 'loading' && (
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.body,
                lineHeight: mobileBaseline.size.bodyLine,
                color: mobileBaseline.color.textMuted,
              }}
            >
              Đang tải dữ liệu thửa đất…
            </Text>
          )}
          {landState === 'ready' && landParcel ? (
            <View style={{ gap: mobileBaseline.space.s2 }}>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.caption,
                  fontWeight: '600',
                  alignSelf: 'flex-start',
                  color: mobileBaseline.color.simulatedText,
                  backgroundColor: mobileBaseline.color.simulatedBg,
                  borderColor: mobileBaseline.color.simulatedText,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.sm,
                  paddingHorizontal: mobileBaseline.space.s2,
                  paddingVertical: mobileBaseline.space.s1,
                }}
              >
                internal / simulated
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.mono,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.text,
                }}
              >
                Mã thửa: {landParcel.parcel.parcelCode}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.mono,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.text,
                }}
              >
                Tờ/thửa: {landParcel.parcel.mapSheetNumber}/
                {landParcel.parcel.parcelNumber}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.text,
                }}
              >
                Trạng thái: {landParcel.parcel.status}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.mono,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.textMuted,
                  borderTopWidth: 1,
                  borderTopColor: mobileBaseline.color.border,
                  paddingTop: mobileBaseline.space.s2,
                }}
              >
                Cập nhật: {landParcel.parcel.updatedAt}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  lineHeight: mobileBaseline.size.bodyLine,
                  color: mobileBaseline.color.simulatedText,
                }}
              >
                Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính
                thức.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mở chi tiết thửa đất"
                onPress={() => onOpenLandDetail?.(landParcel.parcel.parcelCode)}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  padding: mobileBaseline.space.s2,
                  justifyContent: 'center',
                  borderColor: mobileBaseline.color.accent,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.sm,
                  backgroundColor: mobileBaseline.color.accent,
                }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    fontWeight: '600',
                    textAlign: 'center',
                    color: mobileBaseline.color.surface,
                  }}
                >
                  Mở chi tiết thửa
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tải lại dữ liệu"
                onPress={reloadLandParcel}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  padding: mobileBaseline.space.s2,
                  justifyContent: 'center',
                  borderColor: mobileBaseline.color.border,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.sm,
                  backgroundColor: mobileBaseline.color.surface,
                }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    textAlign: 'center',
                    color: mobileBaseline.color.text,
                  }}
                >
                  Tải lại dữ liệu
                </Text>
              </Pressable>
            </View>
          ) : null}
          {landState === 'forbidden' && (
            <View style={{ gap: mobileBaseline.space.s2 }}>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  fontWeight: '600',
                  color: mobileBaseline.color.text,
                }}
              >
                Không được phép xem thửa đất này
              </Text>
              <StateMessage state="forbidden" />
            </View>
          )}
          {landState === 'not-found' && (
            <View style={{ gap: mobileBaseline.space.s2 }}>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  fontWeight: '600',
                  color: mobileBaseline.color.text,
                }}
              >
                Không tìm thấy thửa đất
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  lineHeight: mobileBaseline.size.bodyLine,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                Thửa đất không tồn tại hoặc không nằm trong phạm vi truy cập.
              </Text>
            </View>
          )}
          {landState === 'geometry' && (
            <View style={{ gap: mobileBaseline.space.s2 }}>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  fontWeight: '600',
                  color: mobileBaseline.color.text,
                }}
              >
                Không thể hiển thị hình học thửa đất
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  lineHeight: mobileBaseline.size.bodyLine,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                Dữ liệu hình học hiện không sẵn sàng để hiển thị.
              </Text>
            </View>
          )}
          {landState === 'provider' && (
            <View style={{ gap: mobileBaseline.space.s2 }}>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  fontWeight: '600',
                  color: mobileBaseline.color.text,
                }}
              >
                Bản đồ nền hiện không khả dụng
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thử lại"
                onPress={reloadLandParcel}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  padding: mobileBaseline.space.s2,
                  justifyContent: 'center',
                  borderColor: mobileBaseline.color.border,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.sm,
                  backgroundColor: mobileBaseline.color.surface,
                }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    textAlign: 'center',
                    color: mobileBaseline.color.text,
                  }}
                >
                  Thử lại
                </Text>
              </Pressable>
            </View>
          )}
          {landState === 'offline' && (
            <View style={{ gap: mobileBaseline.space.s2 }}>
              <OfflineBanner />
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  lineHeight: mobileBaseline.size.bodyLine,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                Polygon thửa đất không được lưu trong bộ nhớ offline.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thử lại khi có kết nối"
                onPress={reloadLandParcel}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  padding: mobileBaseline.space.s2,
                  justifyContent: 'center',
                  borderColor: mobileBaseline.color.border,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.sm,
                  backgroundColor: mobileBaseline.color.surface,
                }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    textAlign: 'center',
                    color: mobileBaseline.color.text,
                  }}
                >
                  Thử lại khi có kết nối
                </Text>
              </Pressable>
            </View>
          )}
          {landState === 'error' && (
            <StateMessage state="error" retry={reloadLandParcel} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại bản đồ"
            onPress={dismissLandFocus}
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: mobileBaseline.space.s2,
              justifyContent: 'center',
              alignSelf: 'flex-start',
              borderColor: mobileBaseline.color.border,
              borderWidth: 1,
              borderRadius: mobileBaseline.radius.sm,
              backgroundColor: mobileBaseline.color.surface,
            }}
          >
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.text,
              }}
            >
              Quay lại bản đồ
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
