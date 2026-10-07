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
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
  mobileBaseline,
} from '../../components/States';
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
    <SafeAreaView style={{ backgroundColor: mobileBaseline.color.canvas }}>
      <View
        style={{
          padding: mobileBaseline.space.s4,
          gap: mobileBaseline.space.s2,
        }}
      >
        <Text
          style={{
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.title,
            color: mobileBaseline.color.text,
          }}
        >
          RelatedInfo · Tra cứu chỉ đọc
        </Text>
        <TextInput
          accessibilityLabel="Tìm kiếm"
          value={q}
          onChangeText={setQ}
          placeholder="Tìm kiếm"
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setFiltersOpen((value) => !value)}
          style={{ minHeight: 44, minWidth: 44, padding: 8 }}
        >
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.accent,
            }}
          >
            Bộ lọc{filtersOpen ? ' (đóng)' : ''}
          </Text>
        </Pressable>
        {filtersOpen && (
          <TextInput
            accessibilityLabel="Lọc trạng thái"
            value={status}
            onChangeText={setStatus}
            placeholder="status"
          />
        )}
        <Text
          style={{
            fontFamily: mobileBaseline.font.mono,
            fontSize: mobileBaseline.size.caption,
            color: mobileBaseline.color.textMuted,
          }}
        >
          ALL {counts.ALL ?? 0} · Resident {counts.RESIDENT ?? 0} · Business{' '}
          {counts.BUSINESS ?? 0} · Hotspot {counts.HOTSPOT ?? 0} · Violation{' '}
          {counts.VIOLATION ?? 0}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {entityTypes.map((type) => (
            <Pressable
              key={type ?? 'ALL'}
              accessibilityRole="button"
              onPress={() => setEntityType(type)}
              style={{ minHeight: 44, minWidth: 44, padding: 8 }}
            >
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.text,
                }}
              >
                {type ?? 'ALL'}
              </Text>
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
          <>
            <OfflineBanner />
            <StateMessage state="offline" retry={() => void load(1)} />
          </>
        )}
        {(state === 'ready' || state === 'masked') && (
          <View>
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.section,
                color: mobileBaseline.color.text,
              }}
            >
              Danh sách
            </Text>
            {items.map((item) => (
              <Pressable
                key={`${item.entityType}:${item.id}`}
                accessibilityRole="button"
                onPress={() => setSelected(item)}
                onLongPress={() => {
                  if (!item.masked) setMapItem(item);
                }}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  padding: 8,
                  backgroundColor: mobileBaseline.color.surface,
                  borderColor: mobileBaseline.color.border,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.md,
                }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.body,
                    color: mobileBaseline.color.text,
                  }}
                >
                  {item.title}
                </Text>
                <MaskedValue value={item.address} masked={item.masked} />
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    color: mobileBaseline.color.textMuted,
                  }}
                >
                  {item.status} · {item.entityType}
                </Text>
              </Pressable>
            ))}
            {hasMore && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void load(page + 1)}
                style={{ minHeight: 44, minWidth: 44, padding: 8 }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    color: mobileBaseline.color.accent,
                  }}
                >
                  Tải thêm
                </Text>
              </Pressable>
            )}
          </View>
        )}
        <Modal
          visible={mapItem !== null && !mapItem.masked}
          transparent
          animationType="slide"
          onRequestClose={() => setMapItem(null)}
        >
          {mapItem && !mapItem.masked && (
            <View
              style={{
                marginTop: 'auto',
                backgroundColor: mobileBaseline.color.surface,
                borderColor: mobileBaseline.color.border,
                borderWidth: 1,
                borderRadius: mobileBaseline.radius.lg,
                padding: 20,
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.section,
                  color: mobileBaseline.color.text,
                }}
              >
                Vị trí RelatedInfo
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  color: mobileBaseline.color.text,
                }}
              >
                {mapItem?.title}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.mono,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                {mapItem?.geometry
                  ? 'Polygon/geometry'
                  : mapItem?.lat !== undefined
                    ? `${mapItem.lat}, ${mapItem.lng}`
                    : 'Không có vị trí'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (mapItem && !mapItem.masked) onOpenMap?.(mapItem);
                  setMapItem(null);
                }}
                style={{ minHeight: 44, minWidth: 44 }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    color: mobileBaseline.color.accent,
                  }}
                >
                  Mở bản đồ
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={() => setMapItem(null)}
                style={{ minHeight: 44, minWidth: 44 }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    color: mobileBaseline.color.text,
                  }}
                >
                  Đóng
                </Text>
              </Pressable>
            </View>
          )}
        </Modal>
      </View>
    </SafeAreaView>
  );
}
