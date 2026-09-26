import React, { useCallback, useEffect, useState } from 'react';
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
  getMapItems,
  getMapLayers,
  getMapProvider,
  type MapLayer,
  type MapProvider,
} from '../../api/map';
import { OfflineBanner, StateMessage } from '../../components/States';
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
  onOpenRelatedInfo,
}: {
  focusItem?: RelatedInfoItem;
  focusResourceId?: string;
  focusCoordinates?: { lat: number; lng: number };
  onOpenRelatedInfo?: (item: RelatedInfoItem) => void;
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

  return (
    <View style={{ flex: 1 }}>
      <MapLibreMap
        style={{ flex: 1 }}
        mapStyle={props.styleURL}
        attribution
        onPress={() => undefined}
      >
        {focusCenter ? (
          <Camera
            initialViewState={{
              center: [focusCenter.lng, focusCenter.lat],
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
                paint={{ 'circle-color': '#14532d', 'circle-radius': 6 }}
              />
              <Layer
                id={`${layer.id}-areas`}
                type="fill"
                source={sourceId}
                filter={['==', '$type', 'Polygon']}
                layout={{ visibility: visible[layer.id] ? 'visible' : 'none' }}
                paint={{
                  'fill-color': '#2563eb',
                  'fill-opacity': 0.3,
                  'fill-outline-color': '#1d4ed8',
                }}
              />
            </GeoJSONSource>
          );
        })}
      </MapLibreMap>
      <View
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          gap: 8,
          backgroundColor: '#fff',
          padding: 12,
        }}
      >
        <Text>OpenStreetMap</Text>
        {(offline || cacheReady) && <OfflineBanner />}
        {error === 'forbidden' && <StateMessage state="forbidden" />}
        {error === 'offline' && (
          <StateMessage state="offline" retry={() => void load()} />
        )}
        {permission === 'denied' && <StateMessage state="forbidden" />}
        {layers.length === 0 && <StateMessage state="empty" />}
        {!offline && !cacheReady ? (
          <Pressable
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
            style={{ minHeight: 44 }}
          >
            <Text>Tải basemap để xem ngoại tuyến</Text>
          </Pressable>
        ) : null}
        {layers.map((layer) => (
          <Pressable
            key={layer.id}
            onPress={() =>
              setVisible((current) => ({
                ...current,
                [layer.id]: !current[layer.id],
              }))
            }
            style={{ minHeight: 44 }}
          >
            <Text>{`${visible[layer.id] ? 'Ẩn' : 'Hiện'} ${layer.label}`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
