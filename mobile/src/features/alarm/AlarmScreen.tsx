import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getAlarms, type ForceItem } from '../../api/forces';
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
              {isVehicleObservationLink(selected)
                ? 'Mở chi tiết'
                : 'Mở liên kết tài nguyên'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {state === 'masked' && <StateMessage state="masked" />}
          {alarms.map((alarm) => (
            <Pressable
              key={alarm.id}
              accessibilityRole="button"
              onPress={() => setSelected(alarm)}
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
                {alarm.title}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                {alarm.status} ·{' '}
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.mono,
                    fontSize: mobileBaseline.size.label,
                    color: mobileBaseline.color.textMuted,
                  }}
                >
                  {alarm.createdAt}
                </Text>
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
