import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  getVehicleObservation,
  type ForceLink,
  type VehicleObservationMobile,
} from '../../api/forces';
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
  mobileBaseline,
} from '../../components/States';
import type { NavigationContext } from '../../navigation/deepLinks';

export type VehicleDetailState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'masked' | 'offline' | 'ready';

export function vehicleDetailStateFor(reason: unknown): VehicleDetailState {
  if (reason instanceof ApiError && reason.status === 403) return 'forbidden';
  if (reason instanceof ApiError && reason.status === 404) return 'empty';
  if (reason instanceof ApiError && reason.code === 'OFFLINE') return 'offline';
  return 'error';
}

export function isVehicleMasked(
  detail: VehicleObservationMobile | null,
): boolean {
  return !detail || detail.plate.trim().length === 0;
}

export function vehicleCoordinates(
  detail: VehicleObservationMobile | null,
): { lat: number; lng: number } | undefined {
  if (!detail) return undefined;
  if (!detail.latitude.trim() || !detail.longitude.trim()) return undefined;
  const lat = Number(detail.latitude);
  const lng = Number(detail.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: mobileBaseline.space.s1 }}>
      <Text
        style={{
          fontFamily: mobileBaseline.font.sans,
          fontSize: mobileBaseline.size.label,
          color: mobileBaseline.color.textMuted,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: mobileBaseline.font.sans,
          fontSize: mobileBaseline.size.body,
          lineHeight: mobileBaseline.size.bodyLine,
          color: mobileBaseline.color.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function VehicleObservationDetail({
  observationId,
  assignmentSummary,
  onBack,
  onOpenMap,
}: {
  observationId: string;
  assignmentSummary?: ForceLink['assignmentSummary'];
  onBack: () => void;
  onOpenMap: (context: NavigationContext) => void;
}) {
  const [detail, setDetail] = useState<VehicleObservationMobile | null>(null);
  const [state, setState] = useState<VehicleDetailState>('loading');
  const load = useCallback(async () => {
    if (!observationId) {
      setDetail(null);
      setState('empty');
      return;
    }
    try {
      setState('loading');
      const response = await getVehicleObservation(observationId);
      setDetail(response);
      setState(isVehicleMasked(response) ? 'masked' : 'ready');
    } catch (reason: unknown) {
      setDetail(null);
      setState(vehicleDetailStateFor(reason));
    }
  }, [observationId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const coordinates = vehicleCoordinates(detail);
  return (
    <View
      style={{
        padding: 16,
        gap: 8,
        backgroundColor: mobileBaseline.color.canvas,
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
      {state === 'ready' && detail ? (
        <View style={{ gap: 8 }}>
          <Field label="Biển số" value={detail.plate} />
          <Field label="Trạng thái" value={detail.status} />
          <Field label="Thời điểm quan sát" value={detail.observedAt} />
          <Field label="Vĩ độ" value={detail.latitude} />
          <Field label="Kinh độ" value={detail.longitude} />
          {assignmentSummary ? (
            <MaskedValue value={assignmentSummary.task} />
          ) : null}
          {coordinates ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở bản đồ"
              onPress={() =>
                onOpenMap({
                  resourceType: 'VehicleObservation',
                  resourceId: detail.id,
                  coordinates,
                  assignmentSummary,
                })
              }
              style={{ minHeight: 44, minWidth: 44, padding: 8 }}
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
          ) : null}
        </View>
      ) : (
        <>
          {state === 'offline' && <OfflineBanner />}
          <StateMessage
            state={state}
            retry={
              state === 'error' || state === 'offline'
                ? () => void load()
                : undefined
            }
          />
        </>
      )}
    </View>
  );
}
