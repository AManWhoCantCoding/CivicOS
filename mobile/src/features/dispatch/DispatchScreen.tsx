import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getDispatch, listDispatches, type ForceItem } from '../../api/forces';
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
  mobileBaseline,
} from '../../components/States';
import {
  deepLinkFor,
  isVehicleObservationLink,
} from '../../navigation/deepLinks';

type SurfaceState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'masked' | 'offline' | 'ready';
function stateFor(reason: unknown): SurfaceState {
  return reason instanceof ApiError && reason.status === 403
    ? 'forbidden'
    : reason instanceof ApiError && reason.code === 'OFFLINE'
      ? 'offline'
      : 'error';
}

// Presentation-only styles from the shared Light/Blue mobile baseline.
const backAction = {
  minHeight: 44,
  minWidth: 44,
  padding: mobileBaseline.space.s2,
  alignSelf: 'flex-start',
  justifyContent: 'center',
} as const;
const primaryAction = {
  minHeight: 44,
  minWidth: 44,
  padding: mobileBaseline.space.s2,
  borderColor: mobileBaseline.color.accent,
  borderWidth: 1,
  borderRadius: mobileBaseline.radius.sm,
  backgroundColor: mobileBaseline.color.accent,
  justifyContent: 'center',
} as const;
const actionLabel = {
  fontFamily: mobileBaseline.font.sans,
  fontSize: mobileBaseline.size.label,
  fontWeight: '600',
  color: mobileBaseline.color.surface,
} as const;
const backLabel = {
  fontFamily: mobileBaseline.font.sans,
  fontSize: mobileBaseline.size.label,
  color: mobileBaseline.color.accent,
} as const;
const listCard = {
  minHeight: 44,
  minWidth: 44,
  padding: mobileBaseline.space.s3,
  backgroundColor: mobileBaseline.color.surface,
  borderColor: mobileBaseline.color.border,
  borderWidth: 1,
  borderRadius: mobileBaseline.radius.md,
} as const;
const detailCard = {
  backgroundColor: mobileBaseline.color.surface,
  borderColor: mobileBaseline.color.border,
  borderWidth: 1,
  borderRadius: mobileBaseline.radius.md,
  padding: mobileBaseline.space.s3,
  gap: mobileBaseline.space.s2,
} as const;
const sectionLabel = {
  fontFamily: mobileBaseline.font.sans,
  fontSize: mobileBaseline.size.label,
  fontWeight: '600',
  color: mobileBaseline.color.textMuted,
} as const;
const itemTitle = {
  fontFamily: mobileBaseline.font.sans,
  fontSize: mobileBaseline.size.body,
  lineHeight: mobileBaseline.size.bodyLine,
  fontWeight: '600',
  color: mobileBaseline.color.text,
} as const;
const itemMeta = {
  fontFamily: mobileBaseline.font.sans,
  fontSize: mobileBaseline.size.label,
  color: mobileBaseline.color.textMuted,
} as const;
const itemMetaMono = {
  fontFamily: mobileBaseline.font.mono,
  fontSize: mobileBaseline.size.label,
  color: mobileBaseline.color.textMuted,
} as const;

export function DispatchScreen({
  onNavigate,
}: {
  onNavigate?: (link: ReturnType<typeof deepLinkFor>) => void;
}) {
  const [items, setItems] = useState<ForceItem[]>([]);
  const [selected, setSelected] = useState<ForceItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<ForceItem | null>(null);
  const [detailState, setDetailState] = useState<SurfaceState | null>(null);
  const [state, setState] = useState<SurfaceState>('loading');
  const load = useCallback(async () => {
    try {
      setState('loading');
      const response = await listDispatches();
      setItems(response.data);
      setState(
        response.data.length
          ? response.data.some((item) => !item.assignmentSummary)
            ? 'masked'
            : 'ready'
          : 'empty',
      );
    } catch (reason: unknown) {
      setState(stateFor(reason));
    }
  }, []);
  const select = async (item: ForceItem) => {
    setDetailTarget(item);
    setDetailState('loading');
    setSelected(null);
    try {
      setSelected(await getDispatch(item.id));
      setDetailState(null);
    } catch (reason: unknown) {
      setDetailState(stateFor(reason));
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (state !== 'ready' && state !== 'masked' && !detailState)
    return (
      <View
        style={{
          padding: mobileBaseline.space.s4,
          gap: mobileBaseline.space.s2,
          backgroundColor: mobileBaseline.color.canvas,
        }}
      >
        {state === 'offline' && <OfflineBanner />}
        <StateMessage state={state} retry={() => void load()} />
      </View>
    );
  return (
    <View
      style={{
        padding: mobileBaseline.space.s4,
        gap: mobileBaseline.space.s3,
        backgroundColor: mobileBaseline.color.canvas,
      }}
    >
      {detailState === 'loading' && <StateMessage state="loading" />}
      {detailState === 'error' && (
        <StateMessage
          state="error"
          retry={() => detailTarget && void select(detailTarget)}
        />
      )}
      {detailState === 'forbidden' && <StateMessage state="forbidden" />}
      {detailState === 'offline' && (
        <>
          <OfflineBanner />
          <StateMessage
            state="offline"
            retry={() => detailTarget && void select(detailTarget)}
          />
        </>
      )}
      {detailState === 'masked' && <StateMessage state="masked" />}
      {selected ? (
        <View style={{ gap: mobileBaseline.space.s2 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => setSelected(null)}
            style={backAction}
          >
            <Text style={backLabel}>‹ Quay lại</Text>
          </Pressable>
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.title,
              fontWeight: '600',
              color: mobileBaseline.color.text,
            }}
          >
            {selected.title}
          </Text>
          <Text style={itemMeta}>
            {selected.status} ·{' '}
            <Text style={itemMetaMono}>{selected.createdAt}</Text>
          </Text>
          <View style={detailCard}>
            {selected.assignmentSummary ? (
              <MaskedValue value={selected.assignmentSummary.task} />
            ) : (
              <StateMessage state="masked" />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const link = deepLinkFor(selected);
                if (link) onNavigate?.(link);
              }}
              style={primaryAction}
            >
              <Text style={actionLabel}>
                {isVehicleObservationLink(selected)
                  ? 'Mở chi tiết'
                  : 'Mở bản đồ/RelatedInfo'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {state === 'masked' && <StateMessage state="masked" />}
          {items.length > 0 && <Text style={sectionLabel}>Danh sách</Text>}
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => void select(item)}
              style={listCard}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: mobileBaseline.space.s2,
                }}
              >
                <View style={{ flex: 1, gap: mobileBaseline.space.s1 }}>
                  <Text style={itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={itemMeta}>
                    {item.status} ·{' '}
                    {item.assignmentSummary?.task ?? 'Không có chi tiết nhạy cảm'}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.section,
                    color: mobileBaseline.color.textMuted,
                  }}
                  accessibilityElementsHidden={true}
                >
                  ›
                </Text>
              </View>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
