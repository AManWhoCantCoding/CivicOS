import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getRelatedInfoDetail } from '../../api/relatedInfo';
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
  mobileBaseline,
} from '../../components/States';
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
    <SafeAreaView style={{ backgroundColor: mobileBaseline.color.canvas }}>
      <View
        style={{
          padding: mobileBaseline.space.s4,
          gap: mobileBaseline.space.s3,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={onBack}
          style={{ minHeight: 44, minWidth: 44, padding: 8 }}
        >
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.accent,
            }}
          >
            ‹ Quay lại
          </Text>
        </Pressable>
        {state === 'loading' && <StateMessage state="loading" />}
        {state === 'empty' && !detail && <StateMessage state="empty" />}
        {state === 'error' && (
          <StateMessage state="error" retry={() => void load()} />
        )}
        {state === 'forbidden' && <StateMessage state="forbidden" />}
        {state === 'offline' && (
          <>
            <OfflineBanner />
            <StateMessage state="offline" retry={() => void load()} />
          </>
        )}
        {state === 'masked' && <StateMessage state="masked" />}
        {detail && (
          <>
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.title,
                color: mobileBaseline.color.text,
              }}
            >
              {detail.title}
            </Text>
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.textMuted,
              }}
            >
              {detail.status}
            </Text>
            <MaskedValue value={detail.address} masked={detail.masked} />
            <Text
              style={{
                fontFamily: mobileBaseline.font.mono,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.textMuted,
              }}
            >
              {detail.updatedAt}
            </Text>
            {!detail.masked &&
              (detail.geometry || detail.lat !== undefined) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mở trên bản đồ"
                  onPress={() => onOpenMap?.(detail)}
                  style={{ minHeight: 44, minWidth: 44, padding: 8 }}
                >
                  <Text
                    style={{
                      fontFamily: mobileBaseline.font.sans,
                      fontSize: mobileBaseline.size.label,
                      color: mobileBaseline.color.accent,
                    }}
                  >
                    Mở trên bản đồ
                  </Text>
                </Pressable>
              )}
            {!detail.masked && detail.geometry && (
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.caption,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                Polygon/geometry từ response server
              </Text>
            )}
            {!detail.masked && detail.lat !== undefined && (
              <Text
                style={{
                  fontFamily: mobileBaseline.font.mono,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                Vị trí: {detail.lat}, {detail.lng}
              </Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
