import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getRelatedInfoDetail } from '../../api/relatedInfo';
import { MaskedValue, StateMessage } from '../../components/States';
import type { RelatedInfoItem, RelatedInfoReference } from './types';

type DetailState =
  'loading' | 'error' | 'forbidden' | 'offline' | 'empty' | 'masked';

export function RelatedInfoDetail({
  item,
  onBack,
  onOpenMap,
}: {
  item: RelatedInfoReference;
  onBack: () => void;
  onOpenMap?: (item: RelatedInfoItem) => void;
}) {
  const [detail, setDetail] = useState<RelatedInfoItem | null>(null);
  const [state, setState] = useState<DetailState>('loading');
  const load = useCallback(async () => {
    try {
      setState('loading');
      const response = await getRelatedInfoDetail(item.entityType, item.id);
      setDetail(response.data);
      setState(
        response.data ? (response.data.masked ? 'masked' : 'empty') : 'empty',
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
  }, [item.entityType, item.id]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <SafeAreaView>
      <View style={{ padding: 16, gap: 12 }}>
        <Pressable onPress={onBack} style={{ minHeight: 44 }}>
          <Text>‹ Quay lại</Text>
        </Pressable>
        {state === 'loading' && <StateMessage state="loading" />}
        {state === 'empty' && !detail && <StateMessage state="empty" />}
        {state === 'error' && (
          <StateMessage state="error" retry={() => void load()} />
        )}
        {state === 'forbidden' && <StateMessage state="forbidden" />}
        {state === 'offline' && (
          <StateMessage state="offline" retry={() => void load()} />
        )}
        {state === 'masked' && <StateMessage state="masked" />}
        {detail && (
          <>
            <Text>{detail.title}</Text>
            <Text>{detail.status}</Text>
            <MaskedValue value={detail.address} masked={detail.masked} />
            <Text>{detail.updatedAt}</Text>
            {(detail.geometry || detail.lat !== undefined) && (
              <Pressable
                onPress={() => onOpenMap?.(detail)}
                style={{ minHeight: 44, padding: 8 }}
              >
                <Text>Mở trên bản đồ</Text>
              </Pressable>
            )}
            {detail.geometry && (
              <Text>Polygon/geometry từ response server</Text>
            )}
            {detail.lat !== undefined && (
              <Text>
                Vị trí: {detail.lat}, {detail.lng}
              </Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
