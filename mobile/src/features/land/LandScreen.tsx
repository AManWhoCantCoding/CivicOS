import React, { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../api/client';
import {
  getLandApplicationSummary,
  getLandApplicationTimeline,
  getLandParcelSummary,
  getPublicLandLookup,
  type LandApplicationSummary,
  type LandLookupMode,
  type LandParcelSummary,
  type LandTimelineEvent,
  type PublicLandLookup,
} from '../../api/land';
import type { SessionState } from '../../api/session';
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
  type DataState,
} from '../../components/States';

type ResourceState = 'idle' | 'loading' | 'ready' | DataState;
export const MAX_LAND_RETRY_ATTEMPTS = 3;

export type LandScreenSnapshot = {
  lookup: {
    applicationCode: string;
    parcelCode: string;
    mapSheetNumber: string;
    parcelNumber: string;
    status: string;
    submittedAt: string;
    updatedAt: string;
    completedAt: string | null;
    simulatedLabel: string;
  } | null;
  application: {
    applicationCode: string;
    changeType: string;
    status: string;
    submittedAt: string;
    updatedAt: string;
    completedAt: string | null;
    maskedSubject: { value?: string; masked: boolean };
  } | null;
  parcel: {
    parcelCode: string;
    mapSheetNumber: string;
    parcelNumber: string;
    areaSqm: string;
    status: string;
    updatedAt: string;
    maskedSubject: { value?: string; masked: boolean };
  } | null;
  timeline: Array<{
    eventType: string;
    actor: { value?: string; masked: boolean };
    occurredAt: string;
  }>;
};

export function buildLandScreenSnapshot(input: {
  lookup: PublicLandLookup | null;
  application: LandApplicationSummary | null;
  parcel: LandParcelSummary | null;
  timeline: LandTimelineEvent[];
}): LandScreenSnapshot {
  return {
    lookup: input.lookup
      ? {
          applicationCode: input.lookup.applicationCode,
          parcelCode: input.lookup.parcelCode,
          mapSheetNumber: input.lookup.mapSheetNumber,
          parcelNumber: input.lookup.parcelNumber,
          status: input.lookup.status,
          submittedAt: input.lookup.submittedAt,
          updatedAt: input.lookup.updatedAt,
          completedAt: input.lookup.completedAt,
          simulatedLabel: input.lookup.simulated ? 'Mô phỏng · simulated' : '',
        }
      : null,
    application: input.application
      ? {
          applicationCode: input.application.applicationCode,
          changeType: input.application.changeType,
          status: input.application.status,
          submittedAt: input.application.submittedAt,
          updatedAt: input.application.updatedAt,
          completedAt: input.application.completedAt,
          maskedSubject: { masked: true },
        }
      : null,
    parcel: input.parcel
      ? {
          parcelCode: input.parcel.parcelCode,
          mapSheetNumber: input.parcel.mapSheetNumber,
          parcelNumber: input.parcel.parcelNumber,
          areaSqm: input.parcel.areaSqm,
          status: input.parcel.status,
          updatedAt: input.parcel.updatedAt,
          maskedSubject: { masked: true },
        }
      : null,
    timeline: input.timeline.map((event) => ({
      eventType: event.eventType,
      actor: {
        value: event.actor?.role ?? undefined,
        masked: !event.actor?.role,
      },
      occurredAt: event.occurredAt,
    })),
  };
}

export function canReadInternalLand(session?: SessionState): boolean {
  if (session?.status !== 'authenticated' || !session.user) return false;
  if (!session.user.id.trim()) return false;
  if (!session.user.organizationUnitId?.trim()) return false;
  return session.user.roles.some(
    (role) => role === 'land_officer' || role === 'commune_leader',
  );
}

export function landStateForError(error: unknown): DataState {
  if (
    error instanceof ApiError &&
    (error.status === 0 || error.code === 'OFFLINE')
  )
    return 'offline';
  if (error instanceof ApiError && error.status === 403) return 'forbidden';
  if (error instanceof ApiError && error.status === 404) return 'empty';
  return 'error';
}

export function landErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.status === 0 || error.code === 'OFFLINE')
  )
    return 'Đang ngoại tuyến. Mã tra cứu được giữ lại để thử lại sau.';
  if (error instanceof ApiError && error.status === 403)
    return 'Bạn không có quyền xem dữ liệu trong phạm vi này.';
  if (error instanceof ApiError && error.status === 404)
    return 'Không tìm thấy kết quả tra cứu.';
  if (error instanceof ApiError && error.status === 429)
    return 'Bạn đã vượt quá số lần tra cứu cho phép; hãy thử lại sau.';
  if (error instanceof ApiError && error.status === 400)
    return 'Mã tra cứu chưa hợp lệ. Nhập đúng một mã hồ sơ hoặc mã thửa.';
  return 'Không thể tải dữ liệu đất đai. Vui lòng thử lại.';
}

