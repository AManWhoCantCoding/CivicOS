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
import { deepLinkFor } from '../../navigation/deepLinks';

type SurfaceState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'masked' | 'offline' | 'ready';
function stateFor(reason: unknown): SurfaceState {
  return reason instanceof ApiError && reason.status === 403
    ? 'forbidden'
    : reason instanceof ApiError && reason.code === 'OFFLINE'
      ? 'offline'
      : 'error';
}
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
          padding: 16,
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
        padding: 16,
        gap: 8,
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
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => setSelected(null)}
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
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.title,
              color: mobileBaseline.color.text,
            }}
          >
            {selected.title}
          </Text>
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.textMuted,
            }}
          >
            {selected.status} ·{' '}
            <Text
              style={{
                fontFamily: mobileBaseline.font.mono,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.textMuted,
              }}
            >
              {selected.createdAt}
            </Text>
          </Text>
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
            style={{ minHeight: 44, minWidth: 44, padding: 8 }}
          >
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.accent,
              }}
            >
              Mở bản đồ/RelatedInfo
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {state === 'masked' && <StateMessage state="masked" />}
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => void select(item)}
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
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                {item.status} ·{' '}
                {item.assignmentSummary?.task ?? 'Không có chi tiết nhạy cảm'}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
