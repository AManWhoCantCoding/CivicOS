import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ApiError, requestJson } from '../../api/client';
import {
  OfflineBanner,
  StateMessage,
  mobileBaseline,
} from '../../components/States';

type IncidentState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'offline' | 'ready';

type IncidentSummary = {
  id: string;
  status: string;
  description: string;
  category: string | null;
  severity: string | null;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : null;
}

// Locked safe-state allowlist: only the structured summary fields already
// used by the web detail contract are kept. Everything else from the response
// is dropped so the mobile surface never discloses raw payload content.
export function readIncidentSummary(body: unknown): IncidentSummary | null {
  let candidate: unknown = body;
  if (isRecord(candidate) && isRecord(candidate.incident)) {
    candidate = candidate.incident;
    if (isRecord(candidate) && isRecord(candidate.incident)) {
      candidate = candidate.incident;
    }
  }
  if (!isRecord(candidate)) return null;
  if (typeof candidate.id !== 'string' || !candidate.id) return null;
  if (typeof candidate.status !== 'string' || !candidate.status) return null;
  if (typeof candidate.description !== 'string') return null;
  if (typeof candidate.updatedAt !== 'string' || !candidate.updatedAt)
    return null;
  const category = optionalText(candidate.category);
  const severity = optionalText(candidate.severity);
  if (
    candidate.category !== null &&
    candidate.category !== undefined &&
    category === null
  )
    return null;
  if (
    candidate.severity !== null &&
    candidate.severity !== undefined &&
    severity === null
  )
    return null;
  return {
    id: candidate.id,
    status: candidate.status,
    description: candidate.description,
    category,
    severity,
    updatedAt: candidate.updatedAt,
  };
}

export function IncidentScreen({
  incidentId,
  onOpenMap,
}: {
  incidentId?: string;
  onOpenMap: () => void;
}) {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [state, setState] = useState<IncidentState>('loading');
  const load = useCallback(async () => {
    if (!incidentId) {
      setSummary(null);
      setState('empty');
      return;
    }
    try {
      setState('loading');
      const response = await requestJson<unknown>(
        `/api/incidents/${encodeURIComponent(incidentId)}`,
      );
      const nextSummary = readIncidentSummary(response);
      setSummary(nextSummary);
      setState(nextSummary ? 'ready' : 'empty');
    } catch (reason: unknown) {
      setSummary(null);
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
    <View
      style={{
        padding: mobileBaseline.space.s4,
        gap: mobileBaseline.space.s3,
        backgroundColor: mobileBaseline.color.canvas,
      }}
    >
      <Text
        style={{
          fontFamily: mobileBaseline.font.sans,
          fontSize: mobileBaseline.size.title,
          color: mobileBaseline.color.text,
        }}
      >
        Incident · chỉ đọc
      </Text>
      {state === 'loading' && <StateMessage state="loading" />}
      {state === 'empty' && <StateMessage state="empty" />}
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
      {state === 'ready' && summary && (
        <View
          style={{
            gap: mobileBaseline.space.s2,
            backgroundColor: mobileBaseline.color.surface,
            borderColor: mobileBaseline.color.border,
            borderWidth: 1,
            borderRadius: mobileBaseline.radius.md,
            padding: mobileBaseline.space.s3,
          }}
        >
          <Text
            style={{
              fontFamily: mobileBaseline.font.mono,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.text,
            }}
          >
            {summary.id}
          </Text>
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.body,
              lineHeight: mobileBaseline.size.bodyLine,
              color: mobileBaseline.color.text,
            }}
          >
            {summary.description}
          </Text>
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.textMuted,
            }}
          >
            {summary.status} · {summary.category ?? 'Chưa phân loại'} ·{' '}
            {summary.severity ?? 'Chưa đánh giá'}
          </Text>
          <Text
            style={{
              fontFamily: mobileBaseline.font.mono,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.textMuted,
            }}
          >
            Cập nhật: {summary.updatedAt}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở trên bản đồ"
            onPress={onOpenMap}
            style={{
              minHeight: mobileBaseline.controlMin,
              minWidth: mobileBaseline.controlMin,
              padding: mobileBaseline.space.s2,
            }}
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
        </View>
      )}
    </View>
  );
}
