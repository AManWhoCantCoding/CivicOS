import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError, requestJson } from '../../api/client';
import { StateMessage } from '../../components/States';

type IncidentState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'offline' | 'ready';

export function IncidentScreen({
  incidentId,
  onOpenMap,
}: {
  incidentId?: string;
  onOpenMap: () => void;
}) {
  const [body, setBody] = useState<unknown>(null);
  const [state, setState] = useState<IncidentState>('loading');
  const load = useCallback(async () => {
    if (!incidentId) {
      setState('empty');
      return;
    }
    try {
      setState('loading');
      const response = await requestJson<unknown>(
        `/api/incidents/${encodeURIComponent(incidentId)}`,
      );
      setBody(response);
      setState(response ? 'ready' : 'empty');
    } catch (reason: unknown) {
      setState(
        reason instanceof ApiError && reason.status === 403
          ? 'forbidden'
          : reason instanceof ApiError && reason.code === 'OFFLINE'
            ? 'offline'
            : 'error',
      );
    }
  }, [incidentId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Incident · chỉ đọc</Text>
      {state === 'loading' && <StateMessage state="loading" />}
      {state === 'empty' && <StateMessage state="empty" />}
      {state === 'error' && (
        <StateMessage state="error" retry={() => void load()} />
      )}
      {state === 'forbidden' && <StateMessage state="forbidden" />}
      {state === 'offline' && (
        <StateMessage state="offline" retry={() => void load()} />
      )}
      {state === 'ready' && (
        <>
          <Text>{incidentId}</Text>
          <Text selectable>{JSON.stringify(body)}</Text>
          <Pressable onPress={onOpenMap} style={{ minHeight: 44, padding: 8 }}>
            <Text>Mở trên bản đồ</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