function initialOnlineState(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function LandScreen({ session }: { session?: SessionState }) {
  const [mode, setMode] = useState<LandLookupMode>('applicationCode');
  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState<PublicLandLookup | null>(null);
  const [application, setApplication] = useState<LandApplicationSummary | null>(
    null,
  );
  const [parcel, setParcel] = useState<LandParcelSummary | null>(null);
  const [timeline, setTimeline] = useState<LandTimelineEvent[]>([]);
  const [publicState, setPublicState] = useState<ResourceState>('idle');
  const [applicationState, setApplicationState] =
    useState<ResourceState>('idle');
  const [parcelState, setParcelState] = useState<ResourceState>('idle');
  const [timelineState, setTimelineState] = useState<ResourceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [online, setOnline] = useState(initialOnlineState);

  const load = useCallback(
    async (attempt: number) => {
      const code = query.trim();
      const retrying = attempt > 1;
      setRetryAttempts(attempt);
      setErrorMessage(null);
      if (!retrying) {
        setLookup(null);
        setApplication(null);
        setParcel(null);
        setTimeline([]);
        setApplicationState('idle');
        setParcelState('idle');
        setTimelineState('idle');
      }
      if (!code) {
        setPublicState('empty');
        setErrorMessage('Nhập đúng một mã hồ sơ hoặc mã thửa để tra cứu.');
        return;
      }
      setPublicState('loading');
      try {
        const nextLookup = await getPublicLandLookup(mode, code);
        setLookup(nextLookup);
        setPublicState('ready');
        setOnline(true);
        if (!canReadInternalLand(session)) {
          setApplicationState('forbidden');
          setParcelState('forbidden');
          setTimelineState('forbidden');
          return;
        }

        setApplicationState('loading');
        setParcelState('loading');
        const [applicationResult, parcelResult] = await Promise.allSettled([
          getLandApplicationSummary(nextLookup.applicationCode),
          getLandParcelSummary(nextLookup.parcelCode),
        ]);
        let firstError: unknown = null;
        if (applicationResult.status === 'fulfilled') {
          const nextApplication = applicationResult.value;
          setApplication(nextApplication);
          setApplicationState(nextApplication ? 'ready' : 'empty');
          if (!nextApplication) {
            setTimelineState('empty');
          } else {
            setTimelineState('loading');
            try {
              const nextTimeline = await getLandApplicationTimeline(
                nextApplication.id,
              );
              setTimeline(nextTimeline);
              setTimelineState(nextTimeline.length ? 'ready' : 'empty');
            } catch (error: unknown) {
              firstError ??= error;
              setTimelineState(landStateForError(error));
            }
          }
        } else {
          firstError = applicationResult.reason;
          setApplicationState(landStateForError(applicationResult.reason));
          setTimelineState('empty');
        }
        if (parcelResult.status === 'fulfilled') {
          const nextParcel = parcelResult.value;
          setParcel(nextParcel);
          setParcelState(nextParcel ? 'ready' : 'empty');
        } else {
          firstError ??= parcelResult.reason;
          setParcelState(landStateForError(parcelResult.reason));
        }
        if (firstError) setErrorMessage(landErrorMessage(firstError));
      } catch (error: unknown) {
        const nextState = landStateForError(error);
        setPublicState(nextState);
        if (nextState === 'offline') setOnline(false);
        setErrorMessage(landErrorMessage(error));
        if (!retrying) {
          setApplicationState('idle');
          setParcelState('idle');
          setTimelineState('idle');
        }
      }
    },
    [mode, query, session],
  );

  const retry =
    retryAttempts < MAX_LAND_RETRY_ATTEMPTS
      ? () => void load(retryAttempts + 1)
      : undefined;
  const snapshot = buildLandScreenSnapshot({
    lookup,
    application,
    parcel,
    timeline,
  });
  const hasLookupResult = publicState === 'ready' || publicState === 'offline';
  const showOffline =
    !online ||
    publicState === 'offline' ||
    applicationState === 'offline' ||
    parcelState === 'offline' ||
    timelineState === 'offline';

  return (
    <SafeAreaView>
      <View style={{ padding: 16, gap: 12 }}>
        <Text>Đất đai · chỉ đọc</Text>
        <View>
          <Text>Tra cứu theo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode('applicationCode')}
              style={{ minHeight: 44, padding: 8 }}
            >
              <Text>Mã hồ sơ</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode('parcelCode')}
              style={{ minHeight: 44, padding: 8 }}
            >
              <Text>Mã thửa</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel={
              mode === 'applicationCode' ? 'Mã hồ sơ' : 'Mã thửa'
            }
            value={query}
            onChangeText={setQuery}
            placeholder={
              mode === 'applicationCode'
                ? 'Ví dụ: APP-001'
                : 'Ví dụ: PARCEL-001'
            }
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void load(1)}
            disabled={publicState === 'loading'}
            style={{ minHeight: 44, padding: 8 }}
          >
            <Text>Tra cứu</Text>
          </Pressable>
        </View>

        {showOffline && <OfflineBanner />}
        {publicState === 'loading' && (
          <View testID="land-loading-skeleton">
            <View
              accessibilityElementsHidden
              style={{
                height: 56,
                borderRadius: 8,
                backgroundColor: '#e5e7eb',
              }}
            />
            <StateMessage state="loading" />
          </View>
        )}
        {publicState === 'empty' && <StateMessage state="empty" />}
        {publicState === 'forbidden' && <StateMessage state="forbidden" />}
        {publicState === 'offline' && (
          <StateMessage state="offline" retry={retry} />
        )}
        {publicState === 'error' && (
          <StateMessage state="error" retry={retry} />
        )}
        {errorMessage && publicState !== 'ready' && <Text>{errorMessage}</Text>}

        {snapshot.lookup && hasLookupResult && (
          <View testID="land-lookup-result">
            <Text>{snapshot.lookup.simulatedLabel}</Text>
            <Text>Mã hồ sơ: {snapshot.lookup.applicationCode}</Text>
            <Text>Mã thửa: {snapshot.lookup.parcelCode}</Text>
            <Text>Số tờ bản đồ: {snapshot.lookup.mapSheetNumber}</Text>
            <Text>Số thửa: {snapshot.lookup.parcelNumber}</Text>
            <Text>Trạng thái: {snapshot.lookup.status}</Text>
            <Text>Nộp lúc: {snapshot.lookup.submittedAt}</Text>
            <Text>Cập nhật: {snapshot.lookup.updatedAt}</Text>
            <Text>Hoàn tất lúc: {snapshot.lookup.completedAt ?? '—'}</Text>
          </View>
        )}

        {snapshot.lookup && hasLookupResult && (
          <View testID="land-scoped-read">
            <Text>Thông tin trong phạm vi được phép</Text>
            {applicationState === 'loading' && <StateMessage state="loading" />}
            {applicationState === 'empty' && <StateMessage state="empty" />}
            {applicationState === 'forbidden' && (
              <StateMessage state="forbidden" />
            )}
            {applicationState === 'offline' && (
              <StateMessage state="offline" retry={retry} />
            )}
            {applicationState === 'error' && (
              <StateMessage state="error" retry={retry} />
            )}
            {snapshot.application && applicationState === 'ready' && (
              <View testID="land-application-summary">
                <Text>Hồ sơ: {snapshot.application.applicationCode}</Text>
                <Text>Loại biến động: {snapshot.application.changeType}</Text>
                <Text>Trạng thái: {snapshot.application.status}</Text>
                <Text>Nộp lúc: {snapshot.application.submittedAt}</Text>
                <Text>Cập nhật: {snapshot.application.updatedAt}</Text>
                <Text>
                  Hoàn tất lúc: {snapshot.application.completedAt ?? '—'}
                </Text>
                <Text>Thông tin chủ thể:</Text>
                <MaskedValue {...snapshot.application.maskedSubject} />
              </View>
            )}

            {parcelState === 'loading' && <StateMessage state="loading" />}
            {parcelState === 'empty' && <StateMessage state="empty" />}
            {parcelState === 'forbidden' && <StateMessage state="forbidden" />}
            {parcelState === 'offline' && (
              <StateMessage state="offline" retry={retry} />
            )}
            {parcelState === 'error' && (
              <StateMessage state="error" retry={retry} />
            )}
            {snapshot.parcel && parcelState === 'ready' && (
              <View testID="land-parcel-summary">
                <Text>Thửa: {snapshot.parcel.parcelCode}</Text>
                <Text>Số tờ bản đồ: {snapshot.parcel.mapSheetNumber}</Text>
                <Text>Số thửa: {snapshot.parcel.parcelNumber}</Text>
                <Text>Diện tích: {snapshot.parcel.areaSqm}</Text>
                <Text>Trạng thái: {snapshot.parcel.status}</Text>
                <Text>Cập nhật: {snapshot.parcel.updatedAt}</Text>
                <Text>Thông tin chủ thể:</Text>
                <MaskedValue {...snapshot.parcel.maskedSubject} />
              </View>
            )}

            {timelineState === 'loading' && <StateMessage state="loading" />}
            {timelineState === 'empty' && <StateMessage state="empty" />}
            {timelineState === 'forbidden' && (
              <StateMessage state="forbidden" />
            )}
            {timelineState === 'offline' && (
              <StateMessage state="offline" retry={retry} />
            )}
            {timelineState === 'error' && (
              <StateMessage state="error" retry={retry} />
            )}
            {snapshot.timeline.length > 0 && timelineState === 'ready' && (
              <View testID="land-timeline">
                <Text>Lịch sử xử lý</Text>
                {snapshot.timeline.map((event, index) => (
                  <View key={`${event.eventType}:${event.occurredAt}:${index}`}>
                    <Text>{event.eventType}</Text>
                    <Text>Người thực hiện:</Text>
                    <MaskedValue {...event.actor} />
                    <Text>{event.occurredAt}</Text>
                  </View>
                ))}
              </View>
            )}

            {Boolean(
              snapshot.application ||
              snapshot.parcel ||
              snapshot.timeline.length,
            ) && <StateMessage state="masked" />}
            {errorMessage && <Text>{errorMessage}</Text>}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
