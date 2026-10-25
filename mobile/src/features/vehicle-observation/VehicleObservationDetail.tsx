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

// Presentation-only styles from the shared Light/Blue mobile baseline.
const detailCard = {
  backgroundColor: mobileBaseline.color.surface,
  borderColor: mobileBaseline.color.border,
  borderWidth: 1,
  borderRadius: mobileBaseline.radius.md,
  padding: mobileBaseline.space.s3,
  gap: mobileBaseline.space.s3,
} as const;
const fieldLabel = {
  fontFamily: mobileBaseline.font.sans,
  fontSize: mobileBaseline.size.caption,
  fontWeight: '600',
  color: mobileBaseline.color.textMuted,
} as const;
const fieldValue = {
  fontFamily: mobileBaseline.font.sans,
  fontSize: mobileBaseline.size.body,
  lineHeight: mobileBaseline.size.bodyLine,
  color: mobileBaseline.color.text,
} as const;
const backAction = {
  minHeight: 44,
  minWidth: 44,
  padding: mobileBaseline.space.s2,
  alignSelf: 'flex-start',
  justifyContent: 'center',
} as const;

function Field({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={{ gap: mobileBaseline.space.s1 }}>
      <Text style={fieldLabel}>{label}</Text>
      <Text
        style={
          emphasize
            ? {
                ...fieldValue,
                fontSize: mobileBaseline.size.section,
                fontWeight: '600',
                lineHeight: mobileBaseline.size.bodyLine,
              }
            : fieldValue
        }
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
        padding: mobileBaseline.space.s4,
        gap: mobileBaseline.space.s3,
        backgroundColor: mobileBaseline.color.canvas,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack}
        style={backAction}
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
        <View style={detailCard}>
          <Field label="Biển số" value={detail.plate} emphasize={true} />
          <Field label="Trạng thái" value={detail.status} />
          <Field label="Thời điểm quan sát" value={detail.observedAt} />
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: mobileBaseline.space.s3,
            }}
          >
            <View style={{ flexBasis: '40%', minWidth: 44, flexGrow: 1 }}>
              <Field label="Vĩ độ" value={detail.latitude} />
            </View>
            <View style={{ flexBasis: '40%', minWidth: 44, flexGrow: 1 }}>
              <Field label="Kinh độ" value={detail.longitude} />
            </View>
          </View>
          {assignmentSummary ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: mobileBaseline.color.border,
                paddingTop: mobileBaseline.space.s2,
              }}
            >
              <MaskedValue value={assignmentSummary.task} />
            </View>
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
              style={{
                minHeight: 44,
                minWidth: 44,
                padding: mobileBaseline.space.s2,
                justifyContent: 'center',
                borderColor: mobileBaseline.color.accent,
                borderWidth: 1,
                borderRadius: mobileBaseline.radius.sm,
                backgroundColor: mobileBaseline.color.accent,
              }}
            >
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  fontWeight: '600',
                  textAlign: 'center',
                  color: mobileBaseline.color.surface,
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
