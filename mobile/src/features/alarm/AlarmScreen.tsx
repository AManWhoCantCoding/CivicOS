import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getAlarms, type ForceItem } from '../../api/forces';
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
} from '../../components/States';
import { deepLinkFor } from '../../navigation/deepLinks';

type SurfaceState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'masked' | 'offline' | 'ready';
export function AlarmScreen({
  onNavigate,
}: {
  onNavigate?: (link: ReturnType<typeof deepLinkFor>) => void;
}) {
  const [alarms, setAlarms] = useState<ForceItem[]>([]);
  const [selected, setSelected] = useState<ForceItem | null>(null);
  const [state, setState] = useState<SurfaceState>('loading');
  const load = useCallback(async () => {
    try {
      setState('loading');
      const response = await getAlarms();
      setAlarms(response.alarms);
      setState(
        response.alarms.length
          ? response.alarms.some((item) => !item.assignmentSummary)
            ? 'masked'
            : 'ready'
          : 'empty',
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
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (state !== 'ready' && state !== 'masked' && !selected)
    return (
      <View style={{ padding: 16 }}>
        {state === 'offline' && <OfflineBanner />}
        <StateMessage state={state} retry={() => void load()} />
      </View>
    );
  return (
    <View style={{ padding: 16 }}>
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
            <Text>Mở liên kết tài nguyên</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {state === 'masked' && <StateMessage state="masked" />}
          {alarms.map((alarm) => (
            <Pressable
              key={alarm.id}
              onPress={() => setSelected(alarm)}
              style={{ minHeight: 44, padding: 8 }}
            >
              <Text>{alarm.title}</Text>
              <Text>
                {alarm.status} · {alarm.createdAt}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
