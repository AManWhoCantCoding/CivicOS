import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getTask, listTasks, type ForceItem } from '../../api/forces';
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
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
export function TaskScreen({
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
      const response = await listTasks();
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
      setSelected(await getTask(item.id));
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
      <View style={{ padding: 16 }}>
        {state === 'offline' && <OfflineBanner />}
        <StateMessage state={state} retry={() => void load()} />
      </View>
    );
  return (
    <View style={{ padding: 16 }}>
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
        <View>
          <Pressable
            onPress={() => setSelected(null)}
            style={{ minHeight: 44 }}
          >
            <Text>‹ Quay lại</Text>
          </Pressable>
          <Text>{selected.title}</Text>
          <Text>
            {selected.status} · {selected.createdAt}
          </Text>
          {selected.assignmentSummary ? (
            <MaskedValue value={selected.assignmentSummary.task} />
          ) : (
            <StateMessage state="masked" />
          )}
          <Pressable
            onPress={() => {
              const link = deepLinkFor(selected);
              if (link) onNavigate?.(link);
            }}
            style={{ minHeight: 44, padding: 8 }}
          >
            <Text>Mở bản đồ/RelatedInfo</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {state === 'masked' && <StateMessage state="masked" />}
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void select(item)}
              style={{ minHeight: 44, padding: 8 }}
            >
              <Text>{item.title}</Text>
              <Text>
                {item.status} · {item.dispatchId ?? 'Không có dispatch'}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
