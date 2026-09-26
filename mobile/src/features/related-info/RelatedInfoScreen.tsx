import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../../api/client';
import { countRelatedInfo, searchRelatedInfo } from '../../api/relatedInfo';
import { MaskedValue, StateMessage } from '../../components/States';
import { RelatedInfoDetail } from './RelatedInfoDetail';
import type {
  RelatedInfoEntityType,
  RelatedInfoItem,
  RelatedInfoReference,
} from './types';

type ListState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'masked' | 'offline' | 'ready';
const entityTypes: Array<RelatedInfoEntityType | undefined> = [
  undefined,
  'RESIDENT',
  'BUSINESS',
  'HOTSPOT',
  'VIOLATION',
];

export function RelatedInfoScreen({
  onOpenMap,
  initialReference,
}: {
  onOpenMap?: (item: RelatedInfoItem) => void;
  initialReference?: RelatedInfoReference;
}) {
  const [q, setQ] = useState('');
  const [entityType, setEntityType] = useState<RelatedInfoEntityType>();
  const [items, setItems] = useState<RelatedInfoItem[]>([]);
  const [selected, setSelected] = useState<RelatedInfoReference | null>(
    initialReference ?? null,
  );
  const [mapItem, setMapItem] = useState<RelatedInfoItem | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [state, setState] = useState<ListState>('loading');
  const load = async (nextPage = 1) => {
    try {
      setState('loading');
      const query = {
        q,
        entityType,
        status: status || undefined,
        page: nextPage,
        pageSize: 20,
      };
      const [response, countResponse] = await Promise.all([
        searchRelatedInfo(query),
        countRelatedInfo({ q, entityType, status: status || undefined }),
      ]);
      setItems(
        nextPage === 1
          ? response.data
          : (current) => [...current, ...response.data],
      );
      setPage(response.page);
      setHasMore(
        response.data.length > 0 &&
          response.page * response.pageSize < response.total,
      );
      setCounts(countResponse);
      setState(
        nextPage === 1 && response.data.length === 0
          ? 'empty'
          : response.data.some((item) => item.masked)
            ? 'masked'
            : 'ready',
      );
    } catch (reason: unknown) {
      setState(
        reason instanceof ApiError && reason.status === 403
          ? 'forbidden'
          : reason instanceof ApiError && reason.code === 'OFFLINE'
            ? 'offline'
            : 'error',
      );
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [q, entityType, status]);
  if (selected)
    return (
      <RelatedInfoDetail
        item={selected}
        onBack={() => setSelected(null)}
        onOpenMap={(item) => {
          setMapItem(item);
          onOpenMap?.(item);
        }}
      />
    );
  return (
    <SafeAreaView>
      <View style={{ padding: 16, gap: 8 }}>
        <Text>RelatedInfo · Tra cứu chỉ đọc</Text>
        <TextInput
          accessibilityLabel="Tìm kiếm"
          value={q}
          onChangeText={setQ}
          placeholder="Tìm kiếm"
        />
        <Pressable
          onPress={() => setFiltersOpen((value) => !value)}
          style={{ minHeight: 44, padding: 8 }}
        >
          <Text>Bộ lọc{filtersOpen ? ' (đóng)' : ''}</Text>
        </Pressable>
        {filtersOpen && (
          <TextInput
            accessibilityLabel="Lọc trạng thái"
            value={status}
            onChangeText={setStatus}
            placeholder="status"
          />
        )}
        <Text>
          ALL {counts.ALL ?? 0} · Resident {counts.RESIDENT ?? 0} · Business{' '}
          {counts.BUSINESS ?? 0} · Hotspot {counts.HOTSPOT ?? 0} · Violation{' '}
          {counts.VIOLATION ?? 0}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {entityTypes.map((type) => (
            <Pressable
              key={type ?? 'ALL'}
              onPress={() => setEntityType(type)}
              style={{ minHeight: 44, padding: 8 }}
            >
              <Text>{type ?? 'ALL'}</Text>
            </Pressable>
          ))}
        </View>
        {state === 'loading' && <StateMessage state="loading" />}
        {state === 'empty' && <StateMessage state="empty" />}
        {state === 'error' && (
          <StateMessage state="error" retry={() => void load(1)} />
        )}
        {state === 'forbidden' && <StateMessage state="forbidden" />}
        {state === 'masked' && <StateMessage state="masked" />}
        {state === 'offline' && (
          <StateMessage state="offline" retry={() => void load(1)} />
        )}
        {(state === 'ready' || state === 'masked') && (
          <View>
            <Text>Danh sách</Text>
            {items.map((item) => (
              <Pressable
                key={`${item.entityType}:${item.id}`}
                onPress={() => setSelected(item)}
                onLongPress={() => setMapItem(item)}
                style={{ minHeight: 44, padding: 8 }}
              >
                <Text>{item.title}</Text>
                <MaskedValue value={item.address} masked={item.masked} />
                <Text>
                  {item.status} · {item.entityType}
                </Text>
              </Pressable>
            ))}
            {hasMore && (
              <Pressable
                onPress={() => void load(page + 1)}
                style={{ minHeight: 44, padding: 8 }}
              >
                <Text>Tải thêm</Text>
              </Pressable>
            )}
          </View>
        )}
        <Modal
          visible={mapItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setMapItem(null)}
        >
          <View
            style={{
              marginTop: 'auto',
              backgroundColor: '#fff',
              padding: 20,
              gap: 12,
            }}
          >
            <Text>Vị trí RelatedInfo</Text>
            <Text>{mapItem?.title}</Text>
            <Text>
              {mapItem?.geometry
                ? 'Polygon/geometry'
                : mapItem?.lat !== undefined
                  ? `${mapItem.lat}, ${mapItem.lng}`
                  : 'Không có vị trí'}
            </Text>
            <Pressable
              onPress={() => {
                if (mapItem) onOpenMap?.(mapItem);
                setMapItem(null);
              }}
              style={{ minHeight: 44 }}
            >
              <Text>Mở bản đồ</Text>
            </Pressable>
            <Pressable
              onPress={() => setMapItem(null)}
              style={{ minHeight: 44 }}
            >
              <Text>Đóng</Text>
            </Pressable>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
